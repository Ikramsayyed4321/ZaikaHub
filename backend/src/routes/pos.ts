import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthRequest } from '../types.js';

export const posRouter = Router();

const menuCategorySchema = z.enum(['Thali', 'Veg', 'Non-Veg', 'Desserts', 'Cold Drinks']);
const orderStatusSchema = z.enum(['New', 'Preparing', 'Ready', 'Completed']);

const createOrderSchema = z.object({
  tableNo: z.number().int().min(1).max(500),
  items: z.array(z.object({ menuItemId: z.number().int().positive(), quantity: z.number().int().positive().max(100) })).min(1).max(100),
});

const updateOrderSchema = z.object({
  status: orderStatusSchema,
});

const paymentSchema = z.object({
  tableNo: z.number().int().min(1).max(500),
  amount: z.number().positive().max(1_000_000),
  paymentMethod: z.string().trim().min(1).max(50).optional().default('cash'),
});

const createMenuSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: menuCategorySchema,
  price: z.number().positive().max(1_000_000),
  available: z.boolean().default(true),
  isVeg: z.boolean().optional(),
});

const updateMenuSchema = createMenuSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
});

function requireTenant(request: AuthRequest) {
  const restaurantId = request.user?.restaurantId;
  if (!restaurantId) throw Object.assign(new Error('Tenant context is required'), { statusCode: 403, code: 'TENANT_REQUIRED' });
  return restaurantId;
}

function toDbStatus(status: z.infer<typeof orderStatusSchema>) {
  if (status === 'Completed') return 'completed';
  if (status === 'Ready') return 'ready';
  if (status === 'Preparing') return 'preparing';
  return 'pending';
}

function toUiStatus(status: string) {
  if (status === 'completed') return 'Completed';
  if (status === 'ready') return 'Ready';
  if (status === 'preparing') return 'Preparing';
  return 'New';
}

async function ensureTable(connection: Awaited<ReturnType<Awaited<ReturnType<typeof getPool>>['getConnection']>>, restaurantId: number, tableNo: number) {
  const [[existing]] = await connection.query<any[]>('SELECT id FROM `tables` WHERE restaurant_id = ? AND table_number = ? LIMIT 1', [
    restaurantId,
    tableNo,
  ]);
  if (existing) return Number(existing.id);
  const [result] = await connection.query<any>('INSERT INTO `tables` (restaurant_id, table_number, status) VALUES (?, ?, ?)', [
    restaurantId,
    tableNo,
    'available',
  ]);
  return Number(result.insertId);
}

async function readOrder(connection: Awaited<ReturnType<Awaited<ReturnType<typeof getPool>>['getConnection']>>, restaurantId: number, orderId: number) {
  const [[order]] = await connection.query<any[]>(
    `SELECT o.id, o.total_amount, o.status, o.created_at, t.table_number
     FROM orders o JOIN \`tables\` t ON t.id = o.table_id
     WHERE o.id = ? AND o.restaurant_id = ? LIMIT 1`,
    [orderId, restaurantId],
  );
  if (!order) return null;
  const [items] = await connection.query<any[]>(
    `SELECT mi.id, mi.name, mi.category, mi.available, oi.quantity, oi.price
     FROM order_items oi LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id = ?`,
    [orderId],
  );
  return {
    id: Number(order.id),
    tableNo: Number(order.table_number),
    items: items.map((item) => ({
      menuItem: {
        id: Number(item.id || 0),
        name: item.name || 'Deleted item',
        price: Number(item.price),
        category: item.category || 'Veg',
        available: Boolean(item.available ?? true),
        isVeg: item.category !== 'Non-Veg',
      },
      quantity: Number(item.quantity),
    })),
    status: toUiStatus(order.status),
    time: new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    total: Number(order.total_amount || 0),
  };
}

posRouter.use(requireAuth);

posRouter.post(
  '/orders',
  requireRole('admin', 'waiter', 'cashier'),
  asyncHandler(async (request: AuthRequest, response) => {
    const restaurantId = requireTenant(request);
    const payload = createOrderSchema.parse(request.body);
    const db = await getPool();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const tableId = await ensureTable(connection, restaurantId, payload.tableNo);
      const ids = payload.items.map((item) => item.menuItemId);
      const [menuItems] = await connection.query<any[]>(
        `SELECT id, price FROM menu_items WHERE restaurant_id = ? AND available = TRUE AND id IN (${ids.map(() => '?').join(',')}) FOR UPDATE`,
        [restaurantId, ...ids],
      );
      const menuById = new Map(menuItems.map((item) => [Number(item.id), Number(item.price)]));
      if (menuById.size !== new Set(ids).size) {
        response.status(422).json({ code: 'INVALID_MENU_ITEM', message: 'One or more menu items are unavailable' });
        await connection.rollback();
        return;
      }
      const total = payload.items.reduce((sum, item) => sum + (menuById.get(item.menuItemId) || 0) * item.quantity, 0);
      const [result] = await connection.query<any>(
        'INSERT INTO orders (restaurant_id, table_id, waiter_id, total_amount, status) VALUES (?, ?, ?, ?, ?)',
        [restaurantId, tableId, request.user?.id || null, total, 'pending'],
      );
      await connection.query('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ?', [
        payload.items.map((item) => [result.insertId, item.menuItemId, item.quantity, menuById.get(item.menuItemId)]),
      ]);
      await connection.query('UPDATE `tables` SET status = ? WHERE id = ? AND restaurant_id = ?', ['occupied', tableId, restaurantId]);
      const order = await readOrder(connection, restaurantId, result.insertId);
      await connection.commit();
      response.status(201).json(order);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

posRouter.patch(
  '/orders/:id',
  requireRole('admin', 'waiter', 'cashier'),
  asyncHandler(async (request: AuthRequest, response) => {
    const restaurantId = requireTenant(request);
    const payload = updateOrderSchema.parse(request.body);
    const db = await getPool();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query<any>('UPDATE orders SET status = ? WHERE id = ? AND restaurant_id = ?', [
        toDbStatus(payload.status),
        request.params.id,
        restaurantId,
      ]);
      if (!result.affectedRows) {
        await connection.rollback();
        response.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
        return;
      }
      const order = await readOrder(connection, restaurantId, Number(request.params.id));
      await connection.commit();
      response.json(order);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

posRouter.delete(
  '/orders/:id',
  requireRole('admin', 'waiter', 'cashier'),
  asyncHandler(async (request: AuthRequest, response) => {
    const restaurantId = requireTenant(request);
    const db = await getPool();
    const [result] = await db.query<any>('DELETE FROM orders WHERE id = ? AND restaurant_id = ?', [request.params.id, restaurantId]);
    if (!result.affectedRows) {
      response.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }
    response.json({ ok: true });
  }),
);

posRouter.post(
  '/payments',
  requireRole('admin', 'cashier'),
  asyncHandler(async (request: AuthRequest, response) => {
    const restaurantId = requireTenant(request);
    const payload = paymentSchema.parse(request.body);
    const db = await getPool();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[table]] = await connection.query<any[]>('SELECT id FROM `tables` WHERE restaurant_id = ? AND table_number = ? LIMIT 1 FOR UPDATE', [
        restaurantId,
        payload.tableNo,
      ]);
      if (!table) {
        await connection.rollback();
        response.status(404).json({ code: 'TABLE_NOT_FOUND', message: 'Table not found' });
        return;
      }
      const [orders] = await connection.query<any[]>(
        "SELECT id, total_amount FROM orders WHERE restaurant_id = ? AND table_id = ? AND status <> 'completed' FOR UPDATE",
        [restaurantId, table.id],
      );
      if (!orders.length) {
        await connection.rollback();
        response.status(404).json({ code: 'NO_ACTIVE_ORDERS', message: 'No active orders found for this table' });
        return;
      }
      const subtotal = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      for (const order of orders) {
        const share = subtotal > 0 ? (Number(order.total_amount || 0) / subtotal) * payload.amount : payload.amount / orders.length;
        await connection.query('INSERT INTO payments (restaurant_id, order_id, amount, payment_method) VALUES (?, ?, ?, ?)', [
          restaurantId,
          order.id,
          share,
          payload.paymentMethod,
        ]);
      }
      await connection.query("UPDATE orders SET status = 'completed' WHERE restaurant_id = ? AND table_id = ? AND status <> 'completed'", [
        restaurantId,
        table.id,
      ]);
      await connection.query('UPDATE `tables` SET status = ? WHERE id = ? AND restaurant_id = ?', ['available', table.id, restaurantId]);
      await connection.commit();
      response.status(201).json({ ok: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }),
);

posRouter.post(
  '/menu',
  requireRole('admin', 'cashier'),
  asyncHandler(async (request: AuthRequest, response) => {
    const restaurantId = requireTenant(request);
    const payload = createMenuSchema.parse(request.body);
    const db = await getPool();
    const [result] = await db.query<any>('INSERT INTO menu_items (restaurant_id, name, category, price, available) VALUES (?, ?, ?, ?, ?)', [
      restaurantId,
      payload.name,
      payload.category,
      payload.price,
      payload.available,
    ]);
    response.status(201).json({ id: result.insertId, ...payload, isVeg: payload.category !== 'Non-Veg' });
  }),
);

posRouter.patch(
  '/menu/:id',
  requireRole('admin', 'cashier'),
  asyncHandler(async (request: AuthRequest, response) => {
    const restaurantId = requireTenant(request);
    const payload = updateMenuSchema.parse(request.body);
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.category !== undefined) updates.category = payload.category;
    if (payload.price !== undefined) updates.price = payload.price;
    if (payload.available !== undefined) updates.available = payload.available;
    const fields = Object.keys(updates);
    const db = await getPool();
    await db.query(`UPDATE menu_items SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ? AND restaurant_id = ?`, [
      ...fields.map((field) => updates[field]),
      request.params.id,
      restaurantId,
    ]);
    const [[item]] = await db.query<any[]>('SELECT id, name, category, price, available FROM menu_items WHERE id = ? AND restaurant_id = ? LIMIT 1', [
      request.params.id,
      restaurantId,
    ]);
    if (!item) {
      response.status(404).json({ code: 'MENU_ITEM_NOT_FOUND', message: 'Menu item not found' });
      return;
    }
    response.json({
      id: Number(item.id),
      name: item.name,
      category: item.category,
      price: Number(item.price),
      available: Boolean(item.available),
      isVeg: item.category !== 'Non-Veg',
    });
  }),
);

posRouter.delete(
  '/menu/:id',
  requireRole('admin', 'cashier'),
  asyncHandler(async (request: AuthRequest, response) => {
    const restaurantId = requireTenant(request);
    const db = await getPool();
    const [result] = await db.query<any>('DELETE FROM menu_items WHERE id = ? AND restaurant_id = ?', [request.params.id, restaurantId]);
    if (!result.affectedRows) {
      response.status(404).json({ code: 'MENU_ITEM_NOT_FOUND', message: 'Menu item not found' });
      return;
    }
    response.json({ ok: true });
  }),
);
