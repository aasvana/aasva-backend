# 06 - Database & Migrations

PostgreSQL via TypeORM. Schema is managed exclusively through **migrations**
(`synchronize: false` in both app and CLI config).

## Connection

- Runtime connection: `src/config/database-config.service.ts`
  (`TypeOrmModule.forRootAsync`, `autoLoadEntities`).
- CLI connection (migrations + seeds): `src/database/data-source.ts`
  (explicit entity/migration lists).

Both read the same `DB_*` env vars.

## Schema

### `users`
`id uuid PK`, `first_name`, `last_name`, `email` (unique), `password_hash`
(not selected by default), `refresh_token_hash`, `refresh_token_expires_at`,
`is_active`, `is_email_verified`, `created_at`, `updated_at`.

### `user_details`
`id uuid PK`, `user_id` (unique FK→users, cascade delete), `profile_type_id`
(nullable FK→profile_types), `date_of_birth`, `phone`, `address`, `details`
(JSONB), `created_at`, `updated_at`.

### `roles`
`id uuid PK`, `name` (unique), `description`, timestamps.

### `permissions`
`id uuid PK`, `name` (unique), `description`, timestamps.

### `user_roles`
Join: `user_id` FK→users (cascade), `role_id` FK→roles (cascade), PK(`user_id`,`role_id`).

### `role_permissions`
Join: `role_id` FK→roles (cascade), `permission_id` FK→permissions (cascade), PK(`role_id`,`permission_id`).

### `profile_types`
`id uuid PK`, `name` (unique), `key` (unique), `description`, `created_at`,
`updated_at`.

### `password_reset_tokens`
`id uuid PK`, `user_id` FK→users (cascade), `token_hash` (unique, sha256),
`expires_at`, `used_at`, `created_at`. Index on `user_id`.

## Migrations (in `src/database/migrations/`)

1. `1760000000000-CreateAuthTables` — creates all tables, constraints, indexes.
2. `1760000000001-SeedRolesAndPermissions` — seeds `systemadmin`, `superadmin`, `admin`, `user` roles and the
   permission catalog; grants every permission to `systemadmin`, `superadmin`, and `admin`.
3. `1760000000003-SeedSuperadminUsers` — seeds two permanent superadmin accounts
   (`techaquib@gmail.com`, `developer@aasvana.com`) with all roles.
4. `1760000000004-SeedModules` — creates `modules` table, `role_modules` join table,
   seeds 12 modules (matching the frontend), and assigns all modules to
   `systemadmin`, `superadmin`, and `admin`.
 5. `1760000000005-RemoveSuperadminFlag` — drops the redundant `is_superadmin`
    column from `users` (superadmin status is now role-based).
 6. `1760000000006-SeedProfileTypes` — creates `profile_types` table and seeds
    10 profile types (doctor, manager, accountant, receptionist, travel-agent,
    delivery-partner, store-manager, ecommerce-user, healthcare-admin, systemadmin).
 7. `1760000000007-AddProfileTypeConfigAndUserModuleOverrides` — adds `config`
    JSONB to `profile_types` and `module_overrides` JSONB to `users`.
 8. `1760000000008-CreateUserDetailsTable` — creates `user_details` table with
    `date_of_birth`, `phone`, `address`, `details` JSONB; migrates existing
    `users.module_overrides` into `user_details.details`.
 9. `1760000000009-MoveProfileTypeToUserDetails` — moves `profile_type_id` from
    `users` to `user_details`; migrates existing data.

TypeORM 1.x derives each migration's timestamp from the **last 13 digits of the
class name** — keep that suffix when adding migrations
(`npx nest g migration` is not wired; use `npm run migration:generate` or hand-write).

## Commands

```bash
npm run migration:run        # apply pending
npm run migration:show       # status
npm run migration:revert     # undo last (calls `down()`)
# generate a new migration from entity changes (needs a reachable DB):
npm run migration:generate -- src/database/migrations/AddSomething
```

## Seeds (`npm run seed`)

`src/database/seeds/run-seeds.ts` → `seedAdminUser()`.
Creates the bootstrap admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
(defaults: `admin@example.com` / `ChangeMe123!`). Idempotent (skips existing).

## Notes / gotchas

- Postgres >= 13 required (`gen_random_uuid()` is built-in).
- Query-builder fetches do **not** apply `eager` relations automatically —
  `UsersService` explicitly `leftJoinAndSelect`s roles/permissions where needed.
- `password_hash` / `refresh_token_hash` are `select: false`; they must be
  re-added with `.addSelect(...)` when needed (login, change-password, refresh).

## Agent checklist

- [ ] `npm run migration:run` on a fresh DB leaves `migrations`, all tables, indexes
- [ ] Reverting (`migration:revert`) drops tables in the right order
- [ ] Seed is idempotent (run twice → no duplicate admin, no error)
- [ ] Entity column names match migration column names exactly
  (see the `firstName`/`first_name` naming caveat above)
