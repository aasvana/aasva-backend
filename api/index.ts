import 'pg';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/config/app-config.service';

let cachedServer: (req: unknown, res: unknown) => unknown;

async function bootstrapServer() {
  if (!cachedServer) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log'],
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
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    });

    await app.init();
    cachedServer = app.getHttpAdapter().getInstance() as (
      req: unknown,
      res: unknown,
    ) => unknown;
  }
  return cachedServer;
}

export default async function handler(req: unknown, res: unknown) {
  const server = await bootstrapServer();
  return server(req, res);
}
