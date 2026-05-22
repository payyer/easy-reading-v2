import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Mật khẩu mới của tài khoản (tối thiểu 6 ký tự)',
    example: 'newpassword123',
  })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString({ message: 'Mật khẩu mới phải là một chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự' })
  newPassword: string;
}
