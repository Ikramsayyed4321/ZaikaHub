import { Router } from 'express';
import { getPool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toCsv } from '../services/csv.js';
export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole('admin', 'cashier'));
function dateRange(request) {
    return {
        from: String(request.query.from || new Date().toISOString().slice(0, 10)),
        to: String(request.query.to || new Date().toISOString().slice(0, 10)),
        restaurantId: request.user?.restaurantId || Number(request.query.restaurant_id || 1),
    };
}
reportsRouter.get('/dashboard', asyncHandler(async (request, response) => {
    const db = await getPool();
    const { from, to, restaurantId } = dateRange(request);
    const [[sales]] = await db.query(`SELECT COALESCE(SUM(amount),0) total_sales FROM payments WHERE restaurant_id = ? AND DATE(payment_date) BETWEEN ? AND ?`, [restaurantId, from, to]);
    const [[orders]] = await db.query(`SELECT COUNT(*) total_orders, SUM(status='pending') pending_orders, SUM(status='completed') completed_orders FROM orders WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?`, [restaurantId, from, to]);
    const [[tables]] = await db.query(`SELECT SUM(status='occupied') occupied_tables, SUM(status='available') available_tables FROM \`tables\` WHERE restaurant_id = ?`, [restaurantId]);
    const [category] = await db.query(`SELECT mi.category name, SUM(oi.quantity * oi.price) value
       FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id JOIN orders o ON o.id = oi.order_id
       WHERE o.restaurant_id = ? AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY mi.category`, [restaurantId, from, to]);
    const [topItems] = await db.query(`SELECT mi.name, SUM(oi.quantity) quantity, SUM(oi.quantity * oi.price) sales
       FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id JOIN orders o ON o.id = oi.order_id
       WHERE o.restaurant_id = ? AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY mi.id, mi.name ORDER BY quantity DESC LIMIT 10`, [restaurantId, from, to]);
    const [line] = await db.query(`SELECT DATE(payment_date) date, SUM(amount) sales FROM payments WHERE restaurant_id = ? AND DATE(payment_date) BETWEEN ? AND ? GROUP BY DATE(payment_date) ORDER BY date`, [restaurantId, from, to]);
    response.json({ sales, orders, tables, revenueByCategory: category, topItems, line });
}));
reportsRouter.get('/sales', asyncHandler(async (request, response) => {
    const db = await getPool();
    const { from, to, restaurantId } = dateRange(request);
    const [rows] = await db.query(`SELECT DATE(payment_date) date, payment_method, COUNT(*) payments, SUM(amount) amount
       FROM payments WHERE restaurant_id = ? AND DATE(payment_date) BETWEEN ? AND ?
       GROUP BY DATE(payment_date), payment_method ORDER BY date DESC`, [restaurantId, from, to]);
    if (request.query.format === 'csv') {
        response.setHeader('Content-Type', 'text/csv');
        response.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
        response.send(toCsv(rows));
        return;
    }
    response.json(rows);
}));
