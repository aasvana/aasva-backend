import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import { AppConfigService } from '../config/app-config.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const isSmtpConfigured = Boolean(config.smtpHost);

        return {
          transport: isSmtpConfigured
            ? {
                host: config.smtpHost,
                port: 587,
                secure: false,
                auth: {
                  user: process.env.SMTP_USER ?? '',
                  pass: process.env.SMTP_PASS ?? '',
                },
              }
            : { jsonTransport: true },
          defaults: {
            from: process.env.SMTP_FROM ?? 'noreply@example.com',
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
