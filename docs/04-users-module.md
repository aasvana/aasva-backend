# 04 - Users Module

Module: `src/users/` — admin CRUD for users.

Protected by `@Roles(Role.ADMIN)` at the controller level, plus
`@Permissions(...)` per route. (systemadmin, superadmin, and admin all pass.)

## Schema

### `users`
`id uuid PK`, `tenant_id` (NOT NULL FK->tenants, indexed), `first_name`,
`last_name`, `email` (unique globally), `password_hash`
(not selected by default), `refresh_token_hash`, `refresh_token_expires_at`,
`is_active`, `is_email_verified`, `created_at`, `updated_at`.

All admin-originated queries (list, detail, update, delete, module overrides)
are filtered by the caller's `tenantId` — a plain `admin` in tenant A never
sees or can modify a user in tenant B (cross-tenant lookups surface as `404`).
User rows are created within the caller's tenant (`POST /users`) or within a
fresh private tenant (public registration — see `11-multi-tenancy.md`).

**Platform admins see everyone.** Callers whose JWT roles include
`systemadmin` or `superadmin` bypass the tenant filter on all of the above
operations: `GET /users` lists users across every tenant (each item includes a
nested `tenant` object — `id`, `name`, `slug` — so the UI can show where a
user belongs), and `findByIdScoped`-backed routes (`/users/:id`, `PATCH`,
`DELETE`, `/user-details/:userId`) operate across tenants too. `DELETE` for a
platform admin still refuses to touch `superadmin`/`systemadmin` users, and
`PATCH /users/:id` still refuses to change a `systemadmin` user's roles.

### `user_details`
`id uuid PK`, `user_id` (unique FK→users, cascade delete), `date_of_birth`,
`phone`, `address`, `details` (JSONB), `created_at`, `updated_at`.

The `details` JSONB column stores:
- `profileTypeId` — the user's profile type UUID
- `moduleOverrides` — `{ add: string[], remove: string[] }` for per-user module customization
- `subModules` — `Record<moduleTitle, string[]>` of the user's per-module sub-module selections (used by the Users section's sub-module chips; see `05-roles-module.md` / `12-subscriptions.md`)

`updateUserDetail` **deep-merges** the `details` object key-by-key instead of
replacing the whole JSONB value, so any single writer
(`moduleOverrides`, `subModules`, `profileTypeId`) never clobbers the others.

### Effective modules on user objects

Login/register/refresh/me payloads (and admin list/`GET /users/:id`) compute an
**effective module title list** on the fly: `profile_type.config.modules` (or
the role-modules when a profile type is unset) adjusted by the user's
`details.moduleOverrides` (add/remove). Auth returns it as `SafeUser.modules`;
the frontend applies it in `setAuth`/`restoreAuth`/`setUser`/
`getNextOnboardingRoute()`, so module access granted/revoked via
`PATCH /users/:id/modules` reflects in the target account on its next login or
silent refresh. The user queries (`buildUserQuery`, `findById`,
`findByIdWithSensitiveFields`, login/refresh builders) all load the `ProfileType`
row via the correlated join on `(detail.details->>'profileTypeId')`.

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
| PATCH  | `/users/:id/subscription` | `users:update` | mark the user's tenant subscription paid/unpaid |
| PATCH  | `/users/:id/sub-modules` | `users:update` | full-list write of one module's sub-modules (merge-safe) |

### PATCH `/users/:id/subscription`

Marks the **tenant** the user belongs to as paid (`active`), unpaid
(`inactive`), or `trial`. Body: `{ "status", "plan"?, "paidUntil"? }` (ISO-8601
for `paidUntil`). Plan keys resolve against `subscription_plans`
(`GET /plans`, see `12-subscriptions.md`) for the duration: `monthly` +30d,
`biannually` +182d, `annually` +365d, `lifetime` → `paid_until` stays NULL
(never expires), `trial` +90d. Omitted `plan` defaults to `monthly` for
`active`. See `12-subscriptions.md` for the payment gate this drives.

### PATCH `/users/:id/sub-modules`

Body: `{ "module": "<module title>", "subModules": ["<sub title>", ...] }`
(`subModules` optional). Writes the **full list** for that one module into
`details.subModules[module]`, merging with sub-modules already stored for
other modules. The catalogue the UI renders comes from `GET /modules`
(`subModules` field, seeded by migration `1760000000019`).

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

Tenant scoping: plain `admin`/`user` callers only see users of their own
tenant; `systemadmin`/`superadmin` callers see all tenants. In the
cross-tenant response each user item carries its `tenantId` and a nested
`tenant: { id, name, slug }` object (`tenant` is `null`/absent in
tenant-scoped responses).

Response:

```json
{
  "items": [ { "id": "...", "email": "...", "tenantId": "...", "tenant": { "id": "...", "name": "...", "slug": "..." }, "roles": [...], "createdAt": "..." } ],
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
- `src/users/dto/{create-user,update-user,find-users-query,update-user-subscription,update-user-sub-modules}.dto.ts`
- `src/tenants/plans.service.ts` (plan-key → duration used by `setUserSubscription`)

`isPlatformAdmin(roles)` (exported from `users.service.ts`) drives the
cross-tenant escape hatch; the controller passes `currentUser.roles` into
every tenant-scoped service method.

## Agent checklist

- [ ] Admin lists users with pagination + search
- [ ] Non-admin → `403`; missing role/permission enforced
- [ ] Create, update, delete a user work; delete → `204`
- [ ] `GET /users/:id` for a nonexistent id → `404`
- [ ] Plain admin sees only their tenant; `systemadmin`/`superadmin` sees all tenants (with `tenant` object)
- [ ] Response never contains `passwordHash` / `refreshTokenHash`
