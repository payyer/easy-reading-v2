import { ApiProperty } from '@nestjs/swagger';
import { BookEntity } from '../entities/book.entity';

export class BookUploadResponseDto {
  @ApiProperty({
    example:
      'Sách đã được tiếp nhận và đang được xử lý dưới nền. Vui lòng kiểm tra lại sau ít phút.',
  })
  message: string;

  @ApiProperty({
    example: 'd0b8f36c-9c76-4d22-921a-289cf24f5a34',
    description: 'ID của sách đang được xử lý',
  })
  bookId: string;

  @ApiProperty({ type: BookEntity, description: 'Thông tin sách vừa khởi tạo' })
  book: BookEntity;
}
