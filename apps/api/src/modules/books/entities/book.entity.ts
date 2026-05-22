import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChapterEntity } from './chapter.entity';

@Entity('books')
export class BookEntity {
  @ApiProperty({
    example: 'd0b8f36c-9c76-4d22-921a-289cf24f5a34',
    description: 'ID của sách',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Đất Rừng Phương Nam', description: 'Tiêu đề sách' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ example: 'Đoàn Giỏi', description: 'Tác giả sách' })
  @Column({ length: 255 })
  author: string;

  @ApiProperty({
    example: 'https://example.com/cover.jpg',
    nullable: true,
    description: 'Đường dẫn ảnh bìa sách',
  })
  @Column({ name: 'cover_url', type: 'text', nullable: true })
  cover_url: string | null;

  @ApiProperty({
    example: 'Một cuốn tiểu thuyết viết về...',
    nullable: true,
    description: 'Mô tả ngắn về sách',
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 'processing',
    enum: ['processing', 'completed', 'failed'],
    description: 'Trạng thái xử lý sách',
  })
  @Column({ length: 50, default: 'processing' })
  status: 'processing' | 'completed' | 'failed';

  @ApiProperty({ example: '2026-05-22T06:00:00.000Z', description: 'Ngày tạo' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({
    type: () => ChapterEntity,
    isArray: true,
    required: false,
    description: 'Danh sách các chương',
  })
  @OneToMany(() => ChapterEntity, (chapter) => chapter.book)
  chapters: ChapterEntity[];
}
