import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { AIModule } from '../ai/ai.module';
import { BookEntity } from './entities/book.entity';
import { ChapterEntity } from './entities/chapter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookEntity, ChapterEntity]), AIModule],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
