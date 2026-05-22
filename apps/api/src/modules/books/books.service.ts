import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService } from '../ai/ai.service';
import EPub from 'epub';
import { convert } from 'html-to-text';
import * as fs from 'fs';
import { BookEntity } from './entities/book.entity';
import { ChapterEntity } from './entities/chapter.entity';

// Helper helper to wrap EPub event emitter in a Promise
function parseEpub(filePath: string): Promise<EPub> {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);
    epub.on('end', () => resolve(epub));
    epub.on('error', (err) =>
      reject(err instanceof Error ? err : new Error(String(err))),
    );
    epub.parse();
  });
}

// Helper to wrap getChapter in a Promise
function getChapterText(epub: EPub, id: string): Promise<string> {
  return new Promise((resolve, reject) => {
    epub.getChapter(id, (err, text) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      } else {
        resolve(text);
      }
    });
  });
}

// Exponential backoff retry utility
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 5000,
  factor = 2,
  logger?: Logger,
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (retries <= 0) {
      throw err;
    }
    if (logger) {
      logger.warn(
        `Gemini API request failed: ${err.message}. Retrying in ${delayMs}ms... (${retries} attempts left)`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithBackoff(fn, retries - 1, delayMs * factor, factor, logger);
  }
}

@Injectable()
export class BooksService implements OnModuleInit {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    @InjectRepository(BookEntity)
    private readonly bookRepository: Repository<BookEntity>,
    @InjectRepository(ChapterEntity)
    private readonly chapterRepository: Repository<ChapterEntity>,
    private readonly aiService: AIService,
  ) { }

  onModuleInit() {
    // Ensure uploads directory exists
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      this.logger.log('Created uploads directory.');
    }
  }

  /**
   * Parse the uploaded file metadata, create a processing database record,
   * and trigger background processing.
   */
  async startBookProcessing(filePath: string): Promise<BookEntity> {
    let epub: EPub;
    try {
      epub = await parseEpub(filePath);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Error parsing EPUB file metadata: ${error.message}`);
      // Clean up the temporary file
      this.safeUnlink(filePath);
      throw new BadRequestException(
        `Không thể phân tích định dạng file EPUB này: ${error.message}`,
      );
    }

    const title = epub.metadata.title || 'Untitled Book';
    const author = epub.metadata.creator || 'Unknown Author';
    const description = epub.metadata.description || null;

    // Create a book record with status 'processing' using TypeORM
    let book: BookEntity;
    try {
      const bookData = this.bookRepository.create({
        title,
        author,
        description,
        status: 'processing',
      });
      book = await this.bookRepository.save(bookData);
    } catch (dbErr: unknown) {
      const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      this.logger.error(`Error inserting book into database: ${errMsg}`);
      this.safeUnlink(filePath);
      throw new InternalServerErrorException(
        'Lỗi khi lưu thông tin sách vào database',
      );
    }

    // Trigger background processing asynchronously
    this.processBook(book.id, epub, filePath).catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Critical failure processing book ${book.id} in background: ${error.message}`,
      );
    });

    return book;
  }

  /**
   * Retrieve all books
   */
  async findAll(): Promise<BookEntity[]> {
    try {
      const books = await this.bookRepository.find({
        order: { created_at: 'DESC' },
      });
      // Cast entity types directly as Book (fields are matching)
      return books;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error fetching books: ${errMsg}`);
      throw new InternalServerErrorException('Lỗi khi lấy danh sách sách');
    }
  }

  /**
   * Retrieve one book with its chapters
   */
  async findOne(
    id: string,
  ): Promise<BookEntity & { chapters: ChapterEntity[] }> {
    const book = await this.bookRepository.findOne({ where: { id } });
    if (!book) {
      throw new NotFoundException('Không tìm thấy sách');
    }

    try {
      const chapters = await this.chapterRepository.find({
        where: { book_id: id },
        order: { chapter_number: 'ASC' },
      });

      return {
        ...book,
        chapters,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error fetching chapters for book ${id}: ${errMsg}`);
      throw new InternalServerErrorException(
        'Lỗi khi lấy thông tin chương sách',
      );
    }
  }

  private async processBook(
    bookId: string,
    epub: EPub,
    filePath: string,
  ): Promise<void> {
    this.logger.log(`Starting chapter processing for book ID: ${bookId}`);

    try {
      // Find valid chapter items from flow.
      // Usually, some elements in flow may not contain actual book content (e.g. stylesheet, metadata, cover).
      // We will filter items by their ID or skip if getChapter content is extremely short.
      const flow = (epub.flow || []) as Array<{ id: string; title?: string }>;
      let chapterNumber = 1;

      for (let i = 0; i < flow.length; i++) {
        const item = flow[i];
        this.logger.log(
          `Processing chapter index ${i + 1}/${flow.length} (ID: ${item.id})...`,
        );

        try {
          const rawHtml = await getChapterText(epub, item.id);
          // Convert HTML to clean plain text
          const strippedText = convert(rawHtml, {
            wordwrap: false,
          }).trim();

          // Skip empty or extremely short sections (like cover images or table of contents pages with just links)
          if (strippedText.length < 150) {
            this.logger.log(
              `Skipping item ${item.id} because it only contains ${strippedText.length} characters (likely cover page or table of contents)`,
            );
            continue;
          }

          // Send the text to Gemini to generate summaries with Exponential Backoff
          const summaries = await retryWithBackoff(
            () => this.aiService.generateSummaries(strippedText),
            5,
            10000,
            2,
            this.logger,
          );

          // Insert chapter to database
          const chapterTitle =
            summaries.title || item.title || `Chapter ${chapterNumber}`;
          try {
            const chapterData = this.chapterRepository.create({
              book_id: bookId,
              chapter_number: chapterNumber,
              title: chapterTitle,
              summary_a1_a2: summaries.summary_a1_a2,
              summary_b1_b2: summaries.summary_b1_b2,
              summary_c1_c2: summaries.summary_c1_c2,
            });
            await this.chapterRepository.save(chapterData);
          } catch (chapterError: unknown) {
            const errMsg =
              chapterError instanceof Error
                ? chapterError.message
                : String(chapterError);
            this.logger.error(
              `Error saving chapter ${chapterNumber} to database: ${errMsg}`,
            );
            throw new Error(`DB Error: ${errMsg}`);
          }

          this.logger.log(
            `Successfully processed and saved chapter ${chapterNumber} (${chapterTitle})`,
          );
          chapterNumber++;

          // THROTTLING: Sleep for 4.5 seconds to guarantee we stay below 15 Requests Per Minute (Gemini API Free Tier)
          if (i < flow.length - 1) {
            this.logger.log(
              'Throttling: Sleeping for 4.5 seconds before next request...',
            );
            await new Promise((resolve) => setTimeout(resolve, 4500));
          }
        } catch (chapterErr: unknown) {
          const error =
            chapterErr instanceof Error
              ? chapterErr
              : new Error(String(chapterErr));
          this.logger.error(
            `Failed to process chapter item ${item.id}: ${error.message}`,
          );
          throw error; // Stop processing the entire book if any chapter fails critically
        }
      }

      // If we finished all chapters and have at least 1 chapter processed
      if (chapterNumber === 1) {
        throw new Error(
          'Không trích xuất được bất kỳ chương hợp lệ nào từ cuốn sách',
        );
      }

      // Update book status to 'completed'
      try {
        await this.bookRepository.update(bookId, { status: 'completed' });
        this.logger.log(`Completed processing book ID: ${bookId}`);
      } catch (updateError: unknown) {
        const errMsg =
          updateError instanceof Error
            ? updateError.message
            : String(updateError);
        this.logger.error(
          `Failed to update book status to completed: ${errMsg}`,
        );
        throw new Error(`Failed to update book status: ${errMsg}`);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Critical failure processing book ${bookId} in background: ${error.message}`,
      );

      // Clean up database: Delete the book record (Cascade will delete all chapters)
      try {
        await this.bookRepository.delete(bookId);
        this.logger.log(
          `Cleaned up failed book record and its chapters from database for ID: ${bookId}`,
        );
      } catch (deleteDbErr: unknown) {
        const errMsg =
          deleteDbErr instanceof Error
            ? deleteDbErr.message
            : String(deleteDbErr);
        this.logger.error(
          `Failed to clean up failed book record from database: ${errMsg}`,
        );
      }
    } finally {
      // Clean up the temporary file
      this.safeUnlink(filePath);
    }
  }

  /**
   * Safely delete a file from disk
   */
  private safeUnlink(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Successfully removed temp file: ${filePath}`);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Error deleting temp file ${filePath}: ${error.message}`,
      );
    }
  }
}
