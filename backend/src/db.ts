import mysql, { Pool, PoolConnection, PoolOptions, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { config, isDevelopment } from './config.js';

let pool: Pool | undefined;

function databaseConfig(includeDatabase: boolean): PoolOptions {
  const url = config.database.url ? new URL(config.database.url) : undefined;
  const database = includeDatabase ? url?.pathname.replace(/^\//, '') || config.database.name : undefined;
  return {
    host: url?.hostname || config.database.host,
    port: Number(url?.port || config.database.port),
    user: url ? decodeURIComponent(url.username) : config.database.user,
    password: url ? decodeURIComponent(url.password) : config.database.password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: config.database.ssl ? { rejectUnauthorized: config.database.sslVerify } : undefined,
  };
}

const baseConfig = databaseConfig(false);
const poolConfig = databaseConfig(true);
const databaseName = poolConfig.database || config.database.name;

const databaseExistsCodes = new Set(['ER_DB_CREATE_EXISTS']);
const createDatabaseDeniedCodes = new Set(['ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR']);

export async function ensureDatabase() {
  let connection: Awaited<ReturnType<typeof mysql.createConnection>> | undefined;
  try {
    connection = await mysql.createConnection(baseConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (!code || (!createDatabaseDeniedCodes.has(code) && !databaseExistsCodes.has(code))) throw error;
    console.warn(`Skipping CREATE DATABASE for ${databaseName}: ${code}. The database must already exist.`);
  } finally {
    await connection?.end();
  }
}

export async function getPool() {
  if (!pool) {
    await ensureDatabase();
    pool = mysql.createPool(poolConfig);
    await runMigrations(pool);
  }
  return pool;
}

async function hasColumn(db: PoolConnection | Pool, table: string, column: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [databaseName, table, column],
  );
  return rows.length > 0;
}

async function addColumnIfMissing(db: Pool, table: string, column: string, definition: string) {
  if (!(await hasColumn(db, table, column))) {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  }
}

async function addIndex(db: Pool, sql: string) {
  try {
    await db.query(sql);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'ER_DUP_KEYNAME') throw error;
  }
}

async function runMigrations(db: Pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      address VARCHAR(255),
      gst_number VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(255)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NULL,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password_hash VARCHAR(255),
      role ENUM('admin','waiter','cashier') NOT NULL DEFAULT 'waiter',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL
    )
  `);

  await addColumnIfMissing(db, 'users', 'restaurant_id', 'restaurant_id INT NULL');
  await addColumnIfMissing(db, 'users', 'password_hash', 'password_hash VARCHAR(255)');
  await addColumnIfMissing(db, 'users', 'is_active', 'is_active BOOLEAN DEFAULT TRUE');
  await addColumnIfMissing(db, 'users', 'created_at', 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfMissing(db, 'users', 'updated_at', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  await db.query(`
    CREATE TABLE IF NOT EXISTS \`tables\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NULL,
      table_number INT UNIQUE,
      status ENUM('available','occupied') DEFAULT 'available',
      assigned_waiter_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_waiter_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await addColumnIfMissing(db, 'tables', 'restaurant_id', 'restaurant_id INT NULL');
  await addColumnIfMissing(db, 'tables', 'assigned_waiter_id', 'assigned_waiter_id INT NULL');

  await db.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NULL,
      name VARCHAR(100),
      category VARCHAR(50),
      price DECIMAL(10,2),
      available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    )
  `);

  await addColumnIfMissing(db, 'menu_items', 'restaurant_id', 'restaurant_id INT NULL');
  await db.query('UPDATE menu_items SET restaurant_id = 1 WHERE restaurant_id IS NULL');

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NULL,
      table_id INT,
      waiter_id INT NULL,
      total_amount DECIMAL(10,2),
      status ENUM('pending','completed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (table_id) REFERENCES \`tables\`(id) ON DELETE SET NULL,
      FOREIGN KEY (waiter_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await addColumnIfMissing(db, 'orders', 'restaurant_id', 'restaurant_id INT NULL');
  await addColumnIfMissing(db, 'orders', 'waiter_id', 'waiter_id INT NULL');
  await addColumnIfMissing(db, 'orders', 'updated_at', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await db.query("ALTER TABLE orders MODIFY status ENUM('pending','preparing','ready','completed') DEFAULT 'pending'");
  await db.query('UPDATE orders SET restaurant_id = 1 WHERE restaurant_id IS NULL');

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      menu_item_id INT,
      quantity INT,
      price DECIMAL(10,2),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NULL,
      order_id INT,
      amount DECIMAL(10,2),
      payment_method VARCHAR(50),
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await addColumnIfMissing(db, 'payments', 'restaurant_id', 'restaurant_id INT NULL');
  await db.query('UPDATE payments SET restaurant_id = 1 WHERE restaurant_id IS NULL');

  await db.query(`
    CREATE TABLE IF NOT EXISTS login_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      restaurant_id INT NULL,
      email VARCHAR(100),
      ip_address VARCHAR(80),
      user_agent VARCHAR(255),
      status ENUM('success','failed','logout') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS refresh_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      restaurant_id INT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      family_id CHAR(36) NOT NULL,
      jti CHAR(36) NOT NULL UNIQUE,
      user_agent VARCHAR(255),
      ip_address VARCHAR(80),
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP NULL,
      replaced_by_jti CHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NULL,
      user_id INT NULL,
      action VARCHAR(120) NOT NULL,
      entity_type VARCHAR(80),
      entity_id INT NULL,
      metadata JSON NULL,
      ip_address VARCHAR(80),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NOT NULL,
      order_id INT NOT NULL,
      invoice_number VARCHAR(80) NOT NULL UNIQUE,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      discount_amount DECIMAL(10,2) DEFAULT 0,
      grand_total DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sales_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NOT NULL,
      report_type ENUM('daily','weekly','monthly','item','category','payment') NOT NULL,
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      data JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS backups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_id INT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      status ENUM('created','restored','failed') NOT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await addIndex(db, 'CREATE INDEX idx_menu_restaurant ON menu_items (restaurant_id, category, available)');
  await addIndex(db, 'CREATE INDEX idx_orders_restaurant_status_date ON orders (restaurant_id, status, created_at)');
  await addIndex(db, 'CREATE INDEX idx_payments_restaurant_date ON payments (restaurant_id, payment_date)');
  await addIndex(db, 'CREATE INDEX idx_activity_restaurant_date ON activity_logs (restaurant_id, created_at)');
  await addIndex(db, 'CREATE INDEX idx_order_items_order ON order_items (order_id)');
  await addIndex(db, 'CREATE INDEX idx_tables_restaurant_number ON `tables` (restaurant_id, table_number)');
  await addIndex(db, 'CREATE INDEX idx_refresh_sessions_user ON refresh_sessions (user_id, revoked_at, expires_at)');
  await addIndex(db, 'CREATE INDEX idx_refresh_sessions_family ON refresh_sessions (family_id, revoked_at)');

  await seedData(db);
  await db.query('INSERT IGNORE INTO migrations (name) VALUES (?)', ['001_core_saas_auth_reports']);
}

async function seedData(db: Pool) {
  const [[restaurantCount]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM restaurants');
  if (restaurantCount.count === 0) {
    await db.query('INSERT INTO restaurants (id, name, address, gst_number) VALUES (?, ?, ?, ?)', [
      1,
      config.restaurant.name,
      config.restaurant.address,
      config.restaurant.gstNumber,
    ]);
  }

  await db.query("INSERT IGNORE INTO roles (name, description) VALUES ('admin','Full access'),('waiter','Order and table operations'),('cashier','Billing and reports')");

  const permissions = [
    'users.manage',
    'menu.manage',
    'tables.manage',
    'orders.manage',
    'reports.view',
    'payments.process',
    'backup.manage',
    'restaurants.manage',
    'dashboard.view',
  ];
  for (const permission of permissions) {
    await db.query('INSERT IGNORE INTO permissions (name, description) VALUES (?, ?)', [permission, permission]);
  }

  const rolePermissions: Record<string, string[]> = {
    admin: permissions,
    waiter: ['orders.manage', 'tables.manage'],
    cashier: ['orders.manage', 'payments.process', 'reports.view'],
  };

  for (const [role, allowed] of Object.entries(rolePermissions)) {
    const [[roleRow]] = await db.query<RowDataPacket[]>('SELECT id FROM roles WHERE name = ?', [role]);
    for (const permission of allowed) {
      const [[permissionRow]] = await db.query<RowDataPacket[]>('SELECT id FROM permissions WHERE name = ?', [permission]);
      await db.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleRow.id, permissionRow.id]);
    }
  }

  if (isDevelopment) {
    await db.query('UPDATE users SET restaurant_id = 1 WHERE restaurant_id IS NULL');
    await db.query('UPDATE `tables` SET restaurant_id = 1 WHERE restaurant_id IS NULL');
    await db.query('UPDATE menu_items SET restaurant_id = 1 WHERE restaurant_id IS NULL');

    const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', config.auth.bcryptRounds);
    const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@zaikahub.local';
    await db.query(
      `INSERT INTO users (restaurant_id, name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), is_active = VALUES(is_active), restaurant_id = VALUES(restaurant_id)`,
      [1, 'Zaika Hub Admin', seedAdminEmail, hash, 'admin', true],
    );

    const [[userCount]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM users');
    if (userCount.count <= 1) {
      await db.query('INSERT INTO users (restaurant_id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', [
        1,
        'Waiter Demo',
        'waiter@zaikahub.local',
        hash,
        'waiter',
        true,
      ]);
      await db.query('INSERT INTO users (restaurant_id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)', [
        1,
        'Cashier Demo',
        'cashier@zaikahub.local',
        hash,
        'cashier',
        true,
      ]);
    }

    const [[tableCount]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM `tables` WHERE restaurant_id = 1');
    if (tableCount.count === 0) {
      await db.query('INSERT INTO `tables` (restaurant_id, table_number, status) VALUES ?', [
        Array.from({ length: 20 }, (_, index) => [1, index + 1, 'available']),
      ]);
    }

    const [[menuCount]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM menu_items WHERE restaurant_id = 1');
    if (menuCount.count === 0) {
      await db.query('INSERT INTO menu_items (restaurant_id, name, category, price, available) VALUES ?', [
        [
          [1, 'Rajasthani Thali', 'Thali', 280, true],
          [1, 'Gujarati Thali', 'Thali', 260, true],
          [1, 'South Indian Thali', 'Thali', 240, true],
          [1, 'Special Grand Thali', 'Thali', 350, true],
          [1, 'Paneer Butter Masala', 'Veg', 220, true],
          [1, 'Dal Makhani', 'Veg', 180, true],
          [1, 'Chicken Butter Masala', 'Non-Veg', 280, true],
          [1, 'Mutton Rogan Josh', 'Non-Veg', 340, true],
          [1, 'Gulab Jamun (2pc)', 'Desserts', 80, true],
          [1, 'Mango Lassi', 'Cold Drinks', 80, true],
        ],
      ]);
    }
  }
}
