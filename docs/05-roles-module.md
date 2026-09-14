# 05 - Roles & Permissions Module

Module: `src/roles/` — admin CRUD for roles, permissions, and modules.

Two controllers in `src/roles/roles.controller.ts`:
`RolesController` (`/roles`) and `PermissionsController` (`/permissions`).
Both are `@Roles(Role.ADMIN)`-gated (systemadmin, superadmin, and admin all pass).

A third controller `ModulesController` (`/modules`) also lives here and is
`@Roles(Role.ADMIN)`-gated. It manages the module catalog and role-module
assignments.

## Role endpoints

| Method | Path         | Permission        | Description                  |
| ------ | ------------ | ----------------- | ---------------------------- |
| GET    | `/roles`     | `roles:read`      | list all roles (permissions included) |
| GET    | `/roles/:id` | `roles:read`      | single role (`404` if missing) |
| POST   | `/roles`     | `roles:create`    | create role                  |
| PATCH  | `/roles/:id` | `roles:update`    | update role                  |
| DELETE | `/roles/:id` | `roles:delete`    | delete role (`204`)          |

### POST `/roles` body

```json
{
  "name": "manager",
  "description": "Can manage content",   // optional
  "permissionIds": ["<uuid>", "..."]      // optional, replaces role->permission set
}
```

## Permission endpoints

| Method | Path                | Permission            | Description              |
| ------ | ------------------- | --------------------- | ------------------------ |
| GET    | `/permissions`      | `permissions:read`    | list all                 |
| GET    | `/permissions/:id`  | `permissions:read`    | single (`404` if missing)|
| POST   | `/permissions`      | `permissions:create`  | create                   |
| PATCH  | `/permissions/:id`  | `permissions:update`  | update                   |
| DELETE | `/permissions/:id`  | `permissions:delete`  | delete (`204`)           |

### POST `/permissions` body

```json
{
  "name": "content:publish",
  "description": "Can publish content"   // optional
}
```

## Module endpoints

| Method | Path                     | Permission        | Description                  |
| ------ | ------------------------ | ----------------- | ---------------------------- |
| GET    | `/modules`               | `roles:read`      | list all modules             |
| GET    | `/modules/:id`           | `roles:read`      | single module (`404` if missing) |
| POST   | `/modules`               | `roles:create`    | create module                |
| PATCH  | `/modules/:id`           | `roles:update`    | update module                |
| DELETE | `/modules/:id`           | `roles:delete`    | delete module (`204`)        |
| POST   | `/modules/roles/:roleId/modules` | `roles:update` | assign modules to a role (`204`) |

### POST `/modules` body

```json
{
  "name": "Accounting",
  "pageKey": "accounting",
  "description": "Invoices, bills, expenses, banking and reports."
}
```

`pageKey` must be unique and lowercase alphanumeric with hyphens. It must match
a `PageAccessKey` in the frontend (`src/constants/pages.ts`) for client-side
gating to work.

### POST `/modules/roles/:roleId/modules` body

```json
{
  "moduleIds": ["<uuid>", "..."]
}
```

Replaces the module set for the role. Modules are embedded in the JWT as
`modules: ["accounting", "travel", ...]` (the `pageKey` values).

## Naming convention for permissions

`<resource>:<action>` e.g. `users:read`. Keep names stable — they are embedded
in JWTs and referenced by `@Permissions()` decorators. Renaming requires
re-seeding + re-login of affected users.

## Deleting roles/permissions

Deletes cascade from the join tables (`role_permissions`, `user_roles`).
Deleting a role removes it from users; deleting a permission removes it from
roles. Guard rails (e.g. preventing deletion of the built-in `admin` role) are
**not** implemented yet — the role must be removed manually from `user_roles`
first if you want to preserve users.

## Files

- `src/roles/entities/{role,permission,module}.entity.ts`
- `src/roles/roles.service.ts`, `src/roles/roles.controller.ts`
- `src/roles/modules.controller.ts`
- `src/roles/dto/{create-role,update-role,create-permission,update-permission,create-module,update-module}.dto.ts`
- `src/roles/enums/role.enum.ts`

## Agent checklist

- [ ] Admin can list/create/update/delete roles and permissions
- [ ] Non-admin → `403`
- [ ] `GET /roles` includes each role's `permissions`
- [ ] Assigning `permissionIds` replaces the permission set on update
- [ ] New permission appears in the JWT only after the user re-logs in
