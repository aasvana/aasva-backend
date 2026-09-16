# 11 - Multi-Tenancy (Tenants & Data Isolation)

Module: `src/tenants/` + `src/common/tenant/`

Every piece of tenant-owned data (users, company settings, confirmation
vouchers) is scoped by a `tenant_id` FK. All API access runs through a
per-request tenant context so a tenant can only ever read/write its own rows.

## Model

**Strategy: shared schema + `tenant_id` discriminator column.** One database,
one table per entity; each row carries a `tenant_id` FK to `tenants`. No
per-tenant databases or schemas (fits the serverless/Vercel PostgreSQL setup).

### `tenants`

`id uuid PK`, `name` (varchar 255, NOT NULL), `slug` (text, nullable, unique
index), `subscription_status` (varchar 20, default `'trial'`),
`subscription_plan` (varchar 50, nullable), `subscription_paid_until`
(timestamptz, nullable), `created_at`, `updated_at`.

A default tenant is inserted by migration `1760000000017`:

| Field | Value |
| --- | --- |
| id | `00000000-0000-4000-8000-000000000001` |
| name | `Aasvana` |
| slug | `aasvana` |
| subscription_status | `active` |

Migration `1760000000018` adds the subscription columns, backfills every
existing tenant as `trial` with `paid_until = now() + 90 days`, and sets the
default tenant to `active`/`lifetime` (see `12-subscriptions.md`).

Backfill statements in the same migration assign **all pre-existing rows** in
`users`, `company_settings`, and `confirmation_vouchers` to this tenant.

> **Backfilled rows share the default tenant.** Any accounts that existed before
> `1760000000017` end up in the default tenant together, so they share its
> single `company_settings` row (one edit visible to all of them). To give a
> backfilled user their **own** tenant (as registration/OAuth would have):
>
> 1. Insert a row into `tenants` (`gen_random_uuid()`, unique `slug`).
> 2. Update `users.tenant_id` for that user's email to the new tenant.
> 3. Insert a fresh `company_settings` row for the new tenant (copy
>    `COMPANY_DEFAULTS` from `src/company/company.service.ts`), or leave it to
>    `getOrCreate()` on first access.
>
> Run the same steps on every environment that holds that user. Vouchers keyed
> to that user's `agent_name` must be re-pointed to the new tenant manually if
> they belong to them.

### Tenant-owned tables

| Table | `tenant_id` | Uniqueness |
| --- | --- | --- |
| `users` | NOT NULL, FK cascade-delete from tenant | `email` remains **globally** unique (login is email-based) |
| `company_settings` | NOT NULL, FK cascade-delete | `UNIQUE (tenant_id)` — one row per tenant |
| `confirmation_vouchers` | NOT NULL, FK cascade-delete | `UNIQUE (tenant_id, voucher_no)` — voucher numbers repeatable across tenants |

`roles`, `permissions`, `modules`, `profile_types`, `user_details`,
`password_reset_tokens`, and `oauth_identities` are **not** tenant-scoped
(user_details / password_reset_tokens / oauth_identities inherit scoping
indirectly through their `user_id` FK).

### How a tenant is created

- **Registration** (`POST /auth/register`): a private tenant named
  `dto.tenantName` (optional) or `${firstName} ${lastName} Company` is created
  and the new user is attached to it. The user becomes the first member.
- **Google OAuth**: a new (previously unregistered) OAuth user gets the same
  treatment — a private tenant from their name.
- **Company onboarding** (`POST /company/onboarding`): on first signup the
  frontend's `/onboarding/company` step renames that private tenant to the
  company name the user enters (via `TenantsService.rename`, which also
  regenerates the slug) and upserts the tenant's `company_settings` row. The
  tenant's *identity* therefore comes from the company profile, not the
  person's name.
- **First read** of `/company` (`CompanyService.getOrCreate`) seeds a new
  tenant's `company_settings` row with `COMPANY_DEFAULTS`, using the **tenant
  name** as the company `name` (so a freshly-renamed onboarding tenant is
  already branded Aasvana until the user edits it).
- The bootstrap admin (from `npm run seed`) and the seeded superadmins live in
  the **default** tenant.

## Tenant context (`src/common/tenant/`)

- `tenant-context.service.ts` — `TenantContextProvider` holds an
  `AsyncLocalStorage<TenantId>`; exposes `require()` (throws `403 Forbidden
  resource` when no tenant is active) and `get()`.
- `tenant.interceptor.ts` — `TenantInterceptor` (registered as a **global
  interceptor**, `APP_INTERCEPTOR`, in `AppModule`): reads
  `request.user.tenantId` (set by `JwtStrategy`) and runs the request inside
  `tenantContext.run(tenantId, ...)`. Public/unauthenticated routes (no
  `req.user`) skip the context entirely.
- `tenant.module.ts` — `@Global()`, imports `TypeOrmModule.forFeature([Tenant])`
  (so `TenantInterceptor` can resolve the tenant repository) and provides
  `TenantContext` plus the global `APP_INTERCEPTOR` `TenantInterceptor`. The
  `TenantContextProvider` must be a **single shared instance**, so it is
  provided by a global module and injected everywhere (do not create a second
  instance in a feature module).

Because guards run before interceptors, `req.user.tenantId` is always present
for authenticated routes by the time the interceptor runs.

**Payment gate.** The interceptor additionally rejects requests from tenants
whose subscription is not active (`active`, or `trial` with
`subscription_paid_until` in the future) with `402 Payment Required`, unless
the route is exempt (`@SkipSubscriptionGate()`), the caller is
`systemadmin`/`superadmin`, or the tenant is the default `Aasvana` tenant. See
`12-subscriptions.md`.

## Service-layer rules

- **`TenantContext.require()` inside the service** — `CompanyService` and
  `ConfirmationVouchersService` call `this.tenantContext.require()` and use it
  in every `where`/`andWhere`. The controllers stay unchanged.
- **Explicit `tenantId` arguments** — `UsersService` methods take `tenantId`
  explicitly because `create()` is also invoked from public auth flows (which
  run without an authenticated user context). All reads/updates are filtered by
  the caller's tenant.
- **Platform admin escape hatch** — users whose JWT roles include
  `systemadmin` or `superadmin` bypass the tenant filter in `UsersService`
  (`isPlatformAdmin(roles)`, see `04-users-module.md`): `GET /users` lists users
  from every tenant (each with a nested `tenant` object) and the
  `findByIdScoped`-backed user routes operate across tenants. All other roles
  remain strictly tenant-scoped.
- **Cross-tenant lookups → `404`** (not `403`): a scoped `findById`, `update`,
  or `delete` for an id that exists in another tenant simply finds nothing and
  surfaces as a normal missing-resource `404`.

## JWT

`tenantId` is a first-class JWT claim. `JwtStrategy.validate` / `JwtUser`
(`common/decorators/current-user.decorator.ts`) carry `id, email, tenantId,
roles, permissions`. `SafeUser` includes `tenantId`.

> **Token rotation is required after deploying this migration.** Tokens issued
> before `1760000000017` have no `tenantId` claim; the interceptor skips them,
> so any protected endpoint falls back to `TenantContext.require()` → `403`.
> Users simply log in again (or the frontend's silent refresh picks up a fresh
> token).

## Frontend

`useAuthStore` persists `user.tenantId` and a `lastTenantId`. When `setAuth`
sees the tenant change, it resets `useCompanyStore` and `useCvStore` so the
previous tenant's cached data never leaks into the new session.
Tenant-scoped TanStack Query keys: `companyQueryKeys.all(tenantId)` and
`cvQueryKeys.all(tenantId)` (see `docs/guides/stores.md`).

## Files

- `src/tenants/entities/tenant.entity.ts`
- `src/tenants/tenants.constants.ts` (`DEFAULT_TENANT_ID`, `DEFAULT_TENANT_NAME`, subscription helpers)
- `src/tenants/tenants.service.ts` (`create`, `findById`, `rename`, `getSubscription`, `setSubscription`), `src/tenants/tenants.module.ts`
- `src/common/tenant/tenant-context.service.ts`, `tenant.interceptor.ts`, `tenant.module.ts`
- `src/common/decorators/skip-subscription-gate.decorator.ts`
- `src/database/migrations/1760000000017-AddTenantScoping.ts`, `1760000000018-AddTenantSubscription.ts`
- `src/auth/auth.service.ts` (includes `subscription` in auth/me responses)
- Users module: signature `subscription` PATCH, cross-tenant user list (see `04-users-module.md`)
- Tenancy-changed entities/services: `src/users/entities/user.entity.ts`,
  `src/users/users.service.ts`, `src/company/entities/company-setting.entity.ts`,
  `src/company/company.service.ts`, `src/travel/entities/confirmation-voucher.entity.ts`,
  `src/travel/confirmation-vouchers.service.ts`
- `src/auth/auth.service.ts`, `src/auth/dto/register.dto.ts`,
  `src/auth/strategies/{jwt,google}.strategy.ts`, `src/common/decorators/current-user.decorator.ts`

## Agent checklist

- [ ] Register creates a private tenant (custom `tenantName` used when given) with a 90-day `trial` subscription
- [ ] `POST /company/onboarding` renames the tenant to the company name and upserts its settings row
- [ ] `getOrCreate` seeds a new tenant's company row from the **tenant name**
- [ ] `tenantId` present in JWT claims and `SafeUser`
- [ ] Users in tenant A never see users / vouchers / company settings of tenant B (cross-tenant id lookups → `404`), except `systemadmin`/`superadmin` who get a cross-tenant user list via `GET /users`
- [ ] Inactive subscriptions → `402`; default tenant + platform roles exempt (`12-subscriptions.md`)
- [ ] `company_settings` stays one-row-per-tenant (`UNIQUE (tenant_id)`)
- [ ] A `voucher_no` used in tenant A can be used again in tenant B (`UNIQUE (tenant_id, voucher_no)`)
- [ ] New OAuth users land in their own tenant
- [ ] Pre-`1760000000017` rows are backfilled to the default tenant; old JWTs get `403` until refreshed