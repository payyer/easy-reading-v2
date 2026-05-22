import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/guards/roles.decorator';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Tài khoản email đã tồn tại' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác thực tài khoản qua mã token nhận được từ email',
  })
  @ApiResponse({ status: 200, description: 'Xác thực tài khoản thành công' })
  @ApiResponse({
    status: 400,
    description: 'Token không hợp lệ hoặc đã hết hạn',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng Email & Mật khẩu' })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công và trả về JWT Session',
  })
  @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không hợp lệ' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng tài khoản Google (ID Token)' })
  @ApiResponse({ status: 200, description: 'Đăng nhập Google thành công' })
  @ApiResponse({
    status: 401,
    description: 'Google ID Token không hợp lệ hoặc đã hết hạn',
  })
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token từ Refresh Token' })
  @ApiResponse({ status: 200, description: 'Làm mới Token thành công' })
  @ApiResponse({
    status: 401,
    description: 'Refresh Token không hợp lệ hoặc hết hạn',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yêu cầu khôi phục mật khẩu (Gửi email link reset)',
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi link reset mật khẩu thành công',
  })
  @ApiResponse({ status: 400, description: 'Email không đúng định dạng' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đặt lại mật khẩu mới bằng token nhận được từ email',
  })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu mới thành công' })
  @ApiResponse({
    status: 400,
    description: 'Mã token reset mật khẩu không hợp lệ hoặc đã hết hạn',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất người dùng hiện tại (Revoke Session)' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  @ApiResponse({ status: 401, description: 'Mã xác thực không hợp lệ' })
  logout(@Req() req: AuthenticatedRequest) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Không tìm thấy token đăng nhập');
    }
    return this.authService.logout();
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin profile người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập (thiếu/sai token)',
  })
  getProfile(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        email_confirmed: true,
      },
    };
  }

  @Get('admin-only')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Endpoint thử nghiệm dành riêng cho Admin' })
  @ApiResponse({
    status: 200,
    description: 'Xác nhận tài khoản của bạn là Admin và có quyền truy cập',
  })
  @ApiResponse({
    status: 401,
    description: 'Không có quyền truy cập do thiếu/sai token',
  })
  @ApiResponse({
    status: 403,
    description: 'Từ chối truy cập do không phải là Admin',
  })
  testAdminOnly() {
    return {
      message: 'Xin chào Admin! Bạn có toàn quyền truy cập tài nguyên này.',
      access: true,
      timestamp: new Date().toISOString(),
    };
  }
}
