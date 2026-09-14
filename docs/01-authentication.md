# 01 - Authentication (Login / Registration / Sessions)

Module: `src/auth/` + `src/users/`

## Concepts

- **Access token**: short-lived JWT (default `15m`). Claims:
  `sub` (user id), `email`, `roles: string[]`, `permissions: string[]`.
  Sent as `Authorization: Bearer <token>`.
- **Refresh token**: opaque 96-char hex, rotated on every refresh. Only its
  SHA-256 hash + expiry are stored on the user row (`refresh_token_hash`,
  `refresh_token_expires_at`). Sent/returned in the response body (not a cookie).
- Passwords are hashed with bcrypt (cost 12).
- Emails are lowercased before storing/comparing.

## Endpoints (all under `/api`)

### POST `/auth/register` — public, throttled 10/min

Body:

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "Password1"
}
```

Password rule: 8–128 chars, must contain upper + lower + digit.
Creates the user with the default `user` role, then auto-logs in.

Response `201`:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<96-char-hex>",
  "user": { "id": "...", "email": "jane@example.com", "roles": [{ "name": "user", ... }] }
}
```

Errors: `409` email already registered, `400` validation.

### POST `/auth/login` — public, throttled 5/min

Body: `{ "email", "password" }`.

- `401` on unknown email or wrong password (identical message: "Invalid credentials").
- `403` when the account is `isActive = false`.
- `200` otherwise, same shape as register.

### POST `/auth/refresh` — public, throttled 10/min

Body: `{ "refreshToken": "<hex>" }`.
Verifies the stored hash and expiry, then rotates the refresh token
(old one is invalidated). Returns a fresh `{ accessToken, refreshToken, user }`.
`401` on invalid/expired token.

### POST `/auth/logout` — authenticated

No body required. Clears the stored refresh token (the access token is a JWT
and remains valid until expiry, like any stateless JWT). `204`.

### GET `/auth/me` — authenticated

Returns the current user's safe profile (no password/refresh fields).
`200`.

### POST `/auth/change-password` — authenticated, throttled 5/min

Body: `{ "currentPassword", "newPassword" }`.
- `401` if `currentPassword` is wrong.
- `204` on success. Also invalidates all refresh tokens for the user.

## Auth guard flow

1. `JwtAuthGuard` (global) validates the bearer JWT unless the route is `@Public()`.
2. `JwtStrategy` reads claims into `req.user: { id, email, roles, permissions }`.
3. Handlers read it via `@CurrentUser()` (see `common/decorators/current-user.decorator.ts`).

## Files

- `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/dto/*` (register, login, refresh, change-password)
- `src/users/users.service.ts` (password hashing, refresh-token storage)
- `src/common/guards/jwt-auth.guard.ts`

## Agent checklist

- [ ] Register returns tokens + user with `user` role
- [ ] Duplicate email register → `409`
- [ ] Wrong password login → `401`; inactive account → `403`
- [ ] `/auth/me` works with a valid token; `401` without / with expired token
- [ ] Refresh rotates the token (old refresh token stops working)
- [ ] Logout makes the refresh token unusable
- [ ] Change-password with wrong current password → `401`; correct → `204`, old password stops working
- [ ] Password rule violations → `400`
