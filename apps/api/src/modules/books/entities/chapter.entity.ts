import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookEntity } from './book.entity';

@Entity('chapters')
export class ChapterEntity {
  @ApiProperty({
    example: 'a0b9f36c-9c76-4d22-921a-289cf24f5a34',
    description: 'ID của chương',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'd0b8f36c-9c76-4d22-921a-289cf24f5a34',
    description: 'ID của sách',
  })
  @Column({ name: 'book_id' })
  book_id: string;

  @ManyToOne(() => BookEntity, (book) => book.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: BookEntity;

  @ApiProperty({ example: 1, description: 'Số thứ tự chương' })
  @Column({ name: 'chapter_number', type: 'int' })
  chapter_number: number;

  @ApiProperty({
    example: 'Chương 1: Sông nước Cà Mau',
    description: 'Tiêu đề chương',
  })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({
    example: 'Tóm tắt mức độ A1-A2...',
    description: 'Bản tóm tắt trình độ tiếng Anh A1-A2',
  })
  @Column({ name: 'summary_a1_a2', type: 'text' })
  summary_a1_a2: string;

  @ApiProperty({
    example: 'Tóm tắt mức độ B1-B2...',
    description: 'Bản tóm tắt trình độ tiếng Anh B1-B2',
  })
  @Column({ name: 'summary_b1_b2', type: 'text' })
  summary_b1_b2: string;

  @ApiProperty({
    example: 'Tóm tắt mức độ C1-C2...',
    description: 'Bản tóm tắt trình độ tiếng Anh C1-C2',
  })
  @Column({ name: 'summary_c1_c2', type: 'text' })
  summary_c1_c2: string;

  @ApiProperty({ example: '2026-05-22T06:00:00.000Z', description: 'Ngày tạo' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;
}
