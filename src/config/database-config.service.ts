import 'pg';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    return {
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? {
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
          }
        : {
            host: process.env.DB_HOST ?? 'localhost',
            port: Number(process.env.DB_PORT ?? 5432),
            username: process.env.DB_USERNAME ?? 'postgres',
            password: process.env.DB_PASSWORD ?? 'postgres',
            database: process.env.DB_DATABASE ?? 'aasvaDB',
          }),
      autoLoadEntities: true,
      synchronize: false,
      logging: isProduction
        ? ['error', 'warn']
        : ['error', 'warn', 'migration'],
    };
  }
}
