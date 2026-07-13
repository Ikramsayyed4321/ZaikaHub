import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { securityMiddleware } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestContext } from './middleware/requestContext.js';
import { authRouter } from './routes/auth.js';
import { crudRouter } from './routes/crud.js';
import { reportsRouter } from './routes/reports.js';
import { invoicesRouter } from './routes/invoices.js';
import { backupRouter } from './routes/backup.js';
import { stateRouter } from './routes/state.js';
import { posRouter } from './routes/pos.js';
import { getPool } from './db.js';
import { config } from './config.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
export const app = express();
if (config.trustProxy) {
    app.set('trust proxy', 1);
}
app.use(securityMiddleware);
app.use(requestContext);
app.use(express.json({ limit: '512kb' }));
app.get('/api/health', async (_request, response) => {
    await getPool();
    response.json({ ok: true, database: 'restaurant_db' });
});
app.use('/api/auth', authRouter);
app.use('/api/state', stateRouter);
app.use('/api', posRouter);
app.use('/api', crudRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/backups', backupRouter);
if (config.serveStaticFrontend && fs.existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath, { index: false, maxAge: '1y', immutable: true }));
    app.get(/^(?!\/api).*/, (_request, response) => {
        response.sendFile(frontendIndexPath);
    });
}
app.use(notFound);
app.use(errorHandler);
