# 10 - Company Settings

Module: `src/company/` — read/write API for the company profile, branding
(logo/tagline), tax (GST/PAN/TAN/currency), and registration details. Replaces a
former frontend-localStorage feature (`useCompanyStore`, persist key
`xmerge_company`); the frontend store is now a backend-synced cache.

Routes live under `/company` and are **authenticated (JWT) only** — no
`@Permissions()` decorator. Access control is the tenant itself: every route is
scoped by the caller's `tenantId` (global `TenantInterceptor`), so a user can
only ever read/update their **own** tenant's company row. This is intentional —
every user sets up and owns their company profile in onboarding (see
`POST /company/onboarding` below), so company settings are **not** admin-only.
The `company:read` / `company:update` permissions seeded by migration
`1760000000014` are retained in the catalog for future role-based gating but are
not required by any route today (non-admin `user`-role accounts can manage their
company).

## Schema

### `company_settings`

A **per-tenant singleton** — `getOrCreate()` always returns/creates the first
row for the caller's `tenantId` (via `TenantContext`). Seeded with a default
row (mirroring the frontend `brand` constants) for the default tenant by
migration `1760000000013`, then backfilled to every pre-existing tenant by
migration `1760000000017`. `UNIQUE (tenant_id)` (added by migration
`1760000000017`) enforces one row per tenant. A newly-created tenant with no row
yet is seeded by `getOrCreate()` with `COMPANY_DEFAULTS` — with the `name`
taken from the **tenant name** (see `11-multi-tenancy.md`).

`id uuid PK`, `tenant_id` (NOT NULL FK->tenants, unique index), `name`
(varchar 255, NOT NULL), `short_name`, `email`, `phone`,
`address` (varchar 500), `website`, `tagline` (varchar 500), `logo` (**text,
nullable** — stores either an image path or a data URL for uploads),
`currency` (default `'USD'`), `gstin`, `pan`, `tan`, `cin`,
`default_tax_rate` (numeric(5,2), default 0), `business_type`,
`incorporation_date` (varchar 16 — `YYYY-MM-DD`), `authorized_signatory`
(varchar 200), `created_at`, `updated_at`.

> **Column naming:** as with every entity in this backend (see `09-travel-vouchers.md`),
> there is no global snake-case naming strategy, so each `@Column` must set
> `name:` explicitly (e.g. `default_tax_rate`, `short_name`,
> `authorized_signatory`, `created_at`, `updated_at`).

## Endpoints (authenticated — any tenant member; scoped to the caller's tenant)

| Method | Path      | Description                              |
| ------ | --------- | ---------------------------------------- |
| GET    | `/company` | current company settings (singleton)     |
| PATCH  | `/company` | partial update of any field              |
| POST   | `/company/onboarding` | first-time company setup: renames the tenant to the company name + upserts the settings row |
| POST   | `/company/enhance-tagline` | AI-rewrite the tagline via Gemini |

### GET `/company`

Returns the singleton row. Response uses camelCase; `defaultTaxRate` comes back
as a **string** (numeric column) — the frontend data layer coerces it with
`Number(...)`.

```json
{
  "id": "<uuid>",
  "name": "Aasvana",
  "shortName": "Xm",
  "email": "admin@aasvana.com",
  "phone": "+91 90000 00000",
  "address": "Aasvana HQ",
  "website": "https://www.aasvana.com",
  "tagline": "...",
  "logo": "/imgs/brand/Aasvana_Logo.png",
  "currency": "USD",
  "gstin": "",
  "pan": "",
  "tan": "",
  "cin": "",
  "defaultTaxRate": "0.00",
  "businessType": "Private Limited",
  "incorporationDate": "",
  "authorizedSignatory": "Aquib Shahbaz",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### POST `/company/onboarding`

Body: `OnboardCompanyDto` — the `UpdateCompanySettingsDto` fields with
`name` (**required**, 1–255 chars). Other fields are optional; empty/undefined
values are ignored.

- `name` is **required** and is used to rename the caller's tenant
  (`TenantsService.rename`, which also regenerates the tenant slug), so the
  tenant's identity matches the company name the user chose on signup.
- The remaining fields are merged into the tenant's `company_settings` row
  (created if needed, seeded from the tenant name via `getOrCreate`).
- Used by the frontend's `/onboarding/company` step (`POST /company/onboarding`
  via `useApiRequest`). Returns the updated settings row.

### PATCH `/company` body

Any subset of the fields above (all optional, camelCase). Examples:

- `{ "name": "...", "shortName": "...", "email": "...", "phone": "...", "website": "..." }`
- `{ "logo": null }` — removes the logo; `logo` may be a data URL or an image path string (max 1 MB).
- `{ "defaultTaxRate": 18 }` — number 0–100.

Validation: strings capped per column length; `email` must be a valid email;
unknown fields are rejected with `400` (`whitelist`/`forbidNonWhitelisted`).
The JSON body parser allows up to **2 MB** (`app.useBodyParser('json', { limit: '2mb' })`
in `src/main.ts`) so base64-encoded logos fit; the DTO still caps `logo` at 1,000,000
chars. The frontend **compresses logos client-side before upload**
(`compressImageToDataUrl` in `aasva-frontend/src/lib/image-utils.ts`), so oversized
images are resized and re-encoded to stay under the cap.

## Behavioral notes

- First GET creates + persists the default row **for the caller's tenant** if
  no settings row exists for that tenant (the `tenant_id` is taken from the
  async-local-storage tenant context, set by the global `TenantInterceptor`).
- The endpoint is `PATCH /company` (no id) because the row is per-tenant
  singleton.
- Every `getOrCreate()` and `update()` filters by `tenantId` — one tenant can
  never read or modify another tenant's company settings. **This guarantee is
  only as strong as the caller's `tenant_id`:** accounts that were all
  backfilled onto `DEFAULT_TENANT_ID` by `1760000000017` shared a single row
  and therefore a single logo/tagline. `1760000000039-SplitCollapsedTenant`
  separates them — see
  ["Accounts collapsed onto the default tenant" in `11-multi-tenancy.md`](11-multi-tenancy.md).
- `tagline` is a normal persisted column written by the generic `update()` patch
  loop. It is **not** derived at read time and holds no client-side copy —
  `POST /company/enhance-tagline` only returns AI text and never writes. The
  frontend must not cache branding in `localStorage`; `useCompanyStore` is
  in-memory and re-fetched from `GET /company` (see
  `docs/guides/settings.md` in the frontend docs).
- `COMPANY_DEFAULTS.logo` is `/imgs/brand/Aasvana_Logo.png`, served from
  `aasva-frontend/public/imgs/brand/`. Rows seeded before that asset existed may
  still hold the old missing path `/images/logo-light.svg`;
  `1760000000039` repairs those in place.
- Access is **JWT + tenant scoping only** (no `@Permissions()`). A regular
  `user`-role account can manage its own tenant's company settings — that is the
  whole point of the onboarding company step. `company:read` / `company:update`
  permissions remain seeded but unused by routes.
- `logo` is a text column (`text`, nullable). When the frontend passes a
  `data:image/...` URL, the service hands it to `ImageKitService` first:
  - `IMAGEKIT_PRIVATE_KEY` set → uploaded to ImageKit (multipart `FormData`,
    base64 string field, folder `/logos`, unique filename) and the returned
    CDN URL is stored.
  - key empty, upload unreachable, ImageKit auth/format failure, or non-image
    data URL → the raw data URL is stored instead. A failed upload logs a
    warning and **never fails the PATCH** (branding saves always succeed).
- Non-data-URL `logo` values (paths like `/imgs/brand/Aasvana_Logo.png`, ImageKit URLs,
  `null`) pass through unchanged.

## ImageKit integration (`src/imagekit/`)

Wraps `POST https://upload.imagekit.io/v1/files/upload`. Auth: HTTP Basic with
`<IMAGEKIT_PRIVATE_KEY>:` (empty password). Request is **multipart form data**
(base64 string in the `file` field — the JSON body form is rejected by ImageKit
as malformed). Returns `{ url, fileId }` on success, `null` when unconfigured /
unreachable / rejected. Configured in `AppModule`; consumed by `CompanyService.update`.

## POST `/company/enhance-tagline`

Body: `{ "tagline"?: string }` (optional, max 500 chars; omitted → generates from
the company name). Authenticated (no `@Permissions` required).

Returns **`{ enhanced, options }`**: `enhanced` is the best-ranked line, and
`options` holds up to 5 ranked candidates (`enhanced === options[0]`, so a
client can safely read either).

Calls the **Gemini** REST API (Google free tier, `gemini-2.0-flash` by default):

- `GET` model: `GEMINI_MODEL` from env (default `gemini-2.0-flash`); a trailing
  version suffix like `-001` is stripped for the API URL.
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<GEMINI_API_KEY>`
- Body: `systemInstruction` (senior brand-copywriter role, hard style rules, and
  5 worked few-shot examples across different industries) + `contents` (company
  **name, website, legal form, and the existing tagline** so the industry can be
  inferred) + `generationConfig` (`temperature: 0.9`, `maxOutputTokens: 400`).
- The prompt asks for **5 clearly different angles**, not one line, so the user
  gets real choice instead of a single average result. All `parts` of the
  candidate are joined before parsing (models may split text across parts).

`rankTaglines()` (private, `company.service.ts`) then turns the raw text into
quality-ranked options:

- Splits on newlines, strips list numbering/bullets/outer quotes, collapses
  whitespace, drops lines under 12 or over 180 chars, dedupes case-insensitively,
  and drops a line equal to the company name or a "Here are…" preamble.
- Scores each survivor: **-100 per banned marketing term** ("leading",
  "world-class", "seamless", "innovative", "transform", "solutions", …),
  **-60 if it contains a digit** (invented stats), **+20** for 40–130 chars,
  **+10** for under 16 words, **-5** per comma/semicolon. Higher is better.
- Returns the top 5 by score. The cliché blacklist is the main quality lever —
  the generic filler the model defaults to is exactly what makes a tagline read
  as "not better".
- `503` with a readable message when: `GEMINI_API_KEY` is empty, the request is
  unreachable/timeouts (30s), the key is rejected (`API_KEY_INVALID`), the model
  is unavailable, **no line survives ranking**, or any non-2xx status.

The frontend surfaces these messages directly (`api.utils` interceptor forwards
`data.message`), e.g. "The Gemini API key is invalid." `BrandingSection` puts
`enhanced` into the input and lists the remaining `options` as clickable
suggestions, with an **Undo** button that restores the pre-enhancement tagline.
Neither the AI call nor choosing a suggestion persists anything — the normal
Save button still applies it.

## Files

- `src/company/entities/company-setting.entity.ts`
- `src/company/dto/update-company-settings.dto.ts`
- `src/company/dto/onboard-company.dto.ts`
- `src/company/dto/enhance-tagline.dto.ts`
- `src/company/company.service.ts`, `src/company/company.controller.ts`, `src/company/company.module.ts`
- `src/imagekit/imagekit.service.ts`, `src/imagekit/imagekit.module.ts`
- `src/database/migrations/1760000000013-CreateCompanySettingsTable.ts`
- `src/database/migrations/1760000000014-SeedCompanySettingsPermissions.ts`
- `src/database/migrations/1760000000017-AddTenantScoping.ts` (adds `tenant_id` + `UNIQUE (tenant_id)`)
- `src/database/migrations/1760000000039-SplitCollapsedTenant.ts` (splits accounts collapsed onto the default tenant)
- Multi-tenancy model: `11-multi-tenancy.md`

## Agent checklist

- [ ] Any authenticated tenant member can GET /company; the first read seeds/returns the singleton
- [ ] A cross-tenant user gets their own row (never another tenant's); no role/permission gates
- [ ] PATCH applies partial updates and returns the merged row
- [ ] `POST /company/onboarding` renames the tenant to `name` and upserts the settings row
- [ ] `PATCH` with unknown field → `400`; invalid email → `400`; onboarding without `name` → `400`
- [ ] `logo: null` clears the logo; data-url uploads round-trip
- [ ] Logo data URL → uploaded to ImageKit when a private key is set; stored raw otherwise; PATCH never fails on ImageKit errors
- [ ] `defaultTaxRate` persists as numeric and validates 0–100
- [ ] `enhance-tagline` returns `{ enhanced, options }` (with `options[0] === enhanced`, up to 5 entries) with a valid `GEMINI_API_KEY`, and a readable `503` without one
- [ ] `enhance-tagline` output contains no banned cliché term and no invented digit/statistic when candidates are available
- [ ] Response lines survive the 12–180 char filter, list numbering and quotes are stripped, and duplicates are collapsed
- [ ] Brand-new tenant (`name = "Andaman Trip Maker"`) gets travel-specific output, not generic SaaS boilerplate
- [ ] Frontend `useCompanyStore` is hydrated from `GET /company` and updated on `PATCH`