import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.setGlobalPrefix(app.get(AppConfigService).apiPrefix);
  app.useBodyParser('json', { limit: '2mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsOrigins = app.get(AppConfigService).corsOrigins;
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  await app.listen(app.get(AppConfigService).port);
  Logger.log(
    `API listening on http://localhost:${app.get(AppConfigService).port}/${app.get(AppConfigService).apiPrefix}`,
    'Bootstrap',
  );
}
void bootstrap();
