# Zaika Hub Restaurant Management System

Zaika Hub is a self-hosted restaurant management system using only free and open-source local technologies:

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Recharts
- Backend: Node.js, Express, TypeScript
- Database: MySQL Community Edition
- Auth: JWT + bcrypt
- Validation: Zod
- PDF: PDFKit

No Firebase, Supabase, Auth0, Clerk, AWS, paid APIs, SaaS databases, or subscription services are used.

## Local Setup

1. Install MySQL Server.
2. Update `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=restaurant_db
API_PORT=3001
CLIENT_ORIGIN=http://localhost:5174
VITE_API_URL=http://localhost:3001/api
JWT_SECRET=change-this-access-secret
JWT_REFRESH_SECRET=change-this-refresh-secret
SEED_ADMIN_EMAIL=admin@zaikahub.local
SEED_ADMIN_PASSWORD=admin123
```

3. Run:

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5174`

API health: `http://localhost:3001/api/health`

Development login:

```text
admin@zaikahub.local / admin123
```

## Database Migrations

The application automatically creates `restaurant_db` and updates tables on startup.

Manual migration command:

```bash
npm run migrate
```

Development seed data is inserted only when `NODE_ENV !== production`.

## Core Tables

- `restaurants`
- `users`
- `roles`
- `permissions`
- `role_permissions`
- `tables`
- `menu_items`
- `orders`
- `order_items`
- `payments`
- `activity_logs`
- `login_audit_logs`
- `sales_reports`
- `backups`
- `invoices`
- `migrations`

Tenant isolation is implemented with `restaurant_id` on restaurant-owned data and enforced by backend route filters for non-admin users.

## API Summary

Auth:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

CRUD:

- `/api/users`
- `/api/restaurants`
- `/api/tables`
- `/api/menu_items`
- `/api/orders`
- `/api/order_items`
- `/api/payments`
- `/api/activity_logs`
- `/api/backups`

Reports:

- `GET /api/reports/dashboard`
- `GET /api/reports/sales`
- `GET /api/reports/sales?format=csv`

Invoices:

- `POST /api/invoices/orders/:orderId`
- `GET /api/invoices/orders/:orderId/pdf`

Backups:

- `POST /api/backups`
- `GET /api/backups/:id/download`

Compatibility state endpoint for existing POS screens:

- `GET /api/state`
- `PUT /api/state`

## Testing

```bash
npm test
```

## Production Build

```bash
npm run build
npm start
```

Compiled backend output is generated in `backend/dist`. The production start command runs `node backend/dist/index.js`.

For Render and Netlify deployment, see:

- `docs/render-deployment.md`
- `docs/netlify-deployment.md`
- `docs/production-env.md`

## Ubuntu 24.04 VPS Deployment

Use the included script as root/sudo user:

```bash
chmod +x scripts/deploy-ubuntu-24.04.sh
DOMAIN=your-domain.com ./scripts/deploy-ubuntu-24.04.sh
```

The script installs:

- Node.js/npm
- MySQL Server
- Nginx
- PM2

It also creates an Nginx reverse proxy for `/api`.

## Security

Implemented:

- JWT access tokens
- Refresh tokens
- bcrypt password hashing
- Helmet middleware
- CORS allowlist
- Rate limiting
- Zod validation
- MySQL parameterized queries
- RBAC middleware
- Login audit logs
- Activity logs

For production, change all secrets in `.env`, set `NODE_ENV=production`, and use strong MySQL credentials.
