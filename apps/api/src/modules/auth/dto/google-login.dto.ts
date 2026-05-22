import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Mã ID Token nhận được từ thư viện Google Sign-in ở phía Client',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9...',
  })
  @IsNotEmpty({ message: 'Google ID Token không được để trống' })
  @IsString({ message: 'Google ID Token phải là một chuỗi ký tự' })
  idToken: string;
}
