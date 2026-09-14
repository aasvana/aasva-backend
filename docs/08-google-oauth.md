# 08 - Google OAuth

Module: `src/auth/` (`GoogleStrategy`, `AuthService.loginWithOAuth`), schema
`oauth_identities`.

## Flow

1. Frontend navigates the user to `GET /api/auth/google` (`@Public()`,
   guarded by passport `AuthGuard('google')`).
2. `GoogleStrategy` requests `email` + `profile` scopes and forces
   `<prompt=select_account>` via `authorizationParams()` so Google always lets
   the user pick an account (no silent sign-in).
3. Google redirects back to `GOOGLE_CALLBACK_URL` (`GET /api/auth/google/callback`).
   `GoogleStrategy.validate()` maps the profile to `GoogleOAuthUser`
   (`email`, `firstName`, `lastName`, `picture`, `provider`, `providerId`,
   `emailVerified`).
4. `AuthService.loginWithOAuth(profile)`:
   - **Existing identity** (`oauth_identities` row for provider+provider_user_id)
     → issue tokens for the linked user.
   - **Email unverified** → `401 UnauthorizedException` ("Your Google email is
     not verified...").
   - **Email already registered locally** → link a new `oauth_identities` row to
     that user and issue tokens (the account is shared; email match wins).
   - **Brand-new user** → create a user with a random 32-byte hex password
     (unusable for password login), assign the default `user` role, save the
     identity, and issue tokens.
5. The controller responds with an HTTP **redirect**:

   ```
   302 → FRONTEND_URL/auth/callback?accessToken=<jwt>&refreshToken=<hex>
   ```

   The frontend page `aasva-frontend/src/app/pages/auth/callback/page.tsx` reads
   the query params, persists them, and routes via `getNextOnboardingRoute()`.

## Schema

### `oauth_identities`

`id uuid PK`, `user_id` FK→`users` (cascade), `provider` (varchar 50),
`provider_user_id` (varchar 255), `email` (varchar 255), `email_verified`
(boolean, default false), `created_at`. Unique on `(provider, provider_user_id)`,
indexed on `user_id`.

Header migration: `src/database/migrations/1760000000002-CreateOauthIdentitiesTable.ts`
also makes `users.password_hash` **nullable** (OAuth-only users have no password).

## Environment variables

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
(default `http://localhost:3300/api/auth/google/callback`), `FRONTEND_URL`
(default `http://localhost:3000`).

Credentials are created at
<https://console.cloud.google.com/apis/credentials>; the authorized redirect URI
must exactly match `GOOGLE_CALLBACK_URL`.

## Security notes

- `prompt=select_account` prevents silent account-switch confusion.
- Unverified Google emails are rejected (`401`).
- The user-facing password for OAuth-only accounts is random and unusable — they
  can still use "forgot password" to set one if needed.
- `SafeUser` never includes `oauthIdentities`.

## Files

- `src/auth/strategies/google.strategy.ts`
- `src/auth/auth.service.ts` (`loginWithOAuth`)
- `src/auth/auth.controller.ts` (`GET /auth/google`, `GET /auth/google/callback`)
- `src/auth/entities/oauth-identity.entity.ts`
- `src/database/migrations/1760000000002-CreateOauthIdentitiesTable.ts`

## Agent checklist

- [ ] `GET /api/auth/google` redirects to Google with `prompt=select_account`
- [ ] New Google user is created with the `user` role and an `oauth_identities` row
- [ ] Google login with an email that already has a password account links to it
- [ ] Second login for the same Google account reuses the identity (no duplicate user)
- [ ] Backend redirects to `FRONTEND_URL/auth/callback?accessToken=...&refreshToken=...`
- [ ] Unverified Google email → `401`
- [ ] OAuth-only users have a null `password_hash`