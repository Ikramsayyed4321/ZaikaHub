import { config } from './config.js';
import { getPool } from './db.js';
import { app } from './app.js';
async function start() {
    await getPool();
    app.listen(config.apiPort, '0.0.0.0', () => {
        console.log(`Zaika Hub API listening on port ${config.apiPort}`);
    });
}
start().catch((error) => {
    console.error('Failed to start Zaika Hub API');
    console.error(error);
    process.exit(1);
});
