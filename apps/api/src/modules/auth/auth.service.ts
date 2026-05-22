import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UserEntity } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Đăng ký tài khoản mới bằng Email/Password
   */
  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Tài khoản email này đã được đăng ký');
    }

    try {
      // Băm mật khẩu
      const passwordHash = await bcrypt.hash(password, 10);

      // Tạo verification token
      const verificationToken = crypto.randomUUID();
      const verificationTokenExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ); // 24 giờ

      // Tạo và lưu user mới
      const user = await this.usersService.create({
        email,
        password_hash: passwordHash,
        role: 'user',
        is_verified: false,
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires,
      });

      // Gửi email xác thực (chạy bất đồng bộ, không block response)
      this.mailService
        .sendVerificationEmail(email, verificationToken)
        .catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Lỗi gửi email xác thực đến ${email}: ${errMsg}`);
        });

      return {
        message:
          'Đăng ký tài khoản thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        userId: user.id,
        email: user.email,
        confirmed: false,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Đăng ký thất bại cho email ${email}: ${errMsg}`);
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi đăng ký tài khoản',
      );
    }
  }

  /**
   * Xác thực email của người dùng
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token } = verifyEmailDto;

    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Mã xác thực không hợp lệ');
    }

    if (
      user.verification_token_expires &&
      user.verification_token_expires < new Date()
    ) {
      throw new BadRequestException(
        'Mã xác thực đã hết hạn. Vui lòng đăng ký lại hoặc yêu cầu đặt lại mật khẩu.',
      );
    }

    user.is_verified = true;
    user.verification_token = null;
    user.verification_token_expires = null;

    await this.usersService.save(user);

    return {
      message:
        'Xác thực tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.',
    };
  }

  /**
   * Đăng nhập bằng Email/Password
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    // Nếu tài khoản chưa xác thực email, không cho đăng nhập
    if (!user.is_verified) {
      throw new UnauthorizedException(
        'Tài khoản của bạn chưa được xác thực email. Vui lòng kiểm tra hộp thư.',
      );
    }

    if (!user.password_hash) {
      throw new UnauthorizedException(
        'Tài khoản này được đăng ký qua Google. Vui lòng chọn đăng nhập bằng Google.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    // Sinh tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Đăng nhập bằng Google ID Token
   */
  async googleLogin(googleLoginDto: GoogleLoginDto) {
    const { idToken } = googleLoginDto;

    try {
      // Gọi API Google Token Info để xác thực token và lấy thông tin user
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      if (!response.ok) {
        throw new UnauthorizedException(
          'Google ID Token không hợp lệ hoặc đã hết hạn',
        );
      }

      const payload = (await response.json()) as {
        email: string;
        email_verified?: string;
      };
      const email = payload.email;

      if (!email) {
        throw new BadRequestException(
          'Không tìm thấy địa chỉ email từ Google Token info',
        );
      }

      let user = await this.usersService.findByEmail(email);

      if (!user) {
        // Tạo tài khoản mới từ Google Auth
        user = await this.usersService.create({
          email,
          password_hash: null,
          role: 'user',
          is_verified: true, // Google đã xác thực email này
        });
        this.logger.log(
          `Tạo tài khoản Google mới thành công cho email ${email}`,
        );
      } else {
        // Nếu user đã tồn tại nhưng chưa verified (tài khoản đăng ký thường nhưng chưa bấm link mail),
        // đăng nhập Google cũng coi như xác nhận verified email của họ.
        if (!user.is_verified) {
          user.is_verified = true;
          user.verification_token = null;
          user.verification_token_expires = null;
          await this.usersService.save(user);
        }
      }

      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Đăng nhập Google thất bại: ${errMsg}`);
      if (
        err instanceof UnauthorizedException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi đăng nhập Google',
      );
    }
  }

  /**
   * Làm mới Access Token sử dụng Refresh Token
   */
  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify<{ sub: string; type: string }>(
        refreshToken,
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Người dùng không tồn tại');
      }

      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Làm mới token thất bại: ${errMsg}`);
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  /**
   * Đăng xuất session hiện tại (Stateless)
   */
  logout() {
    // Với JWT stateless, phía Backend chỉ cần thông báo thành công.
    // Client chịu trách nhiệm xóa token này khỏi bộ nhớ/storage của họ.
    return {
      message: 'Đăng xuất thành công',
    };
  }

  /**
   * Yêu cầu đặt lại mật khẩu (Gửi email khôi phục)
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Để tránh Email Enumeration attack (bảo mật), ta trả về kết quả thành công giả vờ
      return {
        message:
          'Đường dẫn đặt lại mật khẩu đã được gửi đến email của bạn nếu tài khoản tồn tại.',
      };
    }

    try {
      const resetToken = crypto.randomUUID();
      const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 giờ

      user.reset_token = resetToken;
      user.reset_token_expires = resetTokenExpires;
      await this.usersService.save(user);

      // Gửi email đặt lại mật khẩu
      this.mailService
        .sendPasswordResetEmail(email, resetToken)
        .catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Lỗi gửi email reset password đến ${email}: ${errMsg}`,
          );
        });

      return {
        message:
          'Đường dẫn đặt lại mật khẩu đã được gửi đến email của bạn nếu tài khoản tồn tại.',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Yêu cầu reset password thất bại cho email ${email}: ${errMsg}`,
      );
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi yêu cầu đặt lại mật khẩu',
      );
    }
  }

  /**
   * Đặt lại mật khẩu mới cho người dùng bằng token nhận được từ mail
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Mã token reset mật khẩu không hợp lệ');
    }

    if (user.reset_token_expires && user.reset_token_expires < new Date()) {
      throw new BadRequestException('Mã token reset mật khẩu đã hết hạn');
    }

    try {
      user.password_hash = await bcrypt.hash(newPassword, 10);
      user.reset_token = null;
      user.reset_token_expires = null;

      // Nếu user chưa verify email mà đã reset được pass (nghĩa là họ truy cập được mail để reset),
      // ta cũng coi như xác nhận verified email của họ.
      if (!user.is_verified) {
        user.is_verified = true;
        user.verification_token = null;
        user.verification_token_expires = null;
      }

      await this.usersService.save(user);

      return {
        message: 'Mật khẩu đã được cập nhật thành công',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Cập nhật mật khẩu thất bại: ${errMsg}`);
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi cập nhật mật khẩu',
      );
    }
  }

  /**
   * Helper để sinh cặp Access Token và Refresh Token
   */
  private async generateTokens(user: UserEntity) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
    };

    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: '30d', // Refresh token có hạn dài hơn (30 ngày)
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const decoded: any = this.jwtService.decode(access_token);
    const expires_in =
      decoded && typeof decoded === 'object' && 'exp' in decoded
        ? (decoded as { exp: number }).exp - Math.floor(Date.now() / 1000)
        : 3600;

    return {
      access_token,
      refresh_token,
      expires_in,
    };
  }
}
