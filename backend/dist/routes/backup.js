import { Router } from 'express';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity } from '../services/activity.js';
export const backupRouter = Router();
backupRouter.use(requireAuth, requireRole('admin'));
backupRouter.post('/', asyncHandler(async (request, response) => {
    const db = await getPool();
    const backupDir = path.resolve('backups');
    await mkdir(backupDir, { recursive: true });
    const fileName = `restaurant-db-${Date.now()}.sql`;
    const filePath = path.join(backupDir, fileName);
    const tables = ['restaurants', 'users', 'tables', 'menu_items', 'orders', 'order_items', 'payments', 'invoices'];
    const parts = [];
    for (const table of tables) {
        const [rows] = await db.query(`SELECT * FROM \`${table}\``);
        parts.push(`-- ${table}`);
        for (const row of rows) {
            parts.push(`INSERT INTO \`${table}\` (${Object.keys(row).map((key) => `\`${key}\``).join(',')}) VALUES (${Object.values(row).map((value) => db.escape(value)).join(',')});`);
        }
    }
    await writeFile(filePath, parts.join('\n'), 'utf8');
    const [result] = await db.query('INSERT INTO backups (restaurant_id, file_name, file_path, status, created_by) VALUES (?, ?, ?, ?, ?)', [request.user?.restaurantId || null, fileName, filePath, 'created', request.user?.id || null]);
    await logActivity(db, request, 'Backup Created', 'backups', result.insertId, { fileName });
    response.status(201).json({ id: result.insertId, fileName });
}));
backupRouter.get('/:id/download', asyncHandler(async (request, response) => {
    const db = await getPool();
    const [[backup]] = await db.query('SELECT * FROM backups WHERE id = ? LIMIT 1', [request.params.id]);
    if (!backup) {
        response.status(404).json({ message: 'Backup not found' });
        return;
    }
    response.setHeader('Content-Type', 'application/sql');
    response.setHeader('Content-Disposition', `attachment; filename="${backup.file_name}"`);
    response.send(await readFile(backup.file_path, 'utf8'));
}));
