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
```

Defaults applied when fields are omitted: `active` → plan `monthly`,
`paid_until = now() + 30d`; `trial` → `paid_until = now() + 90d`; opaque
`paid_until` (ISO-8601) can be passed explicitly.

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
- The settings **Users** section is system-admin-only and shows the tenant
  subscription per user (status / plan / paid until) with **Mark Paid** /
  **Mark Unpaid** buttons alongside approval, profile, role, and module
  toggles. The sidebar `Users` item is restricted to `systemadmin`.

## Files

- `src/database/migrations/1760000000018-AddTenantSubscription.ts`
- `src/tenants/entities/tenant.entity.ts`, `src/tenants/tenants.constants.ts`,
  `src/tenants/tenants.service.ts`
- `src/common/tenant/tenant.interceptor.ts`, `src/common/tenant/tenant.module.ts`
- `src/common/decorators/skip-subscription-gate.decorator.ts`
- `src/auth/auth.service.ts` (`AuthResult` + `me()`), `src/auth/auth.controller.ts`
- `src/users/users.service.ts` (`setUserSubscription`), `src/users/users.controller.ts`,
  `src/users/users.module.ts`, `src/users/dto/update-user-subscription.dto.ts`

## Agent checklist

- [ ] Registering a user creates a `trial` tenant (`paid_until` + 90 days)
- [ ] Inactive subscription → `402` on protected endpoints; active/trial → allowed
- [ ] Default tenant + `systemadmin`/`superadmin` bypass the gate
- [ ] `@SkipSubscriptionGate()` routes stay reachable when revoked
- [ ] `PATCH /users/:id/subscription` marks the user's tenant paid/unpaid with sane defaults
- [ ] Login/refresh/`me` all return `subscription`
- [ ] `GET /users` items include the tenant's subscription fields
- [ ] Local + Neon both applied migration `1760000000018`