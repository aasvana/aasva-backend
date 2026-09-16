# 01 - Authentication (Login / Registration / Sessions)

Module: `src/auth/` + `src/users/`

## Concepts

- **Access token**: short-lived JWT (default `15m`). Claims:
  `sub` (user id), `email`, `tenantId`, `roles: string[]`, `permissions: string[]`.
  Sent as `Authorization: Bearer <token>`. `tenantId` is used by the global
  tenant interceptor to scope every request to the user's tenant (see
  [`11-multi-tenancy.md`](11-multi-tenancy.md)).
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
  "password": "Password1",
  "tenantName": "Acme Co"   // optional
}
```

Password rule: 8–128 chars, must contain upper + lower + digit.
Creates the user with the default `user` role, creates a **private tenant**
(the optional `tenantName`, or `${firstName} ${lastName} Company`), attaches the
user to it, then auto-logs in. `user.tenantId` and the JWT `tenantId` claim
carry the new tenant's id.

Response `201`:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<96-char-hex>",
  "user": { "id": "...", "email": "jane@example.com", "tenantId": "<uuid>", "roles": [{ "name": "user", ... }] }
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
2. `JwtStrategy` reads claims into `req.user: { id, email, tenantId, roles, permissions }`.
3. Handlers read it via `@CurrentUser()` (see `common/decorators/current-user.decorator.ts`).
4. The global `TenantInterceptor` (see `common/tenant/`) reads `req.user.tenantId`
   and runs the handler inside `AsyncLocalStorage` so every scoped service query
   stays within the caller's tenant. Tokens issued before the tenancy migration
   lack `tenantId` and are rejected with `403` until refreshed/relogin.

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
