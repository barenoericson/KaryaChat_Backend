import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const uploadsDir = join(process.cwd(), 'uploads');
  const avatarsDir = join(uploadsDir, 'avatars');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  if (!existsSync(avatarsDir)) mkdirSync(avatarsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Backend running on http://localhost:3000`);
}
bootstrap();