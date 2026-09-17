# Destinations and Hotels

Destinations are canonical shared place records used by all tenants.
Hotels are also shared records, reference destinations through `destination_id`, and do not duplicate
geographic fields.

Searches return the shared master records for the requesting tenant. Creating a
destination or hotel deduplicates globally, so one tenant's addition becomes
available to every tenant without creating tenant-specific copies.

`GET /api/destinations/search?q=Park%20Street` searches local destinations first
and calls the isolated Nominatim provider only when no local result exists.
`POST /api/destinations` creates a destination and accepts incomplete geographic
data so manual creation is always possible.
`DELETE /api/destinations/:id` removes an unused destination and returns a
conflict when hotels still reference it.
The `destinations:delete` permission is assigned to administrator roles by
migration `1760000000025-SeedDestinationDeletePermission`.

Destination search is currently restricted to India. Nominatim requests use
`countrycodes=in`, and normalized remote results must have country code `in`.
Local records are limited to India or manually created records with no country
yet.

Destination search/create accepts the dedicated destination permissions and the
existing voucher read/create permissions, so voucher users do not need a fresh
role assignment solely to search or add a destination.

Remote suggestions are not implicitly treated as selected records by the API;
the frontend persists the suggestion only after the agent selects it. Repeated
selection is deduplicated by normalized geographic fingerprint.

Hotels use `POST /api/hotels` with `destinationId`, can be searched through
`GET /api/hotels/search?q=...`, and can be listed through
`GET /api/hotels/destination/:destinationId`.
`GET /api/hotels` returns all shared hotels for management screens.

Migrations `1760000000021-CreateDestinationsAndHotelsTables` and
`1760000000022-SeedDestinationHotelPermissions` create the schema and permissions.
