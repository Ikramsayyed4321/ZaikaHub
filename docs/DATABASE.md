# Database Schema

Database: `restaurant_db`

The backend creates and updates the schema automatically on startup through `backend/src/db.ts`.

## Tenant Model

`restaurants.id` is referenced by restaurant-owned tables. Non-admin users are filtered to their own `restaurant_id`.

## Key Tables

`restaurants`: tenant records.

`users`: login users with `password_hash`, `role`, `is_active`, and `restaurant_id`.

`roles`, `permissions`, `role_permissions`: RBAC metadata.

`tables`: restaurant table numbers and occupancy.

`menu_items`: restaurant menu catalog.

`orders`, `order_items`: order headers and item lines.

`payments`: payment records.

`invoices`: generated bill metadata.

`activity_logs`, `login_audit_logs`: audit trail.

`backups`: backup history.

`sales_reports`: cached/generated report data.

`migrations`: applied migration names.
