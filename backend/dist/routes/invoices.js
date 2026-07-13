import { Router } from 'express';
import { getPool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createBillPdf } from '../services/pdf.js';
import { logActivity } from '../services/activity.js';
export const invoicesRouter = Router();
invoicesRouter.use(requireAuth, requireRole('admin', 'cashier'));
invoicesRouter.post('/orders/:orderId', asyncHandler(async (request, response) => {
    const db = await getPool();
    const [[order]] = await db.query(`SELECT o.*, t.table_number FROM orders o LEFT JOIN \`tables\` t ON t.id = o.table_id WHERE o.id = ? LIMIT 1`, [request.params.orderId]);
    if (!order) {
        response.status(404).json({ message: 'Order not found' });
        return;
    }
    const taxAmount = Number(order.total_amount) * 0.05;
    const discountAmount = Number(request.body.discount_amount || 0);
    const grandTotal = Number(order.total_amount) + taxAmount - discountAmount;
    const invoiceNumber = `ZH-${Date.now()}-${order.id}`;
    await db.query('INSERT INTO invoices (restaurant_id, order_id, invoice_number, tax_amount, discount_amount, grand_total, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)', [order.restaurant_id || request.user?.restaurantId || 1, order.id, invoiceNumber, taxAmount, discountAmount, grandTotal, request.body.payment_method || 'cash']);
    await logActivity(db, request, 'Invoice Generated', 'orders', order.id, { invoiceNumber });
    response.status(201).json({ invoiceNumber, taxAmount, discountAmount, grandTotal });
}));
invoicesRouter.get('/orders/:orderId/pdf', asyncHandler(async (request, response) => {
    const db = await getPool();
    const [[invoice]] = await db.query(`SELECT i.*, o.table_id, t.table_number FROM invoices i JOIN orders o ON o.id = i.order_id LEFT JOIN \`tables\` t ON t.id = o.table_id WHERE i.order_id = ? ORDER BY i.id DESC LIMIT 1`, [request.params.orderId]);
    if (!invoice) {
        response.status(404).json({ message: 'Invoice not found' });
        return;
    }
    const [items] = await db.query(`SELECT mi.name, oi.quantity, oi.price FROM order_items oi LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id WHERE oi.order_id = ?`, [request.params.orderId]);
    const pdf = await createBillPdf({
        invoiceNumber: invoice.invoice_number,
        tableNumber: invoice.table_number || invoice.table_id,
        items,
        taxAmount: Number(invoice.tax_amount),
        discountAmount: Number(invoice.discount_amount),
        grandTotal: Number(invoice.grand_total),
        paymentMethod: invoice.payment_method,
    });
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    response.send(pdf);
}));
