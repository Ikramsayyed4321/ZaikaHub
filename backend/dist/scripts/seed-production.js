import bcrypt from 'bcrypt';
import { config } from '../config.js';
import { getPool } from '../db.js';
function requireValue(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`${name} is required`);
    return value;
}
async function main() {
    if (process.env.NODE_ENV !== 'production') {
        throw new Error('seed:prod must be run with NODE_ENV=production');
    }
    if (process.env.CONFIRM_PRODUCTION_SEED !== 'true') {
        throw new Error('Set CONFIRM_PRODUCTION_SEED=true to create or update the production admin user');
    }
    const email = requireValue('PROD_SEED_ADMIN_EMAIL');
    const password = requireValue('PROD_SEED_ADMIN_PASSWORD');
    if (password.length < 16) {
        throw new Error('PROD_SEED_ADMIN_PASSWORD must be at least 16 characters');
    }
    const db = await getPool();
    const hash = await bcrypt.hash(password, config.auth.bcryptRounds);
    await db.query('INSERT IGNORE INTO restaurants (id, name, address, gst_number) VALUES (?, ?, ?, ?)', [
        1,
        config.restaurant.name,
        config.restaurant.address,
        config.restaurant.gstNumber,
    ]);
    await db.query(`INSERT INTO users (restaurant_id, name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), is_active = VALUES(is_active), restaurant_id = VALUES(restaurant_id)`, [1, 'Production Admin', email, hash, 'admin', true]);
    await db.end();
    console.log(`Production admin user created or updated: ${email}`);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
