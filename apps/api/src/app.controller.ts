import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'API Chào mừng' })
  @ApiResponse({ status: 200, description: 'Trả về thông điệp chào mừng' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái kết nối tới Database' })
  @ApiResponse({ status: 200, description: 'Kết nối ổn định' })
  @ApiResponse({ status: 500, description: 'Không thể kết nối tới Database' })
  async checkHealth() {
    try {
      // Thực hiện một câu lệnh SELECT 1 thực tế để kiểm tra kết nối CSDL
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw new InternalServerErrorException(
        `Database connection failed: ${error.message}`,
      );
    }
  }
}
