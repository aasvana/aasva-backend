# 03 - RBAC (Roles & Permissions)

Module: `src/roles/`, `src/common/` (guards/decorators)

## Model

- **User** — belongs to many **Role** (`user_roles` join table).
- **Role** — grants many **Permission** (`role_permissions` join table) and many
  **Module** (`role_modules` join table).
- **Permission** — a string key like `users:read`. Canonical list lives in the
  seed migration `SeedRolesAndPermissions...` and the JWT.
- **Module** — a named feature area (e.g. `Accounting`, `Travel`). Seeded by
  `SeedModules...`. Module `pageKey` values are embedded in the JWT so the
  frontend can gate routes client-side.

Seeded roles: `systemadmin` (all permissions, all modules), `superadmin` (all permissions, all modules), `admin` (all permissions, all modules), `user` (no permissions, no modules — baseline).

Seeded permissions:

```
users:read, users:create, users:update, users:delete
roles:read, roles:create, roles:update, roles:delete
permissions:read, permissions:create, permissions:update, permissions:delete
```

Feature migrations extend the catalog; Terms and Conditions adds
`terms:read`, `terms:create`, `terms:update`, and `terms:delete`.

## How authorization works

Role, permission, and module names are embedded in the **access token** at login.
Guards are **stateless** (no DB query per request):

1. `JwtAuthGuard` — authenticates (skips `@Public()` routes).
2. `RolesGuard` — enforces `@Roles(...)` (OR logic; admin passes because
   `admin` is a role, not a blanket bypass).
3. `PermissionsGuard` — enforces `@Permissions(...)` (OR logic).

Because claims come from the token, role/permission/module changes take effect on the
**next login/refresh** (access tokens live ~15m).

## Decorators

```ts
import { Roles } from '.../common/decorators/roles.decorator';
import { Permissions } from '.../common/decorators/permissions.decorator';
import { Role } from '.../roles/enums/role.enum';

@Controller('things')
@Roles(Role.ADMIN)              // whole controller admin-only
export class ThingsController {
  @Get()
  @Permissions('things:read')   // OR with route-level decorators
  list() {}
}
```

- `@Public()` — bypasses `JwtAuthGuard` entirely (no user in `req.user`).
- `@CurrentUser()` — injects `{ id, email, roles, permissions, modules }`.

Missing `@Permissions()` → route is open to any authenticated user with an
allowed role. Use `@Roles(Role.ADMIN)` + `@Permissions(...)` together to gate
an endpoint (as the admin controllers do).

## Response mapping

When guard fails:
- `401` — no/invalid token.
- `403` — authenticated but missing required role/permission.

## Managing roles & permissions at runtime

Admin CRUD lives in `src/roles/roles.controller.ts`
(see `docs/05-roles-module.md`). Add a new permission name to the seed
migration, grant it to the `admin` role in the `role_permissions` join, and use
`@Permissions('new:thing')` on routes.

## Files

- Entities: `src/roles/entities/{role,permission,module}.entity.ts`
- Guards: `src/common/guards/roles.guard.ts`, `permissions.guard.ts`,
  `jwt-auth.guard.ts`
- Decorators: `src/common/decorators/{public,roles,permissions,current-user}.decorator.ts`
- Claim building: `src/auth/auth.service.ts` → `signAccessToken()`

## Agent checklist

- [ ] Admin token can call `GET /users` and `GET /roles`; `user` token gets `403`
- [ ] Unauthenticated request to a protected route → `401`
- [ ] `@Public()` route (e.g. `/auth/login`, `/health`) works without a token
- [ ] Adding a permission + role via API shows up after re-login
- [ ] JWT payload contains `roles`, `permissions`, and `modules` arrays
