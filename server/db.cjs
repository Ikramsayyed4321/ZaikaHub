const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { defaultState } = require('./defaultState.cjs');

dotenv.config();

const database = process.env.DB_NAME || 'restaurant_db';
const isDevelopment = process.env.NODE_ENV !== 'production';

const baseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

async function ensureDatabase() {
  const connection = await mysql.createConnection(baseConfig);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
}

async function createTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255),
      role ENUM('admin','waiter','cashier')
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS \`tables\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_number INT UNIQUE,
      status ENUM('available','occupied')
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      category VARCHAR(50),
      price DECIMAL(10,2),
      available BOOLEAN DEFAULT TRUE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_id INT,
      total_amount DECIMAL(10,2),
      status ENUM('pending','completed'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_orders_table_id (table_id),
      CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES \`tables\`(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      menu_item_id INT,
      quantity INT,
      price DECIMAL(10,2),
      INDEX idx_order_items_order_id (order_id),
      INDEX idx_order_items_menu_item_id (menu_item_id),
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_order_items_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      amount DECIMAL(10,2),
      payment_method VARCHAR(50),
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_payments_order_id (order_id),
      CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
}

async function seedDevelopmentData(db) {
  if (!isDevelopment) return;

  const [[tableCount]] = await db.query('SELECT COUNT(*) AS count FROM `tables`');
  if (tableCount.count === 0) {
    await db.query('INSERT INTO `tables` (table_number, status) VALUES ?', [
      Array.from({ length: 20 }, (_, index) => [index + 1, 'available']),
    ]);
  }

  const [[menuCount]] = await db.query('SELECT COUNT(*) AS count FROM menu_items');
  if (menuCount.count === 0) {
    await db.query('INSERT INTO menu_items (id, name, category, price, available) VALUES ?', [
      defaultState.menuItems.map((item) => [item.id, item.name, item.category, item.price, item.available]),
    ]);
  }

  const [[userCount]] = await db.query('SELECT COUNT(*) AS count FROM users');
  if (userCount.count === 0) {
    await db.query('INSERT INTO users (name, email, password, role) VALUES ?', [
      [
        ['Admin User', 'admin@restaurant.local', '$2b$10$development-placeholder', 'admin'],
        ['Rahul S.', 'rahul@restaurant.local', '$2b$10$development-placeholder', 'waiter'],
        ['Priya M.', 'priya@restaurant.local', '$2b$10$development-placeholder', 'cashier'],
      ],
    ]);
  }
}

async function initializeDatabase() {
  await ensureDatabase();
  const db = mysql.createPool({ ...baseConfig, database });
  await createTables(db);
  await seedDevelopmentData(db);
  return db;
}

async function getPool() {
  if (!pool) {
    pool = await initializeDatabase();
  }
  return pool;
}

module.exports = { getPool, initializeDatabase, database };
