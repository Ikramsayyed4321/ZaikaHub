# Production Environment Validation

The backend validates critical production settings at startup.

Required in production:

- `NODE_ENV=production`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL` or `DB_HOST`

Recommended for TiDB Cloud:

- `DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DB_NAME`
- `DB_SSL=true`

Supported database configuration:

- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL`

Runtime behavior:

- `PORT` is used first for Render compatibility.
- `API_PORT` remains supported for local development.
- `CREATE DATABASE` failures caused by limited TiDB permissions are logged and skipped.
- Migrations run automatically on backend startup.
- Development demo seed data only runs when `NODE_ENV !== production`.
