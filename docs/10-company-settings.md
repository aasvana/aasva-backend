# 10 - Company Settings

Module: `src/company/` — read/write API for the company profile, branding
(logo/tagline), tax (GST/PAN/TAN/currency), and registration details. Replaces a
former frontend-localStorage feature (`useCompanyStore`, persist key
`xmerge_company`); the frontend store is now a backend-synced cache.

Routes live under `/company`, are protected by `@Permissions(...)`, and are
granted (via seed migration `1760000000014`) to `systemadmin`, `superadmin`, and
`admin` roles.

## Schema

### `company_settings`

A **singleton** table — the service always returns/updates its first row
(created on first read if empty). Seeded with a default row (mirroring the
frontend `brand` constants) by migration `1760000000013`.

`id uuid PK`, `name` (varchar 255, NOT NULL), `short_name`, `email`, `phone`,
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

## Endpoints (admin roles only)

| Method | Path      | Permission     | Description                        |
| ------ | --------- | -------------- | ---------------------------------- |
| GET    | `/company` | `company:read` | current company settings (singleton) |
| PATCH  | `/company` | `company:update` | partial update of any field        |
| POST   | `/company/enhance-tagline` | `company:update` | AI-rewrite the tagline via Gemini  |

### GET `/company`

Returns the singleton row. Response uses camelCase; `defaultTaxRate` comes back
as a **string** (numeric column) — the frontend data layer coerces it with
`Number(...)`.

```json
{
  "id": "<uuid>",
  "name": "Island Beach Vacation",
  "shortName": "Xm",
  "email": "admin@islandbeachvacation.com",
  "phone": "+1 (808) 555-1234",
  "address": "123 Island Beach Rd, Maui, HI 96753",
  "website": "https://www.islandbeachvacation.com",
  "tagline": "...",
  "logo": "/images/logo-light.svg",
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

- First GET creates + persists the default row if the table is empty (e.g. after
  a `down`+`up` of `1760000000013` without the seed row).
- The endpoint is `PATCH /company` (no id) because the row is a singleton.
- `logo` is a text column (`text`, nullable). When the frontend passes a
  `data:image/...` URL, the service hands it to `ImageKitService` first:
  - `IMAGEKIT_PRIVATE_KEY` set → uploaded to ImageKit (multipart `FormData`,
    base64 string field, folder `/logos`, unique filename) and the returned
    CDN URL is stored.
  - key empty, upload unreachable, ImageKit auth/format failure, or non-image
    data URL → the raw data URL is stored instead. A failed upload logs a
    warning and **never fails the PATCH** (branding saves always succeed).
- Non-data-URL `logo` values (paths like `/images/logo-light.svg`, ImageKit URLs,
  `null`) pass through unchanged.

## ImageKit integration (`src/imagekit/`)

Wraps `POST https://upload.imagekit.io/v1/files/upload`. Auth: HTTP Basic with
`<IMAGEKIT_PRIVATE_KEY>:` (empty password). Request is **multipart form data**
(base64 string in the `file` field — the JSON body form is rejected by ImageKit
as malformed). Returns `{ url, fileId }` on success, `null` when unconfigured /
unreachable / rejected. Configured in `AppModule`; consumed by `CompanyService.update`.

## POST `/company/enhance-tagline`

Body: `{ "tagline"?: string }` (optional, max 500 chars; omitted → generates from
the company name). Permission `company:update`.

Calls the **Gemini** REST API (Google free tier, `gemini-2.0-flash` by default):

- `GET` model: `GEMINI_MODEL` from env (default `gemini-2.0-flash`); a trailing
  version suffix like `-001` is stripped for the API URL.
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<GEMINI_API_KEY>`
- Body: `systemInstruction` ("professional marketing tagline writer") +
  `contents` (the current tagline to improve or the company name to generate
  from) + `generationConfig` (`temperature: 0.8`, `maxOutputTokens: 80`).
- Response parsed from `candidates[0].content.parts[0].text`, quotes stripped.
- `503` with a readable message when: `GEMINI_API_KEY` is empty, the request is
  unreachable/timeouts (30s), the key is rejected (`API_KEY_INVALID`), the model
  is unavailable, the response is empty, or any non-2xx status.

The frontend surfaces these messages directly (`api.utils` interceptor forwards
`data.message`), e.g. "The Gemini API key is invalid."

## Files

- `src/company/entities/company-setting.entity.ts`
- `src/company/dto/update-company-settings.dto.ts`
- `src/company/dto/enhance-tagline.dto.ts`
- `src/company/company.service.ts`, `src/company/company.controller.ts`, `src/company/company.module.ts`
- `src/imagekit/imagekit.service.ts`, `src/imagekit/imagekit.module.ts`
- `src/database/migrations/1760000000013-CreateCompanySettingsTable.ts`
- `src/database/migrations/1760000000014-SeedCompanySettingsPermissions.ts`

## Agent checklist

- [ ] Admin roles can GET `/company`; the first read seeds/returns the singleton
- [ ] Non-admin → `403`; missing role/permission enforced
- [ ] PATCH applies partial updates and returns the merged row
- [ ] `PATCH` with unknown field → `400`; invalid email → `400`
- [ ] `logo: null` clears the logo; data-url uploads round-trip
- [ ] Logo data URL → uploaded to ImageKit when a private key is set; stored raw otherwise; PATCH never fails on ImageKit errors
- [ ] `defaultTaxRate` persists as numeric and validates 0–100
- [ ] `enhance-tagline` returns `{ enhanced }` with a valid `GEMINI_API_KEY`, and a readable `503` without one
- [ ] Frontend `useCompanyStore` is hydrated from `GET /company` and updated on `PATCH`