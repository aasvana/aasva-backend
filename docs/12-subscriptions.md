# 12 - Subscriptions (Tenant Payment Gate)

Module: `src/tenants/` (fields + service) + `src/common/tenant/tenant.interceptor.ts`
(gate) + `src/users/users.service.ts` (`PATCH /users/:id/subscription`).

A per-tenant subscription controls whether a tenant may use the application.
A tenant is **active** while their subscription is `active`, or while `trial` and
`subscription_paid_until` is still in the future. Otherwise every authenticated,
non-platform request to the API is rejected with `402 Payment Required`.

The **default tenant** (`Aasvana`) and callers carrying the `systemadmin` /
`superadmin` role are always exempt — platform admins must be able to manage
tenants whose own subscriptions are revoked.

## Schema (added by `1760000000018-AddTenantSubscription`)

`tenants` gains:

| Column | Type | Notes |
| --- | --- | --- |
| `subscription_status` | varchar(20) NOT NULL DEFAULT `'trial'` | `trial` / `active` / `inactive` |
| `subscription_plan` | varchar(50) NULL | e.g. `monthly`, `lifetime` |
| `subscription_paid_until` | timestamptz NULL | trial expiry or paid-until date |

Backfill: all existing tenants get `trial` with `paid_until = now() + 90 days`;
the default tenant `00000000-...-0001` becomes `active` / `lifetime` (nullable
`paid_until` = no expiry).

Updated `src/database/data-source.ts` must list the new migration; local and
Neon databases both need `npm run migration:run` (or the equivalent direct
DDL) applied.

## Constants & helpers (`src/tenants/tenants.constants.ts`)

- `TRIAL_DURATION_DAYS = 90` — default trial length for a new tenant.
- `SubscriptionStatus` — `'trial' | 'active' | 'inactive'`.
- `TenantSubscription` — `{ status, plan, paidUntil }` returned to the client.
- `isSubscriptionActive(sub)` — `active` → true; `trial` → paidUntil in the
  future; anything else → false.

## Tenant creation (`TenantsService.create`)

Every new tenant is created with `subscription_status = 'trial'` and
`subscription_paid_until = now() + TRIAL_DURATION_DAYS`. So a fresh signup can
use the app immediately for the 90-day trial (see `docs/flows/auth-onboarding.md`
and the frontend trial helper).

## The payment gate (`TenantInterceptor`)

`TenantInterceptor` (global `APP_INTERCEPTOR`, provided in the `@Global()`
`TenantModule` with a `TypeOrmModule.forFeature([Tenant])` import) does the
following for every authenticated request:

1. No `req.user` (public route) → pass through (no tenant context).
2. Default tenant, or `systemadmin`/`superadmin` role, or handler/controller
   marked `@SkipSubscriptionGate()` → run the context without checking payment.
3. Otherwise load the tenant's subscription and evaluate `isSubscriptionActive`;
   on failure throw `HttpException` `402 Payment Required`.

Everything else (running the `TenantContext`) is unchanged.

### `@SkipSubscriptionGate()`

`src/common/decorators/skip-subscription-gate.decorator.ts` — sets metadata
`SKIP_SUBSCRIPTION_GATE_KEY` on a handler or controller. Routes that must stay
reachable for a revoked tenant:

- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /company/onboarding`

exemptions must keep the app self-explanatory: an unpaid user can still confirm
their status (`/auth/me`), sign out, and finish the free company step.

## Subscription plans (`subscription_plans`, added by `1760000000019-AddSubscriptionPlansAndSubModules`)

Directly support a plan picker in the Users section. The migration creates the
`subscription_plans` table and seeds **five plans**:

| key | name | duration_days | price |
| --- | --- | --- | --- |
| `monthly` | Monthly | 30 | 49.00 |
| `biannually` | Bi-Annually | 182 | 249.00 |
| `annually` | Annually | 365 | 449.00 |
| `trial` | Trial | 90 | NULL |
| `lifetime` | Lifetime | NULL | 9999.00 |

`Employee`-facing API:

- `GET /plans` ($ `PlansController`, `Roles(ADMIN)` + `Permissions('users:read')`)
  returns the plans ordered by `duration_days` ascending (NULL → last), so the
  lifetime plan sorts after the finite ones.
- `PlansService.findByKey(key)` resolves a single plan by key; used by
  `UsersService.setUserSubscription` to derive duration/price.

`duration_days` is stored in the plan **row**, not in the tenant row — tenants
store only `subscription_plan` = plan **key** (`tenants.subscription_plan`).

## Marking a tenant paid / unpaid

`TenantsService.getSubscription(tenantId)` and
`TenantsService.setSubscription(tenantId, { status, plan, paidUntil })` read and
write the three columns.

Endpoint: `PATCH /users/:id/subscription` (admin routes, `users:update`). The
users module imports `TenantsModule`, and `UsersService.setUserSubscription`
resolves the target user (tenant-scoped by default, cross-tenant for platform
admins), then updates **the user's tenant**:

```json
{ "status": "active" }
{ "status": "inactive" }
{ "status": "trial", "plan": "trial" }
{ "status": "active", "plan": "annually" }
```

Duration resolution (`setUserSubscription`):

1. If `dto.plan` is provided → the plan row's `durationDays` (NULL for
   `lifetime`). Unknown plan keys fall through with a **30d** duration for
   `active` and **90d** for `trial`.
2. If `dto.plan` is omitted → `active` defaults to plan `monthly` (30d);
   `trial` keeps a null plan and falls back to 90d.
3. `paidUntil` = `now + durationDays` for `active` (lifetime → stays NULL =
   never expires) and `trial`; an explicit ISO-8601 `dto.paidUntil` always wins.

Because the platform-admin escape is role-based (not tenant-based), a platform
admin whose own tenant is inactive is still exempt at the gate, so they can
reactivate it — which the smoke test exercises.

## Response shape

`Session`/login/refresh/`me` responses now include the tenant subscription:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "...": "..." },
  "subscription": { "status": "trial", "plan": null, "paidUntil": "2026-12-15T07:37:19.869Z" }
}
```

`GET /auth/me` returns `{ "user": { ... }, "subscription": { ... } }`.

The cross-tenant `GET /users` list already joins `user.tenant`, so each item's
`tenant` object now carries `subscriptionStatus`, `subscriptionPlan`, and
`subscriptionPaidUntil` automatically (no extra join work).

## Frontend

- `useAuthStore` persists a `subscription` (`{ status, plan, paidUntil }`)
  threaded through `setAuth` / `restoreAuth` / `setSubscription`
  (`src/stores/AuthStore.ts`).
- `isSubscriptionActive()` (`src/helpers/pageAccess.ts`) mirrors the backend
  gate (platform roles bypass; missing subscription → allowed for
  legacy sessions) and drives the dashboard layout, which renders
  `<SubscriptionRequiredScreen />` instead of the app when inactive.
- The settings **Users** section is system-admin-only and uses a
  **drill-in list → detail layout** (see `docs/guides/settings.md`): a
  paginated, searchable user list (20/page via `GET /users?page=&limit=&search=`)
  that swaps to that user's account-detail view when clicked, with a
  **Back to users** button to return; the detail shows the
  tenant subscription — status badge, **Mark Paid / Mark Unpaid** toggle, a
  **plan picker** fed by `GET /plans`, and paid-until — alongside approval,
  profile, role, and module toggles plus per-module **sub-module chips**
  (`GET /modules.subModules` → `PATCH /users/:id/sub-modules`). The sidebar
  `Users` item is restricted to `systemadmin`.

## Sub-modules (`modules.sub_modules`, added by `1760000000019`)

Per-module sub-feature lists that the Users section presents as selectable
chips, stored per user in `user_details.details.subModules: Record<module, string[]>`:

- `roles/entities/module.entity.ts` gained a `sub_modules` jsonb column
  (default `[]`); `1760000000019` seeds a catalogue per module (Dashboard,
  Accounting, Auditing, Travel, Delivery, Healthcare, Store, Analytics,
  Customers, User Requests, Help Center, Teams Meet — mirroring the first-level
  sidebar nav item titles).
- `GET /modules` (`ModulesController`) returns `subModules` on each module.
- `PATCH /users/:id/sub-modules` (`users:update`, body
  `{ module: string, subModules?: string[] }`, DTO
  `UpdateUserSubModulesDto`) writes the full list for one module, **merging**
  with any previously stored sub-modules for other modules:
  `details.subModules = { ...existing, [module]: subModules }`.
- `updateUserDetail` deep-merges the `details` object instead of replacing it,
  so writing `moduleOverrides`/`subModules`/`profileTypeId` never clobbers the
  others (`details` in `UserDetailEntity` is nested JSONB).

## Files

- `src/database/migrations/1760000000018-AddTenantSubscription.ts`
- `src/database/migrations/1760000000019-AddSubscriptionPlansAndSubModules.ts`
- `src/tenants/entities/tenant.entity.ts`, `src/tenants/entities/subscription-plan.entity.ts`,
  `src/tenants/tenants.constants.ts`, `src/tenants/tenants.service.ts`,
  `src/tenants/plans.service.ts`, `src/tenants/plans.controller.ts`,
  `src/tenants/tenants.module.ts`
- `src/common/tenant/tenant.interceptor.ts`, `src/common/tenant/tenant.module.ts`
- `src/common/decorators/skip-subscription-gate.decorator.ts`
- `src/auth/auth.service.ts` (`AuthResult` + `me()`), `src/auth/auth.controller.ts`
- `src/users/users.service.ts` (`setUserSubscription`, `updateUserSubModules`,
  `updateUserDetail` deep-merge), `src/users/users.controller.ts`,
  `src/users/users.module.ts`, `src/users/dto/update-user-subscription.dto.ts`,
  `src/users/dto/update-user-sub-modules.dto.ts`
- `src/roles/entities/module.entity.ts` (`sub_modules` column)

## Agent checklist

- [ ] Registering a user creates a `trial` tenant (`paid_until` + 90 days)
- [ ] Inactive subscription → `402` on protected endpoints; active/trial → allowed
- [ ] Default tenant + `systemadmin`/`superadmin` bypass the gate
- [ ] `@SkipSubscriptionGate()` routes stay reachable when revoked
- [ ] `GET /plans` returns the five seeded plans ordered by `duration_days`
- [ ] `PATCH /users/:id/subscription` marks the user's tenant paid/unpaid; plan-key durations apply (annually +365d, monthly +30d, trial +90d, lifetime → null `paid_until`)
- [ ] `PATCH /users/:id/sub-modules` merges sub-modules per module; `updateUserDetail` deep-merges `details`
- [ ] `GET /modules` items include `subModules`
- [ ] Login/refresh/`me` all return `subscription`
- [ ] `GET /users` items include the tenant's subscription fields
- [ ] Local + Neon both applied migrations `1760000000018` and `1760000000019`