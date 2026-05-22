import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../core/config/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Đăng ký tài khoản mới bằng Email/Password
   */
  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;
    const client = this.supabaseService.getClient();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${frontendUrl}`,
      },
    });

    if (error) {
      this.logger.error(`Đăng ký thất bại cho email ${email}: ${error.message}`);
      this.handleAuthError(error);
    }

    // Supabase có thể trả về user nhưng cần xác nhận email (nếu bật tính năng này)
    // Hoặc trả về session nếu không yêu cầu xác nhận email.
    return {
      message: 'Đăng ký tài khoản thành công',
      userId: data.user?.id,
      email: data.user?.email,
      confirmed: data.user?.email_confirmed_at ? true : false,
    };
  }

  /**
   * Đăng nhập bằng Email/Password
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.logger.error(`Đăng nhập thất bại cho email ${email}: ${error.message}`);
      this.handleAuthError(error);
    }

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_in: data.session?.expires_in,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.app_metadata?.role || 'user',
      },
    };
  }

  /**
   * Đăng nhập bằng Google ID Token (Social Login)
   */
  async googleLogin(googleLoginDto: GoogleLoginDto) {
    const { idToken } = googleLoginDto;
    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      this.logger.error(`Đăng nhập Google thất bại: ${error.message}`);
      this.handleAuthError(error);
    }

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_in: data.session?.expires_in,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.app_metadata?.role || 'user',
      },
    };
  }

  /**
   * Làm mới Access Token sử dụng Refresh Token
   */
  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      this.logger.error(`Làm mới token thất bại: ${error.message}`);
      this.handleAuthError(error);
    }

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_in: data.session?.expires_in,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.app_metadata?.role || 'user',
      },
    };
  }

  /**
   * Đăng xuất session hiện tại (Revoke Access Token)
   */
  async logout(accessToken: string) {
    const client = this.supabaseService.getClient();

    // Sử dụng Admin API để thu hồi session dựa trên Access Token của user
    const { error } = await client.auth.admin.signOut(accessToken);

    if (error) {
      this.logger.error(`Đăng xuất thất bại: ${error.message}`);
      this.handleAuthError(error);
    }

    return {
      message: 'Đăng xuất thành công',
    };
  }

  /**
   * Yêu cầu đặt lại mật khẩu (Gửi email khôi phục)
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const client = this.supabaseService.getClient();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/reset-password`,
    });

    if (error) {
      this.logger.error(`Yêu cầu reset password thất bại cho email ${email}: ${error.message}`);
      this.handleAuthError(error);
    }

    return {
      message: 'Đường dẫn đặt lại mật khẩu đã được gửi đến email của bạn',
    };
  }

  /**
   * Đặt lại mật khẩu mới cho người dùng
   */
  async resetPassword(userId: string, resetPasswordDto: ResetPasswordDto) {
    const { newPassword } = resetPasswordDto;
    const client = this.supabaseService.getClient();

    // Sử dụng Admin API để cập nhật mật khẩu dựa trên userId
    const { error } = await client.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      this.logger.error(`Cập nhật mật khẩu thất bại cho userId ${userId}: ${error.message}`);
      this.handleAuthError(error);
    }

    return {
      message: 'Mật khẩu đã được cập nhật thành công',
    };
  }

  /**
   * Xử lý lỗi từ Supabase và ánh xạ sang các NestJS HTTP Exceptions
   */
  private handleAuthError(error: any): never {
    const status = error.status || 500;
    const message = error.message || 'Lỗi xác thực hệ thống';

    if (status === 400) {
      if (message.includes('already registered') || message.includes('already exists')) {
        throw new ConflictException('Tài khoản email này đã được đăng ký');
      }
      throw new BadRequestException(message);
    }

    if (status === 401 || status === 403 || message.includes('invalid claim') || message.includes('invalid credentials')) {
      throw new UnauthorizedException('Thông tin xác thực không chính xác hoặc đã hết hạn');
    }

    if (status === 422) {
      throw new BadRequestException(`Dữ liệu không thể xử lý: ${message}`);
    }

    throw new InternalServerErrorException(message);
  }
}
