import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('🔍 DATABASE_URL: ' + process.env.DATABASE_URL);
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );
  
  app.enableCors();

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  logger.log(`✅ Backend running on http://localhost:${port}`);
}
bootstrap();
