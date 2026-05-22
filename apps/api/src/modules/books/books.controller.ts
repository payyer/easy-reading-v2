import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/guards/roles.decorator';
import { BookEntity } from './entities/book.entity';
import { BookUploadResponseDto } from './dto/book-upload-response.dto';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post('upload')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Admin upload file sách EPUB để trích xuất và tóm tắt bằng AI (Bất đồng bộ)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File sách định dạng .epub',
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Sách đã được nhận và đang được xử lý dưới nền',
    type: BookUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'File không hợp lệ hoặc thiếu file',
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập (chưa đăng nhập)',
  })
  @ApiResponse({
    status: 403,
    description: 'Từ chối truy cập (không phải Admin)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads',
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.epub$/i)) {
          return callback(
            new BadRequestException(
              'Chỉ cho phép upload file định dạng EPUB (.epub)',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadBook(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BookUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Vui lòng cung cấp file EPUB');
    }
    const book = await this.booksService.startBookProcessing(file.path);
    return {
      message:
        'Sách đã được tiếp nhận và đang được xử lý dưới nền. Vui lòng kiểm tra lại sau ít phút.',
      bookId: book.id,
      book,
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách tất cả các sách trong hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    type: BookEntity,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  async getAllBooks(): Promise<BookEntity[]> {
    return this.booksService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy chi tiết một cuốn sách kèm danh sách các chương đã tóm tắt',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
    type: BookEntity,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sách' })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  async getBookById(@Param('id') id: string): Promise<BookEntity> {
    return this.booksService.findOne(id);
  }
}
