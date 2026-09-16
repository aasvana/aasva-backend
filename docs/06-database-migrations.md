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
`id uuid PK`, `user_id` FK->users (cascade), `token_hash` (unique, sha256),
`expires_at`, `used_at`, `created_at`. Index on `user_id`.

### `tenants` (multi-tenancy — see [11-multi-tenancy.md](11-multi-tenancy.md))

`id uuid PK`, `name` (varchar 255, NOT NULL), `slug` (text, nullable, unique
index), `subscription_status` (varchar 20, default `'trial'`),
`subscription_plan` (varchar 50, nullable), `subscription_paid_until`
(timestamptz, nullable), `created_at`, `updated_at`. A default tenant
(`00000000-0000-4000-8000-000000000001`, "Aasvana", slug `aasvana`) is created by
migration `1760000000017`; its subscription (`active`/`lifetime`) plus the
subscription columns for all tenants are added by `1760000000018` (see
`12-subscriptions.md`).

Tenant-owned tables carry a NOT NULL `tenant_id` FK (`ON DELETE CASCADE`) back
to `tenants`, indexed:

- `users.tenant_id` — index `IDX_users_tenant_id`; `users.email` stays
  **globally** unique.
- `company_settings.tenant_id` — unique `UQ_company_settings_tenant`, so a
  tenant has exactly **one** settings row.
- `confirmation_vouchers.tenant_id` — index
  `IDX_confirmation_vouchers_tenant_id`; uniqueness changed from
  `UNIQUE (voucher_no)` to `UNIQUE (tenant_id, voucher_no)`.

So `company_settings` is a per-tenant singleton rather than a global one, and
voucher numbers are only unique within a tenant.

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
 10. `1760000000017-AddTenantScoping` — creates `tenants`, inserts the default
    tenant, adds `tenant_id` to `users`/`company_settings`/`confirmation_vouchers`,
    backfills existing rows to the default tenant, tightens
    `company_settings` to one row per tenant, and scopes voucher uniqueness to
    `(tenant_id, voucher_no)`. See `11-multi-tenancy.md`.
 11. `1760000000018-AddTenantSubscription` — adds `subscription_status`,
    `subscription_plan`, and `subscription_paid_until` to `tenants`, backfills
    existing tenants as `trial` (paid until `now() + 90d`), and sets the default
    tenant to `active`/`lifetime`. See `12-subscriptions.md`.
 12. `1760000000019-AddSubscriptionPlansAndSubModules` — creates
    `subscription_plans` and seeds five plans (`monthly`/`biannually`/`annually`/
    `trial`/`lifetime`); adds `modules.sub_modules` jsonb and seeds the per-module
     sub-module catalogue. See `12-subscriptions.md`.
 13. `1760000000020-AddInvoicesSubModule` — adds `Invoices` to the existing
     Accounting sub-module catalogue for databases that already ran the seed.

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
Since `1760000000017`, the admin lands in the **default** tenant
(`DEFAULT_TENANT_ID`).

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
