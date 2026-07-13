function dbStatusToUiStatus(status) {
  return status === 'completed' ? 'Ready' : 'New';
}

function uiStatusToDbStatus(status) {
  return status === 'Completed' ? 'completed' : 'pending';
}

async function ensureTable(connection, tableNumber) {
  const [[existing]] = await connection.query('SELECT id FROM `tables` WHERE table_number = ? LIMIT 1', [tableNumber]);
  if (existing) return existing.id;

  const [result] = await connection.query('INSERT INTO `tables` (table_number, status) VALUES (?, ?)', [tableNumber, 'available']);
  return result.insertId;
}

async function readState(db) {
  const [menuRows] = await db.query('SELECT id, name, category, price, available FROM menu_items ORDER BY id');
  const [userRows] = await db.query('SELECT id, name, email, role FROM users ORDER BY id');
  const [orderRows] = await db.query(`
    SELECT o.id, o.table_id, t.table_number, o.total_amount, o.status, o.created_at
    FROM orders o
    LEFT JOIN \`tables\` t ON t.id = o.table_id
    ORDER BY o.created_at DESC, o.id DESC
  `);
  const [itemRows] = await db.query(`
    SELECT oi.order_id, oi.menu_item_id, oi.quantity, oi.price, mi.name, mi.category, mi.available
    FROM order_items oi
    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
    ORDER BY oi.id
  `);
  const [paymentRows] = await db.query('SELECT order_id, amount, payment_date FROM payments ORDER BY payment_date DESC');

  const paymentsByOrder = paymentRows.reduce((map, row) => {
    map.set(Number(row.order_id), row);
    return map;
  }, new Map());

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

  const activeOrders = [];
  const orderHistory = [];

  for (const row of orderRows) {
    const order = {
      id: Number(row.id),
      tableNo: Number(row.table_number || row.table_id || 1),
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
    } else {
      activeOrders.push(order);
    }
  }

  return {
    activeRole: null,
    settings: {
      restaurantName: 'The Grand Spoon',
      taxRate: 5,
    },
    menuItems: menuRows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      category: row.category,
      price: Number(row.price),
      available: Boolean(row.available),
      isVeg: row.category !== 'Non-Veg',
    })),
    orders: activeOrders,
    staff: userRows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      role: row.role === 'admin' ? 'Admin' : row.role === 'cashier' ? 'Cashier' : 'Waiter',
      phone: row.email || '',
      present: true,
    })),
    orderHistory,
  };
}

async function replaceState(db, state) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM payments');
    await connection.query('DELETE FROM order_items');
    await connection.query('DELETE FROM orders');
    await connection.query('DELETE FROM menu_items');
    await connection.query('DELETE FROM users');

    if (state.menuItems.length) {
      await connection.query('INSERT INTO menu_items (id, name, category, price, available) VALUES ?', [
        state.menuItems.map((item) => [item.id, item.name, item.category, item.price, item.available]),
      ]);
    }

    if (state.staff.length) {
      await connection.query('INSERT INTO users (id, name, email, password, role) VALUES ?', [
        state.staff.map((member) => [
          member.id,
          member.name,
          member.phone && member.phone.includes('@') ? member.phone : `${member.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@restaurant.local`,
          '$2b$10$development-placeholder',
          member.role.toLowerCase().includes('admin') ? 'admin' : member.role.toLowerCase().includes('cashier') ? 'cashier' : 'waiter',
        ]),
      ]);
    }

    const orderPayloads = [
      ...state.orders.map((order) => ({ order, completed: false, paidAt: null, amount: null })),
      ...(state.orderHistory || []).flatMap((entry) =>
        entry.orders.map((order) => ({ order, completed: true, paidAt: entry.timestamp, amount: entry.grandTotal })),
      ),
    ];

    const activeTableIds = new Set();

    for (const payload of orderPayloads) {
      const tableId = await ensureTable(connection, payload.order.tableNo);
      if (!payload.completed) activeTableIds.add(tableId);
      await connection.query(
        'INSERT INTO orders (id, table_id, total_amount, status, created_at) VALUES (?, ?, ?, ?, FROM_UNIXTIME(? / 1000))',
        [payload.order.id, tableId, payload.order.total, payload.completed ? 'completed' : uiStatusToDbStatus(payload.order.status), payload.order.id],
      );

      if (payload.order.items.length) {
        await connection.query('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ?', [
          payload.order.items.map((item) => [payload.order.id, item.menuItem.id || null, item.quantity, item.menuItem.price]),
        ]);
      }

      if (payload.completed) {
        await connection.query(
          'INSERT INTO payments (order_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?)',
          [payload.order.id, payload.amount || payload.order.total, 'cash', payload.paidAt ? new Date(payload.paidAt) : new Date()],
        );
      }
    }

    await connection.query('UPDATE `tables` SET status = ?', ['available']);
    for (const tableId of activeTableIds) {
      await connection.query('UPDATE `tables` SET status = ? WHERE id = ?', ['occupied', tableId]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { readState, replaceState };
