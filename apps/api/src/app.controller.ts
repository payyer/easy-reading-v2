import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SupabaseService } from './core/config/supabase.service';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabaseService: SupabaseService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'API Chào mừng' })
  @ApiResponse({ status: 200, description: 'Trả về thông điệp chào mừng' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái kết nối tới Supabase' })
  @ApiResponse({ status: 200, description: 'Kết nối ổn định' })
  @ApiResponse({ status: 500, description: 'Không thể kết nối tới Supabase' })
  async checkHealth() {
    try {
      const client = this.supabaseService.getClient();

      // Thực hiện một cuộc gọi thực tế tới API Supabase để kiểm tra kết nối mạng và khóa API Key
      const { error } = await client.auth.admin.listUsers();

      if (error) {
        throw new Error(error.message);
      }

      return {
        status: 'ok',
        supabase: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw new InternalServerErrorException(
        `Supabase connection failed: ${err.message}`,
      );
    }
  }
}
