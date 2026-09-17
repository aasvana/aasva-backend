# 09 - Travel Module (Confirmation Vouchers & Packages)

Module: `src/travel/` — CRUD API for travel confirmation vouchers and the
reusable Package architecture that backs the itinerary part of a voucher.

All routes are protected by `@Permissions(...)` and granted (via seed migration
`1760000000012`) to `systemadmin`, `superadmin`, and `admin` roles. The one
exception is `GET /packages/public/by-slug/:slug`, which is `@Public()` and only
ever returns packages marked public + active (see below).

## Schema

### `confirmation_vouchers`

`id uuid PK`, `tenant_id` (NOT NULL FK->tenants, indexed), `voucher_no`
(indexed, **no longer globally unique**), `customer_name` (indexed),
`company_name` (varchar 255, default `''`), `agent_name` (varchar 255, default
`''`), `payment_type` (varchar 64, default `''`),
`journey_date` (timestamptz, nullable, indexed), `package_id` (uuid, nullable,
FK->packages ON DELETE SET NULL, indexed), `data` (JSONB),
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
- `package_id` ← top-level `packageId` on the create/update body (optional).

The itinerary inside `data` is a **snapshot copy** of the selected Package's
days at voucher-save time. Editing a Package later never alters existing
vouchers, and editing a voucher's itinerary never alters the Package.

### `packages` (was `itinerary_templates`)

`id uuid PK`, `tenant_id` (NOT NULL FK->tenants CASCADE), `name` (varchar 255,
was `subject`), `normalized_name` (varchar 255, lowercased, indexed with
`tenant_id` as `IDX_packages_tenant_name`), `slug` (varchar 255, tenant-scoped
unique via `IDX_packages_tenant_slug`), `short_description` (text),
`description` (text), `destination_id` (uuid, nullable, FK->destinations ON
DELETE SET NULL), `duration_days` (integer, default 1), `duration_nights`
(integer, default 0), `base_price` (numeric(12,2), default 0, was `price`),
`pricing_type` (varchar 20, default `PER_PERSON`; also `PER_PACKAGE`),
`status` (varchar 20, default `draft`; values `draft|active|inactive|archived`),
`is_public` (boolean, default false), `is_featured` (boolean, default false),
`created_by` (uuid, nullable, FK->users ON DELETE SET NULL),
`created_at`, `updated_at`.

Duplicate package names are allowed; the `slug` is generated from the name and
made unique per tenant (auto `-2`, `-3`, … suffix on collision). The
management API derives the slug when none is supplied.

Children (all `package_id` FK CASCADE and an `IDX_*_package_order` index on
`(package_id, sort_order)`):

- `package_days` (was `itinerary_template_days`): `day_order`, `subject`,
  `description`, `created_at`, `updated_at`. Ordered-only; never stores voucher
  dates or traveller counts.
- `package_images`: `image_url` (text), `alt_text`, `sort_order`, `is_cover`.
  Data-URL images passed to create/update are uploaded through ImageKit into the
  `/packages` folder and the returned URL is stored; when ImageKit is
  unconfigured/unreachable the data URL is kept.
- `package_inclusions` / `package_exclusions`: `title`, `sort_order`.

## Endpoints (admin roles only unless noted)

| Method | Path          | Permission        | Description                              |
| ------ | ------------- | ----------------- | ---------------------------------------- |
| GET    | `/vouchers`   | `vouchers:read`   | paginated list + search + sort           |
| GET    | `/vouchers/:id` | `vouchers:read` | single voucher (`404` if missing)       |
| POST   | `/vouchers`   | `vouchers:create` | create a voucher                         |
| PATCH  | `/vouchers/:id` | `vouchers:update` | partial update                          |
| DELETE | `/vouchers/:id` | `vouchers:delete` | delete (`204`)                          |
| GET    | `/packages`   | `vouchers:read`   | list/search packages (name + destinationId filters) |
| GET    | `/packages/by-slug/:slug` | `vouchers:read` | single package by tenant slug (`404` if missing) |
| GET    | `/packages/:id` | `vouchers:read` | single package (`404` if missing)       |
| GET    | `/packages/public/by-slug/:slug` | `@Public()` | published package by slug (only `isPublic` + `active`) |
| POST   | `/packages`   | `vouchers:create` | create a package                         |
| PATCH  | `/packages/:id` | `vouchers:create` | partial update                          |
| DELETE | `/packages/:id` | `vouchers:create` | delete                                  |

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
      "packageId": null,
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
  "packageId": "<optional package uuid>",
  "data": {
    "voucherNo": "CV-1",
    "...fields of VoucherDataDto..."
  }
}
```

- `data.voucherNo`, when present, must equal the top-level `voucherNo` → else
  `400` (`voucherNo must match data.voucherNo`). If `data.voucherNo` is absent
  the check is skipped (used for partial saves).
- Duplicate `voucherNo` → `409 Conflict`.
- **Partial saves are allowed.** Every field of `VoucherDataDto` (and its nested
  `travellers` / `hotels` / `itineraries` DTOs) is `@IsOptional` and only
  string/max-length constrained — the backend deliberately does **not** enforce
  format rules (phones, emails, dates, amounts) or "all fields present"
  requirements. Completeness is owned by the frontend zod schema; the backend
  stores whatever subset has been filled in as the `data` JSONB blob so a
  voucher can be saved at any step of the wizard. `data` also accepts the
  form-only keys `packageName`, `numberOfPersons`, `numberOfTourDays`.
- `data.agentName`/`data.customerName`/`data.companyName` are optional; missing
  values flow into the denormalized columns as `''` so the NOT NULL columns are
  never violated (e.g. saving step 1 alone sets `customer_name` = `''` when the
  name is still empty).
- `packageId` is `@IsOptional @IsUUID`; when supplied it is stored in the
  `package_id` column. The voucher's `data.itineraries` remains an independent
  snapshot, so the Package can evolve without touching this voucher.

### PATCH `/vouchers/:id` body

Any subset of the POST body (e.g. `{ "data": { ... } }`, `{ "voucherNo":
"CV-2" }`, `{ "packageId": "..." }`, or both). Omitting both is a no-op.
Changing `voucherNo` updates the top-level column **and** rewrites
`data.voucherNo`; a duplicate → `409`.

### GET `/packages`

Query params: `name` (optional, ILIKE on `normalized_name`), `destinationId`
(optional, exact match). Returns up to 50 rows ordered by `updatedAt DESC`,
each with orphaned-ordered `days` + `images`. Use `GET /packages/:id` for the
full nested payload (destination, days, images, inclusions, exclusions).

### POST `/packages` body

```json
{
  "name": "Andaman Family Package",
  "slug": "andaman-family-package",
  "destinationId": "<optional destination uuid>",
  "durationDays": 5,
  "durationNights": 4,
  "basePrice": 25000,
  "pricingType": "PER_PERSON",
  "status": "draft",
  "isPublic": false,
  "isFeatured": false,
  "shortDescription": "...",
  "description": "...",
  "days": [
    { "dayOrder": 1, "subject": "Arrival", "description": "..." }
  ],
  "images": [{ "imageUrl": "https://... or data:image/...", "altText": "", "isCover": true }],
  "inclusions": [{ "title": "AC deluxe room" }],
  "exclusions": [{ "title": "Airfare" }]
}
```

- `name` and at least one ordered `days` entry are required.
- `status` accepts `draft|active|inactive|archived`; when omitted, creation
  defaults to `draft`. `isPublic` gates the public by-slug endpoint.
- `slug`, when omitted, is generated from `name` and made tenant-unique.
- Nested `images`, `inclusions`, `exclusions` are optional and replace the
  existing children on update (`PATCH` uses the same DTO, everything optional).
- Images that are data URLs are uploaded to ImageKit `/packages` and replaced
  by the uploaded URL.

### PATCH `/packages/:id` body

Any subset of the POST body. Omitting a nested collection keeps the current
children; supplying it replaces them. Changing `name` regenerates the slug
unless an explicit `slug` is given.

## Behavioral notes

- `DELETE /vouchers/:id` → `204`; `404` if the id does not exist.
- `journeyDate` is stored as `null` when `data.journeyDate` is absent.
- List/sort only ever touch the denormalized columns + `data` for payload reads.
- Deleting a Package does not delete vouchers; vouchers keep their snapshot and
  their `package_id` becomes `NULL` (`ON DELETE SET NULL`).
- **Column naming:** there is no global snake-case naming strategy in this
  backend, so every entity `@Column` that maps to a snake_case column must set
  `name:` explicitly (e.g. `voucher_no`, `customer_name`, `company_name`,
  `payment_type`, `journey_date`, `created_at`, `updated_at`). Omitting `name:`
  makes TypeORM emit camelCase identifiers (e.g. `"voucherNo"`) and every query
  against that column fails with `column ... does not exist` (42703).

## Files

- `src/travel/entities/confirmation-voucher.entity.ts`
- `src/travel/entities/package.entity.ts` (`Package`, `PackageDay`,
  `PackageImage`, `PackageInclusion`, `PackageExclusion`)
- `src/travel/confirmation-vouchers.service.ts`, `src/travel/confirmation-vouchers.controller.ts`
- `src/travel/packages.service.ts`, `src/travel/packages.controller.ts`,
  `src/travel/packages.module.ts`
- `src/travel/travel.module.ts`
- `src/travel/dto/{voucher-traveller,voucher-hotel,voucher-itinerary,voucher-data,create-confirmation-voucher,update-confirmation-voucher,find-vouchers-query}.dto.ts`
- `src/travel/dto/{create-package,update-package}.dto.ts`
- `src/database/migrations/1760000000011-CreateConfirmationVouchersTable.ts`
- `src/database/migrations/1760000000012-SeedTravelVouchersPermissions.ts`
- `src/database/migrations/1760000000015-AddAgentNameToConfirmationVouchers.ts`
- `src/database/migrations/1760000000017-AddTenantScoping.ts` (adds `tenant_id`, scopes uniqueness to `(tenant_id, voucher_no)`)
- `src/database/migrations/1760000000027-CreateItineraryTemplates.ts` /
  `1760000000028-AddPackagePriceStatus.ts` (superseded by `…0030`:
  `1760000000030-CreatePackageArchitecture.ts` renames and extends these tables)
- Multi-tenancy model: `11-multi-tenancy.md`

## Agent checklist

- [ ] Admin roles list vouchers with pagination/search/sort
- [ ] Non-admin → `403`; missing role/permission enforced
- [ ] Create, update, delete work; delete → `204`
- [ ] Partial `data` (any subset, incl. missing `voucherNo` inside `data`) saves
      without format validation; the full complete payload (incl.
      `packageName`/`numberOfPersons`/`numberOfTourDays` inside `data`) also saves
- [ ] Duplicate `voucherNo` → `409`
- [ ] `GET /vouchers/:id` for a nonexistent id → `404`
- [ ] `data` JSONB and denormalized columns stay in sync on create/update
- [ ] `agentName` (`@IsOptional`) persists to `data` + `agent_name` and is searchable
- [ ] `packageId` (`@IsOptional @IsUUID`) persists to `package_id`
- [ ] Package create requires `name` + ≥1 `days`; rejects unknown fields (`400`)
- [ ] Duplicate package names OK; slug unique per tenant (`-2`, `-3`, … on collision)
- [ ] Full package payload returns sorted `days`/`images`/`inclusions`/`exclusions`
- [ ] Data-URL images upload to ImageKit `/packages` (fallback keeps data URL)
- [ ] `GET /packages/public/by-slug/:slug` is `@Public()` and only resolves
  `isPublic` + `status: 'active'`
- [ ] Deleting a Package leaves vouchers intact, `package_id` → `NULL`

## Package endpoints (legacy itinerary-templates)

The old `/itinerary-templates` controller was removed in the Package
architecture change. All package management now lives at `/packages` with the
full `CreatePackageDto`/`UpdatePackageDto` contract above.
