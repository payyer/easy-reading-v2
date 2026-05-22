import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description:
      'Refresh Token nhận được khi đăng nhập để làm mới access token',
    example: 'd3b07384d113edec49eaa6238ad5ff00...',
  })
  @IsNotEmpty({ message: 'Refresh Token không được để trống' })
  @IsString({ message: 'Refresh Token phải là một chuỗi ký tự' })
  refreshToken: string;
}
