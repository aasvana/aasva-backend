import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV') ?? 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get<number>('PORT', 3000);
  }

  get apiPrefix(): string {
    return this.config.get<string>('API_PREFIX', 'api');
  }

  get corsOrigins(): string[] {
    return (this.config.get<string>('CORS_ORIGIN', '') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get jwtAccessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET', 'change-me');
  }

  get jwtAccessExpiresIn(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
  }

  get jwtRefreshExpiresIn(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  get appBaseUrl(): string {
    return this.config.get<string>('APP_BASE_URL', 'http://localhost:3000');
  }

  get smtpHost(): string {
    return this.config.get<string>('SMTP_HOST', '');
  }

  get googleClientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID', '');
  }

  get googleClientSecret(): string {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET', '');
  }

  get googleCallbackUrl(): string {
    return this.config.get<string>(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3300/api/auth/google/callback',
    );
  }

  get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  get imagekitPublicKey(): string {
    return this.config.get<string>('IMAGEKIT_PUBLIC_KEY', '');
  }

  get imagekitPrivateKey(): string {
    return this.config.get<string>('IMAGEKIT_PRIVATE_KEY', '');
  }

  get imagekitUrlEndpoint(): string {
    return this.config.get<string>('IMAGEKIT_URL_ENDPOINT', '');
  }

  get geminiApiKey(): string {
    return this.config.get<string>('GEMINI_API_KEY', '');
  }

  get geminiModel(): string {
    return this.config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
  }
}
