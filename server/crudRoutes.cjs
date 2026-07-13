const resources = {
  users: {
    table: 'users',
    fields: ['name', 'email', 'password', 'role'],
  },
  tables: {
    table: 'tables',
    fields: ['table_number', 'status'],
  },
  menu_items: {
    table: 'menu_items',
    fields: ['name', 'category', 'price', 'available'],
  },
  orders: {
    table: 'orders',
    fields: ['table_id', 'total_amount', 'status'],
  },
  order_items: {
    table: 'order_items',
    fields: ['order_id', 'menu_item_id', 'quantity', 'price'],
  },
  payments: {
    table: 'payments',
    fields: ['order_id', 'amount', 'payment_method'],
  },
};

function quoteTable(table) {
  return table === 'tables' ? '`tables`' : table;
}

function pickPayload(body, allowedFields) {
  return allowedFields.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
    return payload;
  }, {});
}

function registerCrudRoutes(app, getPool) {
  for (const [resourceName, config] of Object.entries(resources)) {
    const route = `/api/${resourceName}`;
    const table = quoteTable(config.table);

    app.get(route, async (_request, response) => {
      try {
        const db = await getPool();
        const [rows] = await db.query(`SELECT * FROM ${table} ORDER BY id DESC`);
        response.json(rows);
      } catch (error) {
        response.status(500).json({ message: `Unable to list ${resourceName}`, detail: error.message });
      }
    });

    app.get(`${route}/:id`, async (request, response) => {
      try {
        const db = await getPool();
        const [rows] = await db.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [request.params.id]);
        if (!rows.length) {
          response.status(404).json({ message: `${resourceName} record not found` });
          return;
        }
        response.json(rows[0]);
      } catch (error) {
        response.status(500).json({ message: `Unable to get ${resourceName}`, detail: error.message });
      }
    });

    app.post(route, async (request, response) => {
      try {
        const payload = pickPayload(request.body, config.fields);
        const fields = Object.keys(payload);
        if (!fields.length) {
          response.status(400).json({ message: 'No valid fields provided' });
          return;
        }

        const db = await getPool();
        const placeholders = fields.map(() => '?').join(', ');
        const columns = fields.map((field) => `\`${field}\``).join(', ');
        const [result] = await db.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, fields.map((field) => payload[field]));
        const [rows] = await db.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [result.insertId]);
        response.status(201).json(rows[0]);
      } catch (error) {
        response.status(500).json({ message: `Unable to create ${resourceName}`, detail: error.message });
      }
    });

    app.put(`${route}/:id`, async (request, response) => {
      try {
        const payload = pickPayload(request.body, config.fields);
        const fields = Object.keys(payload);
        if (!fields.length) {
          response.status(400).json({ message: 'No valid fields provided' });
          return;
        }

        const db = await getPool();
        const assignments = fields.map((field) => `\`${field}\` = ?`).join(', ');
        const values = fields.map((field) => payload[field]);
        const [result] = await db.query(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [...values, request.params.id]);
        if (result.affectedRows === 0) {
          response.status(404).json({ message: `${resourceName} record not found` });
          return;
        }
        const [rows] = await db.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [request.params.id]);
        response.json(rows[0]);
      } catch (error) {
        response.status(500).json({ message: `Unable to update ${resourceName}`, detail: error.message });
      }
    });

    app.delete(`${route}/:id`, async (request, response) => {
      try {
        const db = await getPool();
        const [result] = await db.query(`DELETE FROM ${table} WHERE id = ?`, [request.params.id]);
        if (result.affectedRows === 0) {
          response.status(404).json({ message: `${resourceName} record not found` });
          return;
        }
        response.status(204).send();
      } catch (error) {
        response.status(500).json({ message: `Unable to delete ${resourceName}`, detail: error.message });
      }
    });
  }
}

module.exports = { registerCrudRoutes };
