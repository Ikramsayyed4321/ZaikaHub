const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getPool, database } = require('./db.cjs');
const { defaultState } = require('./defaultState.cjs');
const { registerCrudRoutes } = require('./crudRoutes.cjs');
const { readState, replaceState } = require('./stateRepository.cjs');

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 3001);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5174';

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

registerCrudRoutes(app, getPool);

app.get('/api/health', async (_request, response) => {
  try {
    await getPool();
    response.json({ ok: true, database });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/state', async (_request, response) => {
  try {
    const db = await getPool();
    response.json(await readState(db));
  } catch (error) {
    response.status(500).json({ message: 'Unable to load state from MySQL', detail: error.message });
  }
});

app.put('/api/state', async (request, response) => {
  try {
    const db = await getPool();
    await replaceState(db, request.body);
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ message: 'Unable to save state to MySQL', detail: error.message });
  }
});

app.post('/api/reset', async (_request, response) => {
  try {
    const db = await getPool();
    await replaceState(db, defaultState);
    response.json(await readState(db));
  } catch (error) {
    response.status(500).json({ message: 'Unable to reset state in MySQL', detail: error.message });
  }
});

async function start() {
  try {
    await getPool();
    app.listen(port, () => {
      console.log(`API server running on http://localhost:${port}`);
      console.log(`MySQL database ready: ${database}`);
    });
  } catch (error) {
    console.error('Failed to initialize MySQL database.');
    console.error(error.message);
    process.exit(1);
  }
}

start();
