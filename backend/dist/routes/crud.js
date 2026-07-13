import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getPool } from '../db.js';
import { config } from '../config.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paginationSchema, userSchema } from '../validation/schemas.js';
import { logActivity } from '../services/activity.js';
const resources = {
    restaurants: {
        table: 'restaurants',
        fields: ['name', 'address', 'gst_number', 'is_active'],
        roles: ['admin'],
        tenant: false,
        searchFields: ['name', 'gst_number'],
    },
    tables: {
        table: 'tables',
        fields: ['restaurant_id', 'table_number', 'status', 'assigned_waiter_id'],
        roles: ['admin', 'waiter'],
        tenant: true,
        searchFields: ['table_number', 'status'],
    },
    menu_items: {
        table: 'menu_items',
        fields: ['restaurant_id', 'name', 'category', 'price', 'available'],
        roles: ['admin', 'waiter', 'cashier'],
        tenant: true,
        searchFields: ['name', 'category'],
    },
    orders: {
        table: 'orders',
        fields: ['restaurant_id', 'table_id', 'waiter_id', 'total_amount', 'status'],
        roles: ['admin', 'waiter', 'cashier'],
        tenant: true,
        searchFields: ['status'],
    },
    order_items: {
        table: 'order_items',
        fields: ['order_id', 'menu_item_id', 'quantity', 'price'],
        roles: ['admin', 'waiter', 'cashier'],
        tenant: false,
        searchFields: ['quantity'],
    },
    payments: {
        table: 'payments',
        fields: ['restaurant_id', 'order_id', 'amount', 'payment_method'],
        roles: ['admin', 'cashier'],
        tenant: true,
        searchFields: ['payment_method'],
    },
    activity_logs: {
        table: 'activity_logs',
        fields: [],
        roles: ['admin'],
        tenant: true,
        searchFields: ['action', 'entity_type'],
    },
    backups: {
        table: 'backups',
        fields: [],
        roles: ['admin'],
        tenant: true,
        searchFields: ['file_name', 'status'],
    },
};
function pick(body, fields) {
    return fields.reduce((payload, field) => {
        if (Object.prototype.hasOwnProperty.call(body, field))
            payload[field] = body[field];
        return payload;
    }, {});
}
function tenantWhere(request, configItem, values) {
    if (!configItem.tenant || request.user?.role === 'admin')
        return '';
    values.push(request.user?.restaurantId || 0);
    return ' AND restaurant_id = ?';
}
export const crudRouter = Router();
crudRouter.use(requireAuth);
crudRouter.get('/users', requireRole('admin'), asyncHandler(async (request, response) => {
    const query = paginationSchema.parse(request.query);
    const db = await getPool();
    const offset = (query.page - 1) * query.limit;
    const values = [];
    let where = 'WHERE 1 = 1';
    if (request.user?.restaurantId) {
        where += ' AND (restaurant_id = ? OR restaurant_id IS NULL)';
        values.push(request.user.restaurantId);
    }
    if (query.search) {
        where += ' AND (name LIKE ? OR email LIKE ? OR role LIKE ?)';
        values.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
    }
    const [rows] = await db.query(`SELECT id, restaurant_id, name, email, role, is_active, created_at, updated_at FROM users ${where} ORDER BY id ${query.direction} LIMIT ? OFFSET ?`, [...values, query.limit, offset]);
    response.json(rows);
}));
crudRouter.post('/users', requireRole('admin'), asyncHandler(async (request, response) => {
    const data = userSchema.parse(request.body);
    const db = await getPool();
    const hash = await bcrypt.hash(data.password || 'ChangeMe123', config.auth.bcryptRounds);
    const [result] = await db.query('INSERT INTO users (restaurant_id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', [data.restaurant_id ?? request.user?.restaurantId ?? 1, data.name, data.email, hash, data.role, data.is_active ?? true]);
    await logActivity(db, request, 'User Creation', 'users', result.insertId, { email: data.email, role: data.role });
    response.status(201).json({ id: result.insertId, ...data, password: undefined });
}));
crudRouter.put('/users/:id', requireRole('admin'), asyncHandler(async (request, response) => {
    const data = userSchema.partial().parse(request.body);
    const db = await getPool();
    const updates = {};
    if (data.name)
        updates.name = data.name;
    if (data.email)
        updates.email = data.email;
    if (data.role)
        updates.role = data.role;
    if (typeof data.is_active === 'boolean')
        updates.is_active = data.is_active;
    if (data.restaurant_id !== undefined)
        updates.restaurant_id = data.restaurant_id;
    if (data.password)
        updates.password_hash = await bcrypt.hash(data.password, config.auth.bcryptRounds);
    const fields = Object.keys(updates);
    await db.query(`UPDATE users SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [
        ...fields.map((field) => updates[field]),
        request.params.id,
    ]);
    await logActivity(db, request, 'User Update', 'users', Number(request.params.id));
    response.json({ ok: true });
}));
crudRouter.delete('/users/:id', requireRole('admin'), asyncHandler(async (request, response) => {
    const db = await getPool();
    await db.query('DELETE FROM users WHERE id = ?', [request.params.id]);
    await logActivity(db, request, 'User Deletion', 'users', Number(request.params.id));
    response.status(204).send();
}));
for (const [name, resource] of Object.entries(resources)) {
    crudRouter.get(`/${name}`, requireRole(...resource.roles), asyncHandler(async (request, response) => {
        const query = paginationSchema.parse(request.query);
        const db = await getPool();
        const values = [];
        let where = 'WHERE 1 = 1';
        where += tenantWhere(request, resource, values);
        if (query.search && resource.searchFields.length) {
            where += ` AND (${resource.searchFields.map((field) => `${field} LIKE ?`).join(' OR ')})`;
            values.push(...resource.searchFields.map(() => `%${query.search}%`));
        }
        const offset = (query.page - 1) * query.limit;
        const [rows] = await db.query(`SELECT * FROM \`${resource.table}\` ${where} ORDER BY id ${query.direction} LIMIT ? OFFSET ?`, [...values, query.limit, offset]);
        response.json(rows);
    }));
    crudRouter.get(`/${name}/:id`, requireRole(...resource.roles), asyncHandler(async (request, response) => {
        const db = await getPool();
        const values = [request.params.id];
        let where = 'WHERE id = ?';
        where += tenantWhere(request, resource, values);
        const [rows] = await db.query(`SELECT * FROM \`${resource.table}\` ${where} LIMIT 1`, values);
        if (!rows.length) {
            response.status(404).json({ message: 'Record not found' });
            return;
        }
        response.json(rows[0]);
    }));
    if (resource.fields.length) {
        crudRouter.post(`/${name}`, requireRole(...resource.roles), asyncHandler(async (request, response) => {
            const db = await getPool();
            const payload = pick(request.body, resource.fields);
            if (resource.tenant && request.user?.role !== 'admin')
                payload.restaurant_id = request.user?.restaurantId;
            const fields = Object.keys(payload);
            const [result] = await db.query(`INSERT INTO \`${resource.table}\` (${fields.map((field) => `\`${field}\``).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, fields.map((field) => payload[field]));
            await logActivity(db, request, `${name} create`, name, result.insertId);
            response.status(201).json({ id: result.insertId, ...payload });
        }));
        crudRouter.put(`/${name}/:id`, requireRole(...resource.roles), asyncHandler(async (request, response) => {
            const db = await getPool();
            const payload = pick(request.body, resource.fields);
            const fields = Object.keys(payload);
            await db.query(`UPDATE \`${resource.table}\` SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`, [
                ...fields.map((field) => payload[field]),
                request.params.id,
            ]);
            await logActivity(db, request, `${name} update`, name, Number(request.params.id));
            response.json({ ok: true });
        }));
    }
    crudRouter.delete(`/${name}/:id`, requireRole(...resource.roles), asyncHandler(async (request, response) => {
        const db = await getPool();
        await db.query(`DELETE FROM \`${resource.table}\` WHERE id = ?`, [request.params.id]);
        await logActivity(db, request, `${name} delete`, name, Number(request.params.id));
        response.status(204).send();
    }));
}
