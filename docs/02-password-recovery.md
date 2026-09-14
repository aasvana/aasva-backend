# 02 - Password Recovery

Module: `src/auth/` (`PasswordResetToken` entity, `AuthService.forgotPassword` /
`AuthService.resetPassword`), `src/mail/`

## Flow

1. User calls `POST /auth/forgot-password` with their email.
2. The service creates a one-time token (32 random bytes hex), stores only its
   **SHA-256 hash** + expiry (1 hour) in `password_reset_tokens`.
3. An email with `APP_BASE_URL + "/reset-password?token=<raw-token>"` is sent.
   In dev (no `SMTP_HOST`), the email is printed to the server console.
4. The frontend shows a reset form, then calls `POST /auth/reset-password`
   with the raw token + new password.
5. The service hashes the submitted token, validates (exists, unused, unexpired),
   updates the password, invalidates ALL of the user's refresh tokens and marks
   every pending reset token for the user as used.

## Security notes

- Only the token hash is stored — the raw token is never persisted or logged.
- `forgot-password` always responds `202`, even for unknown emails
  (no user-enumeration).
- Tokens are single-use and expire after 1 hour.
- Reset links must be delivered over HTTPS in production.

## Endpoints

### POST `/auth/forgot-password` — public, throttled 3/min

Body: `{ "email": "jane@example.com" }` → `202` (always).

### POST `/auth/reset-password` — public, throttled 5/min

Body: `{ "token": "<raw-token>", "password": "NewPassword1" }` → `204`.

Errors: `400` unknown/used/expired token; `400` weak password.

## Dev-mode email

When `SMTP_HOST` is empty, `MailService` logs instead of sending:

```
[MAIL-DEV] to=jane@example.com subject="Reset your password" html=...
```

Grep the dev server output for `reset-password?token=` to obtain the raw token
for manual testing.

## Files

- `src/auth/entities/password-reset-token.entity.ts`
- `src/auth/dto/forgot-password.dto.ts`, `src/auth/dto/reset-password.dto.ts`
- `src/auth/auth.service.ts` (`forgotPassword`, `resetPassword`)
- `src/mail/mail.service.ts` (`sendPasswordResetEmail`)

## Agent checklist

- [ ] `forgot-password` → `202`; unknown email also `202`
- [ ] Dev console shows the reset link (token is 64 hex chars)
- [ ] `reset-password` with a valid token + strong password → `204`
- [ ] Reusing the same token → `400` (single-use)
- [ ] Login with the new password works; old password does not
- [ ] After reset, the user's previous refresh tokens no longer work
