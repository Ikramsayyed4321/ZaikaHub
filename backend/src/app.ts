import express from 'express';
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

export const app = express();

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

app.use(notFound);
app.use(errorHandler);
