import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Thiết lập tiền tố toàn cục cho các API
  app.setGlobalPrefix('api');

  // Tự động validate dữ liệu đầu vào qua DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Bắt và chuẩn hóa các ngoại lệ/lỗi phát sinh
  app.useGlobalFilters(new HttpExceptionFilter());

  // Đồng nhất cấu trúc dữ liệu trả về cho client
  app.useGlobalInterceptors(new TransformInterceptor());

  // Thiết lập tài liệu API (Swagger OpenAPI)
  const config = new DocumentBuilder()
    .setTitle('EasyReading API')
    .setDescription('Tài liệu API cho backend NestJS của dự án EasyReading')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  // Dùng console.log để admin thấy link nhanh ở console terminal
  console.log(`\n🚀 NestJS server running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs available on: http://localhost:${port}/api/docs\n`,
  );
}
void bootstrap();
