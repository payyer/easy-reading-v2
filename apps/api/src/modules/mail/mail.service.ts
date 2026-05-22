import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail = 'EasyReading <noreply@easyreading.com>';

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM');

    if (from) {
      this.fromEmail = from;
    }

    if (host && port) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: user && pass ? { user, pass } : undefined,
        });
        this.logger.log(
          `Nodemailer SMTP Transporter initialized successfully for host ${host}:${port}`,
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to initialize SMTP transporter: ${errMsg}`);
      }
    } else {
      this.logger.warn(
        'SMTP_HOST or SMTP_PORT not configured. Mail verification/reset links will be printed to terminal console.',
      );
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const link = `${frontendUrl}/verify-email?token=${token}`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromEmail,
          to: email,
          subject: 'Xác thực tài khoản EasyReading',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #4f46e5; text-align: center;">Chào mừng bạn đến với EasyReading!</h2>
              <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng bấm vào nút dưới đây để kích hoạt tài khoản của mình:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
              </div>
              <p style="color: #666; font-size: 14px;">Nếu nút trên không hoạt động, bạn có thể copy link sau và dán vào trình duyệt:</p>
              <p style="color: #666; font-size: 14px; word-break: break-all;"><a href="${link}">${link}</a></p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">Đây là email tự động, vui lòng không trả lời email này.</p>
            </div>
          `,
        });
        this.logger.log(`Verification email sent successfully to ${email}`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to send verification email to ${email}: ${errMsg}`,
        );
        this.logToConsoleFallback(
          email,
          'Kích hoạt tài khoản (Verification)',
          link,
        );
      }
    } else {
      this.logToConsoleFallback(
        email,
        'Kích hoạt tài khoản (Verification)',
        link,
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const link = `${frontendUrl}/reset-password?token=${token}`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromEmail,
          to: email,
          subject: 'Đặt lại mật khẩu EasyReading',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #4f46e5; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
              <p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu cho tài khoản EasyReading. Vui lòng bấm vào nút dưới đây để tiến hành đặt mật khẩu mới:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
              </div>
              <p style="color: #666; font-size: 14px;">Nếu nút trên không hoạt động, bạn có thể copy link sau và dán vào trình duyệt:</p>
              <p style="color: #666; font-size: 14px; word-break: break-all;"><a href="${link}">${link}</a></p>
              <p style="color: #ff3333; font-size: 14px;">Liên kết này sẽ hết hạn sau 1 giờ.</p>
              <p style="color: #666; font-size: 14px;">Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">Đây là email tự động, vui lòng không trả lời email này.</p>
            </div>
          `,
        });
        this.logger.log(`Password reset email sent successfully to ${email}`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to send password reset email to ${email}: ${errMsg}`,
        );
        this.logToConsoleFallback(
          email,
          'Đặt lại mật khẩu (Password Reset)',
          link,
        );
      }
    } else {
      this.logToConsoleFallback(
        email,
        'Đặt lại mật khẩu (Password Reset)',
        link,
      );
    }
  }

  private logToConsoleFallback(email: string, action: string, link: string) {
    this.logger.log(
      `\n========================================================================\n` +
      `[DEVELOPMENT MODE - MAIL LOG FALLBACK]\n` +
      `Gửi tới: ${email}\n` +
      `Hành động: ${action}\n` +
      `Liên kết: ${link}\n` +
      `========================================================================\n`,
    );
  }
}
