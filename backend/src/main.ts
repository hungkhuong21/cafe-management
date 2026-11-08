import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Tăng giới hạn payload body lên 15MB để lưu được ảnh Base64 trực tiếp vào CSDL
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

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

  // Tự động chuyển hướng khi khách quét QR trỏ vào backend domain sang frontend Vercel
  const frontendUrl =
    process.env.FRONTEND_URL ||
    'https://cafe-management-lywb2huvn-hungkhuong21s-projects.vercel.app';

  app.use((req: any, res: any, next: any) => {
    const match = req.url.match(/^\/(?:api\/)?qr\/([^?#/]+)/);
    if (match) {
      const token = match[1];
      const queryIdx = req.url.indexOf('?');
      const query = queryIdx !== -1 ? req.url.substring(queryIdx) : '';
      return res.redirect(302, `${frontendUrl.replace(/\/+$/, '')}/qr/${token}${query}`);
    }
    next();
  });

  // Phục vụ thư mục ảnh tĩnh /uploads trên cả 2 đường dẫn với CORS mở
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
  app.useStaticAssets(uploadsDir, {
    prefix: '/api/uploads/',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on: http://localhost:${port}/api`);
}

bootstrap();
