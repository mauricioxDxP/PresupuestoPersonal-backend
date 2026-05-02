import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';
const cors = require('cors');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('🔍 DATABASE_URL: ' + process.env.DATABASE_URL);
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  app.use(cors({
    origin: [
      'https://presupuestopersonal.mauricioxdxp.site',
      'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-casa-id'],
  }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );
  
  
  // Global prefix for all routes
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`✅ Backend running on http://0.0.0.0:${port}`);
}
bootstrap();
