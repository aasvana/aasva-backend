# 09 - Travel Module (Confirmation Vouchers)

Module: `src/travel/` — CRUD API for travel confirmation vouchers, replacing a
former frontend-localStorage feature.

All routes live under `/vouchers`, are protected by `@Permissions(...)`, and are
granted (via seed migration `1760000000012`) to `systemadmin`, `superadmin`, and
`admin` roles.

## Schema

### `confirmation_vouchers`

`id uuid PK`, `tenant_id` (NOT NULL FK->tenants, indexed), `voucher_no`
(indexed, **no longer globally unique**), `customer_name` (indexed),
`company_name` (varchar 255, default `''`), `agent_name` (varchar 255, default
`''`), `payment_type` (varchar 64, default `''`),
`journey_date` (timestamptz, nullable, indexed), `data` (JSONB),
`created_at`, `updated_at`.

**Uniqueness:** `UNIQUE (tenant_id, voucher_no)` — a voucher number can be
reused across tenants but must be unique within a tenant. Before
migration `1760000000017` this was `UNIQUE (voucher_no)` (see
`11-multi-tenancy.md`).

The `data` JSONB column stores the **full form payload** (customer info, flight
legs, travellers, hotels, itinerary) — the entity's denormalized columns are a
thin projection of `data` for list/search/sort and are written together with it:

- `customer_name` ← `data.customerName`
- `company_name` ← `data.companyName`
- `agent_name` ← `data.agentName` (optional — empty string when absent)
- `payment_type` ← `data.paymentType`
- `journey_date` ← `data.journeyDate`

## Endpoints (admin roles only)

| Method | Path          | Permission        | Description                              |
| ------ | ------------- | ----------------- | ---------------------------------------- |
| GET    | `/vouchers`   | `vouchers:read`   | paginated list + search + sort           |
| GET    | `/vouchers/:id` | `vouchers:read` | single voucher (`404` if missing)       |
| POST   | `/vouchers`   | `vouchers:create` | create a voucher                         |
| PATCH  | `/vouchers/:id` | `vouchers:update` | partial update                          |
| DELETE | `/vouchers/:id` | `vouchers:delete` | delete (`204`)                          |

### GET `/vouchers`

Query params: `page` (default 1), `limit` (default 20, max 1000), `search`
(ILIKE on `voucherNo` / `customerName` / `companyName` / `agentName` /
`paymentType`), `sortBy` (`voucherNo` | `customerName` | `companyName` |
`paymentType` | `journeyDate` | `updatedAt`, default `updatedAt`), `sortOrder`
(`asc` | `desc`, default `desc`, applied `NULLS LAST`).

Response:

```json
{
  "items": [
    {
      "id": "<uuid>",
      "voucherNo": "CV-1",
      "customerName": "Alice",
      "companyName": "Acme",
      "agentName": "Sekhar Rao",
      "paymentType": "Cash",
      "journeyDate": "2026-06-01T00:00:00.000Z",
      "data": { "...full form payload..." },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### POST `/vouchers` body

```json
{
  "voucherNo": "CV-1",
  "data": {
    "voucherNo": "CV-1",
    "...fields of VoucherDataDto..."
  }
}
```

- `data.voucherNo` must equal the top-level `voucherNo` → else `400`
  (`voucherNo must match data.voucherNo`).
- Duplicate `voucherNo` → `409 Conflict`.
- `data.agentName` is `@IsOptional` (max 255 chars); it flows into the
  denormalized `agent_name` column.
- Dates (`bookingDate`, `journeyDate`, flight/hotel dates) are ISO strings
  and validated with `IsDateString`; amounts match `^\d+(\.\d{1,2})?$`;
  phones/mobile are 10 digits.

### PATCH `/vouchers/:id` body

Any subset of the POST body (e.g. `{ "data": { ... } }`, `{ "voucherNo":
"CV-2" }`, or both). Omitting both is a no-op. Changing `voucherNo` updates the
top-level column **and** rewrites `data.voucherNo`; a duplicate → `409`.

## Behavioral notes

- `DELETE /vouchers/:id` → `204`; `404` if the id does not exist.
- `journeyDate` is stored as `null` when `data.journeyDate` is absent.
- List/sort only ever touch the denormalized columns + `data` for payload reads.
- **Column naming:** there is no global snake-case naming strategy in this
  backend, so every entity `@Column` that maps to a snake_case column must set
  `name:` explicitly (e.g. `voucher_no`, `customer_name`, `company_name`,
  `payment_type`, `journey_date`, `created_at`, `updated_at`). Omitting `name:`
  makes TypeORM emit camelCase identifiers (e.g. `"voucherNo"`) and every query
  against that column fails with `column ... does not exist` (42703).

## Files

- `src/travel/entities/confirmation-voucher.entity.ts`
- `src/travel/confirmation-vouchers.service.ts`, `src/travel/confirmation-vouchers.controller.ts`
- `src/travel/travel.module.ts`
- `src/travel/dto/{voucher-traveller,voucher-hotel,voucher-itinerary,voucher-data,create-confirmation-voucher,update-confirmation-voucher,find-vouchers-query}.dto.ts`
- `src/travel/dto/{create-itinerary-template,update-itinerary-template,create-package}.dto.ts`
- `src/database/migrations/1760000000011-CreateConfirmationVouchersTable.ts`
- `src/database/migrations/1760000000012-SeedTravelVouchersPermissions.ts`
- `src/database/migrations/1760000000015-AddAgentNameToConfirmationVouchers.ts`
- `src/database/migrations/1760000000017-AddTenantScoping.ts` (adds `tenant_id`, scopes uniqueness to `(tenant_id, voucher_no)`)
- Multi-tenancy model: `11-multi-tenancy.md`

## Agent checklist

- [ ] Admin roles list vouchers with pagination/search/sort
- [ ] Non-admin → `403`; missing role/permission enforced
- [ ] Create, update, delete work; delete → `204`
- [ ] `data.voucherNo !== voucherNo` on create/patch → `400`
- [ ] Duplicate `voucherNo` → `409`
- [ ] `GET /vouchers/:id` for a nonexistent id → `404`
- [ ] `data` JSONB and denormalized columns stay in sync on create/update
- [ ] `agentName` (`@IsOptional`) persists to `data` + `agent_name` and is searchable

## Package endpoints

Package management endpoints are exposed at `/packages`. `POST /packages`
rejects `price` and `status` (see `CreatePackageDto`); it accepts `subject` and
at least one `days` entry. Price and status default to `0` and `active`
respectively on creation. `PATCH /packages/:id` still accepts `price` and
`status` via `UpdateItineraryTemplateDto`.
