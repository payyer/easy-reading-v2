import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Request } from 'express';

interface CustomAuthenticatedUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Endpoint không yêu cầu phân quyền, cho qua
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: CustomAuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException(
        'Không thể thực hiện xác thực phân quyền do thiếu thông tin người dùng',
      );
    }

    const userRole = user.role || 'user';
    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        'Tài khoản của bạn không có đủ quyền hạn để truy cập tài nguyên này',
      );
    }

    return true;
  }
}
