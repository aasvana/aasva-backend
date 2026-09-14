# 00 - Getting Started / Project Overview

NestJS + TypeScript + TypeORM + PostgreSQL backend for the frontend app.
Auth (login/registration/password recovery) and RBAC are implemented.

## Stack

| Layer     | Choice                                     |
| --------- | ------------------------------------------ |
| Framework | NestJS 11                                  |
| Language  | TypeScript (strict)                        |
| ORM       | TypeORM 1.x (entities + CLI migrations)    |
| Database  | PostgreSQL (>= 13, for `gen_random_uuid()`)|
| Auth      | JWT (access) + opaque rotating refresh     |
| Validation| class-validator / class-transformer        |
| Mail      | @nestjs-modules/mailer (SMTP or console)   |
| Rate limit| @nestjs/throttler                          |

## Directory layout

```
src/
├── main.ts                       # bootstrap: prefix, validation pipe, CORS
├── app.module.ts                 # root module, global guards registration
├── config/                       # env validation + typed config services
├── common/
│   ├── decorators/               # @Public, @Roles, @Permissions, @CurrentUser
│   ├── guards/                   # JwtAuthGuard, RolesGuard, PermissionsGuard
│   └── utils/duration.util.ts    # "15m"/"7d" -> ms
├── users/                        # User entity, service, controller, DTOs
├── roles/                        # Role/Permission entities, service, controller
├── auth/                         # register/login/refresh/recovery, JwtStrategy
├── mail/                         # MailService (SMTP or dev console log)
└── database/
    ├── data-source.ts            # CLI entry for migrations/seeds
    ├── migrations/               # schema + role/permission seed migrations
    └── seeds/                    # `npm run seed` admin bootstrap
docs/                             # these per-module docs
```

## Setup

```bash
npm install
cp .env.example .env       # adjust DB credentials / secrets
createdb backend           # or psql -c 'CREATE DATABASE backend'
npm run migration:run      # apply schema + seed roles/permissions
npm run seed               # create bootstrap admin (from ADMIN_EMAIL/ADMIN_PASSWORD)
npm run start:dev
```

Server starts at `http://localhost:3000/api` (configurable via `PORT`/`API_PREFIX`).
Health check: `GET /api/health` (public).

## npm scripts

| Script                    | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `npm run start:dev`       | watch mode dev server                     |
| `npm run build`           | compile to `dist/`                        |
| `npm run lint`            | eslint + prettier (auto-fix)              |
| `npm test`                | unit tests (jest)                         |
| `npm run migration:run`   | apply pending migrations                  |
| `npm run migration:revert`| revert last migration                     |
| `npm run migration:show`  | list applied/pending migrations           |
| `npm run migration:generate -- src/database/migrations/Name` | generate migration from entity diff |
| `npm run seed`            | create/assert the bootstrap admin user    |

## Environment variables (see `.env.example`)

`PORT`, `NODE_ENV`, `API_PREFIX`, `CORS_ORIGIN`, `DB_*`, `JWT_ACCESS_SECRET`,
`JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `SMTP_*`, `APP_BASE_URL`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`.

Secrets must not be committed. `.env` is gitignored.

## Global behavior

- Global URL prefix: `api`.
- Global `ValidationPipe`: `whitelist`, `transform`, `forbidNonWhitelisted`.
- Global guards (registered in `AppModule`): `JwtAuthGuard` (all routes except
  `@Public()`), `RolesGuard`, `PermissionsGuard`, `ThrottlerGuard`
  (default 100 req/min/IP).

## Agent checklist

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run migration:run` applies cleanly on a fresh DB
- [ ] `npm run seed` creates the admin user
- [ ] `GET /api/health` returns `{"status":"ok", ...}` without a token
