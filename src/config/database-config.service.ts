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
      host: this.config.get<string>('DB_HOST', 'localhost'),
      port: this.config.get<number>('DB_PORT', 5432),
      username: this.config.get<string>('DB_USERNAME', 'postgres'),
      password: this.config.get<string>('DB_PASSWORD', 'postgres'),
      database: this.config.get<string>('DB_DATABASE', 'aasvaDB'),
      autoLoadEntities: true,
      synchronize: false,
      logging: isProduction
        ? ['error', 'warn']
        : ['error', 'warn', 'migration'],
    };
  }
}
