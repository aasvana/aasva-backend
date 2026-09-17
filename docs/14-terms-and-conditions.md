# 14 - Terms and Conditions

Module: `src/terms/` — tenant-scoped Terms and Conditions management and the
immutable terms snapshot stored on every Confirmation Voucher.

All routes require an authenticated tenant member and are protected by
`@Permissions(...)`. Migration `1760000000032` grants `terms:read`,
`terms:create`, `terms:update`, and `terms:delete` to `systemadmin`,
`superadmin`, and `admin`. Permission changes take effect on the next
login or token refresh.

## Schema

### `terms_and_conditions`

`id uuid PK`, `tenant_id` (NOT NULL FK->tenants `ON DELETE CASCADE`, indexed),
`title` (varchar 255, nullable), `content` (text, NOT NULL), `sort_order`
(integer, default `0`; indexed with `tenant_id` as
`IDX_terms_conditions_tenant_sort`), `is_active` (boolean, default `true`),
`created_by` (uuid, nullable, FK->users `ON DELETE SET NULL`), `created_at`,
`updated_at`.

Terms are never shared across tenants. Each tenant receives its own copies of
the defaults and can edit, activate, deactivate, delete, or reorder them
without affecting any other tenant.

### `confirmation_vouchers.terms_snapshot`

`terms_snapshot` (JSONB, NOT NULL, default `'[]'::jsonb`) stores the ordered
active terms in effect when the voucher record was created:

```json
[
  {
    "id": "<term uuid>",
    "title": "Cancellation by the traveller",
    "content": "...",
    "sortOrder": 13
  }
]
```

Voucher `PATCH` requests preserve the existing snapshot. A snapshot is written
once at voucher creation and is not recalculated on later updates, previews,
or downloads.

## Default terms

There are 27 seeded defaults, defined in `src/terms/default-terms.ts`:

- Booking confirmation, payment, price basis, inclusions and exclusions
- Hotels, meals, flights, transfers, documents, health, insurance
- Amendments, traveller and supplier cancellations, no-show, refunds
- Force majeure, itinerary changes, supplier terms, children, conduct, luggage
- Complaints, voucher validity, price and tax changes, acceptance and jurisdiction

Seeding behavior:

- `TermsService.seedDefaultTerms(tenantId)` inserts the defaults only when the
  tenant has no terms rows. It is idempotent for tenants that already have terms.
- `TenantsService.create()` calls this seeder for every newly created tenant,
  including registration and OAuth tenant creation.
- Migration `1760000000033` seeds defaults for every tenant that has none and
  backfills empty snapshots on pre-existing vouchers from that tenant’s active
  terms. Existing voucher snapshots are otherwise untouched.

## Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/terms-conditions` | `terms:read` | list tenant terms ordered by `sortOrder`, then `createdAt` |
| GET | `/terms-conditions?active=true` | `terms:read` | list only active tenant terms |
| POST | `/terms-conditions` | `terms:create` | create a term; defaults to inactive only when requested, otherwise active and appended after the current maximum order |
| PATCH | `/terms-conditions/reorder` | `terms:update` | replace the full tenant order with `{ "ids": [...] }` |
| PATCH | `/terms-conditions/:id` | `terms:update` | update title, content, order, or active status |
| DELETE | `/terms-conditions/:id` | `terms:delete` | delete (`204`) |

### POST `/terms-conditions` body

```json
{
  "title": "Cancellation by the traveller",
  "content": "...",
  "sortOrder": 13,
  "isActive": true
}
```

`title` and `sortOrder` are optional. An omitted title is stored as `NULL`; an
omitted order is appended after the tenant’s current maximum. `isActive`
defaults to `true`.

### PATCH `/terms-conditions/:id` body

Any subset of the POST body. Setting `"isActive": false` deactivates a term
for future vouchers; it does not alter snapshots already stored on vouchers.

### PATCH `/terms-conditions/reorder` body

```json
{
  "ids": ["<term-1>", "<term-2>", "<term-3>"]
}
```

The list must contain every tenant term ID exactly once. Positions are
renumbered sequentially from zero.

## Tenant isolation

Every query is scoped by `tenantId`. Cross-tenant IDs resolve as missing
resources (`404`). Terms are cascade-deleted when their tenant is deleted.

## Files

- `src/terms/entities/term.entity.ts` (`Term`, `TermSnapshot`)
- `src/terms/default-terms.ts`
- `src/terms/terms.service.ts`, `src/terms/terms.controller.ts`, `src/terms/terms.module.ts`
- `src/terms/dto/{create-term,update-term,find-terms-query,reorder-terms}.dto.ts`
- `src/terms/terms.service.spec.ts`
- `src/travel/entities/confirmation-voucher.entity.ts`
- `src/travel/confirmation-vouchers.service.ts`
- `src/tenants/tenants.service.ts`, `src/tenants/tenants.module.ts`
- `src/database/migrations/1760000000031-CreateTermsAndConditions.ts`
- `src/database/migrations/1760000000032-SeedTermsPermissions.ts`
- `src/database/migrations/1760000000033-SeedDefaultTermsAndConditions.ts`
- `src/database/migrations/1760000000034-AddTermsAndConditionsSubModule.ts`

## Agent checklist

- [ ] Tenant A cannot list, read, update, delete, or reorder tenant B terms
- [ ] New tenants receive all 27 defaults
- [ ] Existing tenants without terms receive defaults once; tenants with terms are untouched
- [ ] Creating a voucher stores the tenant’s ordered active terms once
- [ ] Updating a voucher preserves its existing snapshot
- [ ] Deactivating, editing, deleting, or reordering tenant terms does not change existing voucher snapshots
- [ ] Reorder rejects duplicates, unknown IDs, and incomplete ID sets
- [ ] Non-privileged users receive `403` from protected terms routes
