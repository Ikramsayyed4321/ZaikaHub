# Zaika Hub API Documentation

Base URL: `/api`

All protected routes require:

```http
Authorization: Bearer <access_token>
```

## Auth

`POST /auth/login`

```json
{ "email": "admin@zaikahub.local", "password": "admin123" }
```

`POST /auth/refresh`

```json
{ "refreshToken": "..." }
```

`POST /auth/logout`

`GET /auth/me`

## Users

Admin only.

- `GET /users?page=1&limit=20&search=admin`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

## Restaurant Data

RBAC protected:

- `/restaurants`
- `/tables`
- `/menu_items`
- `/orders`
- `/order_items`
- `/payments`
- `/activity_logs`
- `/backups`

Each supports list/get/create/update/delete where the table is mutable.

## Reports

- `GET /reports/dashboard?from=2026-06-01&to=2026-06-05`
- `GET /reports/sales?from=2026-06-01&to=2026-06-05`
- `GET /reports/sales?from=2026-06-01&to=2026-06-05&format=csv`

## Invoices

- `POST /invoices/orders/:orderId`
- `GET /invoices/orders/:orderId/pdf`

## Backups

- `POST /backups`
- `GET /backups/:id/download`
