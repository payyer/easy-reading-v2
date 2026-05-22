import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Mã JWT Token không được tìm thấy ở Authorization Header');
    }

    try {
      const client = this.supabaseService.getClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Mã token không hợp lệ, giả mạo hoặc đã hết hạn');
      }

      // Đính kèm thông tin user thu được từ Supabase vào request
      request.user = user;
    } catch (err) {
      throw new UnauthorizedException('Xác thực token thất bại');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
