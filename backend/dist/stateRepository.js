function dbStatusToUiStatus(status) {
    return status === 'completed' ? 'Ready' : 'New';
}
function uiStatusToDbStatus(status) {
    return status === 'Completed' ? 'completed' : 'pending';
}
async function ensureTable(db, restaurantId, tableNumber) {
    const [[existing]] = await db.query('SELECT id FROM `tables` WHERE restaurant_id = ? AND table_number = ? LIMIT 1', [
        restaurantId,
        tableNumber,
    ]);
    if (existing)
        return Number(existing.id);
    const [result] = await db.query('INSERT INTO `tables` (restaurant_id, table_number, status) VALUES (?, ?, ?)', [
        restaurantId,
        tableNumber,
        'available',
    ]);
    return Number(result.insertId);
}
export async function readState(db, restaurantId = 1) {
    const [menuRows] = await db.query('SELECT id, name, category, price, available FROM menu_items WHERE restaurant_id = ? ORDER BY id', [
        restaurantId,
    ]);
    const [userRows] = await db.query('SELECT id, name, email, role, is_active FROM users WHERE restaurant_id = ? ORDER BY id', [restaurantId]);
    const [orderRows] = await db.query(`SELECT o.id, o.table_id, t.table_number, o.total_amount, o.status, o.created_at
     FROM orders o LEFT JOIN \`tables\` t ON t.id = o.table_id WHERE o.restaurant_id = ? ORDER BY o.created_at DESC, o.id DESC`, [restaurantId]);
    const [itemRows] = await db.query(`SELECT oi.order_id, oi.menu_item_id, oi.quantity, oi.price, mi.name, mi.category, mi.available
     FROM order_items oi LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id`);
    const [paymentRows] = await db.query('SELECT order_id, amount, payment_date FROM payments WHERE restaurant_id = ?', [restaurantId]);
    const paymentsByOrder = new Map(paymentRows.map((row) => [Number(row.order_id), row]));
    const itemsByOrder = itemRows.reduce((map, row) => {
        const item = {
            menuItem: {
                id: Number(row.menu_item_id || 0),
                name: row.name || 'Deleted item',
                price: Number(row.price),
                category: row.category || 'Veg',
                available: Boolean(row.available ?? true),
                isVeg: row.category !== 'Non-Veg',
            },
            quantity: Number(row.quantity),
        };
        map.set(Number(row.order_id), [...(map.get(Number(row.order_id)) || []), item]);
        return map;
    }, new Map());
    const orders = [];
    const orderHistory = [];
    for (const row of orderRows) {
        const order = {
            id: Number(row.id),
            tableNo: Number(row.table_number || 1),
            items: itemsByOrder.get(Number(row.id)) || [],
            status: dbStatusToUiStatus(row.status),
            time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            total: Number(row.total_amount || 0),
        };
        const payment = paymentsByOrder.get(order.id);
        if (row.status === 'completed' || payment) {
            orderHistory.push({
                id: order.id,
                tableNo: order.tableNo,
                timestamp: payment ? new Date(payment.payment_date).toISOString() : new Date(row.created_at).toISOString(),
                orders: [order],
                grandTotal: Number(payment?.amount || row.total_amount || 0),
            });
        }
        else {
            orders.push(order);
        }
    }
    return {
        activeRole: null,
        settings: { restaurantName: 'Zaika Hub', taxRate: 5 },
        menuItems: menuRows.map((row) => ({
            id: Number(row.id),
            name: row.name,
            category: row.category,
            price: Number(row.price),
            available: Boolean(row.available),
            isVeg: row.category !== 'Non-Veg',
        })),
        orders,
        staff: userRows.map((row) => ({
            id: Number(row.id),
            name: row.name,
            role: row.role === 'admin' ? 'Admin' : row.role === 'cashier' ? 'Cashier' : 'Waiter',
            phone: row.email || '',
            present: Boolean(row.is_active),
        })),
        orderHistory,
    };
}
export async function replaceState(db, state, restaurantId = 1) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE oi FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.restaurant_id = ?', [restaurantId]);
        await connection.query('DELETE FROM payments WHERE restaurant_id = ?', [restaurantId]);
        await connection.query('DELETE FROM orders WHERE restaurant_id = ?', [restaurantId]);
        await connection.query('DELETE FROM menu_items WHERE restaurant_id = ?', [restaurantId]);
        if (state.menuItems?.length) {
            await connection.query('INSERT INTO menu_items (id, restaurant_id, name, category, price, available) VALUES ?', [
                state.menuItems.map((item) => [item.id, restaurantId, item.name, item.category, item.price, item.available]),
            ]);
        }
        const activeTables = new Set();
        const payloads = [
            ...(state.orders || []).map((order) => ({ order, completed: false, paidAt: null, amount: null })),
            ...(state.orderHistory || []).flatMap((entry) => entry.orders.map((order) => ({ order, completed: true, paidAt: entry.timestamp, amount: entry.grandTotal }))),
        ];
        for (const payload of payloads) {
            const tableId = await ensureTable(db, restaurantId, payload.order.tableNo);
            if (!payload.completed)
                activeTables.add(tableId);
            await connection.query('INSERT INTO orders (id, restaurant_id, table_id, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(? / 1000))', [
                payload.order.id,
                restaurantId,
                tableId,
                payload.order.total,
                payload.completed ? 'completed' : uiStatusToDbStatus(payload.order.status),
                payload.order.id,
            ]);
            if (payload.order.items?.length) {
                await connection.query('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ?', [
                    payload.order.items.map((item) => [payload.order.id, item.menuItem.id || null, item.quantity, item.menuItem.price]),
                ]);
            }
            if (payload.completed) {
                await connection.query('INSERT INTO payments (restaurant_id, order_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?, ?)', [
                    restaurantId,
                    payload.order.id,
                    payload.amount || payload.order.total,
                    'cash',
                    payload.paidAt ? new Date(payload.paidAt) : new Date(),
                ]);
            }
        }
        await connection.query('UPDATE `tables` SET status = ? WHERE restaurant_id = ?', ['available', restaurantId]);
        for (const tableId of activeTables) {
            await connection.query('UPDATE `tables` SET status = ? WHERE id = ?', ['occupied', tableId]);
        }
        await connection.commit();
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
