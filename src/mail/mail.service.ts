import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { AppConfigService } from '../config/app-config.service';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Sends an email. When SMTP is not configured (dev mode) the email is
   * logged to the console instead of being delivered.
   */
  async send({ to, subject, html }: SendMailOptions): Promise<void> {
    if (!this.config.smtpHost) {
      this.logger.log(`[MAIL-DEV] to=${to} subject="${subject}" html=${html}`);
      return;
    }

    await this.mailerService.sendMail({ to, subject, html });
  }

  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    return this.send({
      to,
      subject: 'Reset your password',
      html: `
        <h2>Reset your password</h2>
        <p>We received a request to reset the password for <strong>${to}</strong>.</p>
        <p>This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
      `,
    });
  }
}
