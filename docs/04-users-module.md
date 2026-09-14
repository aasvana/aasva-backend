# 04 - Users Module

Module: `src/users/` — admin CRUD for users.

Protected by `@Roles(Role.ADMIN)` at the controller level, plus
`@Permissions(...)` per route. (systemadmin, superadmin, and admin all pass.)

## Schema

### `users`
`id uuid PK`, `first_name`, `last_name`, `email` (unique), `password_hash`
(not selected by default), `refresh_token_hash`, `refresh_token_expires_at`,
`is_active`, `is_email_verified`, `created_at`, `updated_at`.

### `user_details`
`id uuid PK`, `user_id` (unique FK→users, cascade delete), `date_of_birth`,
`phone`, `address`, `details` (JSONB), `created_at`, `updated_at`.

The `details` JSONB column stores:
- `profileTypeId` — the user's profile type UUID
- `moduleOverrides` — `{ add: string[], remove: string[] }` for per-user module customization

## Endpoints (admin only)

| Method | Path             | Permission   | Description                        |
| ------ | ---------------- | ------------ | ---------------------------------- |
| GET    | `/users`         | `users:read` | paginated list + search            |
| GET    | `/users/:id`     | `users:read` | single user (404 if missing)       |
| POST   | `/users`         | `users:create`| create a user                     |
| PATCH  | `/users/:id`     | `users:update`| partial update                    |
| DELETE | `/users/:id`     | `users:delete`| delete (`204`)                    |
| PATCH  | `/users/:id/modules` | `users:update` | update user module overrides |
| GET    | `/profile-types`     | `users:read` | list all profile types                |
| GET    | `/profile-types/:id` | `users:read` | single profile type (404 if missing)  |
| PATCH  | `/profile-types/:id` | `users:update` | update profile type config (e.g. modules) |
| GET    | `/user-details/:userId` | `users:read` | single user detail (404 if missing) |
| PATCH  | `/user-details/:userId` | `users:update` | partial update user details |

### GET `/profile-types`

Returns the full list of profile types (e.g. `doctor`, `manager`, `accountant`).

### GET `/profile-types/:id`

Returns a single profile type by UUID.

### POST `/users` body

```json
{
  "firstName": "Bob",
  "lastName": "Smith",
  "email": "bob@example.com",
  "password": "Password1",
  "roleIds": ["<uuid>"],   // optional; empty -> no roles
  "profileTypeId": "<uuid>", // optional; links a profile type
  "isActive": true          // optional, default true
}
```

### PATCH `/users/:id` body

Any subset of the POST body. Setting `password` re-hashes it; setting
`roleIds` replaces the user's role set; setting `profileTypeId` replaces
the user's profile type (pass `null` or omit to clear it).

## Behavioral notes

### GET `/users`

Query params: `page` (default 1), `limit` (default 20, max 100), `search`
(ILIKE match on first name / last name / email).

Response:

```json
{
  "items": [ { "id": "...", "email": "...", "roles": [...], "createdAt": "..." } ],
  "total": 2,
  "page": 1,
  "limit": 20
}
```

### POST `/users` body

```json
{
  "firstName": "Bob",
  "lastName": "Smith",
  "email": "bob@example.com",
  "password": "Password1",
  "roleIds": ["<uuid>"],   // optional; empty -> no roles
  "isActive": true          // optional, default true
}
```

Admin-created users are NOT auto-logged-in (no tokens are issued).
`passwordHash`, `refreshTokenHash`, `refreshTokenExpiresAt` are never returned.

### PATCH `/users/:id` body

Any subset of the POST body. Setting `password` re-hashes it; setting
`roleIds` replaces the user's role set.

## Behavioral notes

- Emails are lowercased and unique (`409` on duplicates via DB unique constraint
  surfaced as a conflict error).
- Deleting a user cascades to `user_roles` and `password_reset_tokens`.
- Users with the `superadmin` or `systemadmin` role cannot be deleted (`403 Forbidden`).
- Users with the `systemadmin` role cannot have their roles changed (`403 Forbidden`).
- User self-service endpoints (profile, change password) live in the auth
  module (`/auth/me`, `/auth/change-password`).

## Files

- `src/users/entities/user.entity.ts`
- `src/users/users.service.ts`, `src/users/users.controller.ts`
- `src/users/dto/{create-user,update-user,find-users-query}.dto.ts`

## Agent checklist

- [ ] Admin lists users with pagination + search
- [ ] Non-admin → `403`; missing role/permission enforced
- [ ] Create, update, delete a user work; delete → `204`
- [ ] `GET /users/:id` for a nonexistent id → `404`
- [ ] Response never contains `passwordHash` / `refreshTokenHash`
