<<<<<<< HEAD
# aasva-backend
=======
# Backend

NestJS + TypeORM + PostgreSQL API for the frontend app. Ships with
registration, login, password recovery, and RBAC.

## Quick start

```bash
npm install
cp .env.example .env        # set DB_*, secrets, SMTP
createdb aasvaDB            # PostgreSQL >= 13
npm run migration:run       # apply schema + seed roles/permissions + superadmin users
npm run seed                # create bootstrap admin (ADMIN_EMAIL/ADMIN_PASSWORD)
npm run start:dev           # http://localhost:3000/api
```

Health check: `GET /api/health`

## Documentation (per module — read these before modifying)

| Doc | Contents |
| --- | -------- |
| [00-getting-started.md](docs/00-getting-started.md) | setup, scripts, env, layout |
| [01-authentication.md](docs/01-authentication.md) | register, login, refresh, logout, me, change-password |
| [02-password-recovery.md](docs/02-password-recovery.md) | forgot/reset password flow |
| [03-rbac.md](docs/03-rbac.md) | roles, permissions, guards, decorators |
| [04-users-module.md](docs/04-users-module.md) | admin user CRUD |
| [05-roles-module.md](docs/05-roles-module.md) | roles & permissions admin CRUD |
| [06-database-migrations.md](docs/06-database-migrations.md) | schema, migrations, seeds |
| [07-mail-module.md](docs/07-mail-module.md) | SMTP / dev console mail |
| [08-google-oauth.md](docs/08-google-oauth.md) | Google OAuth flow, strategy, schema |
| [09-travel-vouchers.md](docs/09-travel-vouchers.md) | confirmation-voucher CRUD (travel module) |
| [10-company-settings.md](docs/10-company-settings.md) | company profile / branding / tax / registration settings; ImageKit logo upload; Gemini AI tagline |

## Commands

```bash
npm run start:dev       # watch mode
npm run build           # compile
npm run lint            # eslint + prettier
npm test                # unit tests
npm run migration:run   # apply migrations
npm run migration:revert
npm run seed            # bootstrap admin user
```
>>>>>>> 3ea338c (Backend up to live the aasvana portal)
