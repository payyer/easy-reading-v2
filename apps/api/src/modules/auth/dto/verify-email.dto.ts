import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Mã token xác thực email nhận được từ email',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'Token không được để trống' })
  @IsString({ message: 'Token phải là một chuỗi ký tự' })
  token: string;
}
