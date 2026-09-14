# 07 - Mail Module

Module: `src/mail/` — email delivery via `@nestjs-modules/mailer` (nodemailer).

## Modes

| Mode | Condition          | Behavior                                        |
| ---- | ------------------ | ----------------------------------------------- |
| Dev  | `SMTP_HOST` empty  | `MailService.send()` logs the mail to the console as `[MAIL-DEV]` (no delivery). |
| Prod | `SMTP_HOST` set    | Sends via SMTP (`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). |

`SMTP_FROM` defaults to `noreply@example.com`.

## Consumers

- `AuthService.forgotPassword()` → `MailService.sendPasswordResetEmail(to, resetUrl)`
  sends the "Reset your password" email with `APP_BASE_URL/reset-password?token=...`.

Adding new emails: add a method to `MailService` and call it from the service.

## Dev-mode testing

The raw reset token is printed in the server log:

```
[MailService] [MAIL-DEV] to=jane@example.com subject="Reset your password" html=...
```

To extract it:

```bash
grep -o "reset-password?token=[a-f0-9]*" /tmp/nest-start.log | tail -1
```

## Files

- `src/mail/mail.module.ts` (`MailerModule.forRootAsync`, global module)
- `src/mail/mail.service.ts`

## Agent checklist

- [ ] Without `SMTP_HOST`, sending an email logs `[MAIL-DEV]` and never throws
- [ ] With `SMTP_HOST` set, emails are delivered over SMTP with `SMTP_FROM` as sender
- [ ] Reset-link URL uses `APP_BASE_URL`
- [ ] HTML email contains an anchor link to the reset URL
