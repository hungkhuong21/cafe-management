import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Tiền tố /api cho tất cả endpoints
  app.setGlobalPrefix('api');

  // Bộ lọc lỗi tập trung
  app.useGlobalFilters(new AllExceptionsFilter());

  // Cho phép CORS cho frontend kết nối
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Đảm bảo thư mục uploads luôn tồn tại trên môi trường production (Render / Docker)
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // Phục vụ thư mục ảnh tĩnh /uploads trên cả 2 đường dẫn
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });
  app.useStaticAssets(uploadsDir, {
    prefix: '/api/uploads/',
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on: http://localhost:${port}/api`);
}

bootstrap();
