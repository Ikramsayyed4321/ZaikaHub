import { getPool } from '../db.js';

getPool()
  .then((pool) => pool.end())
  .then(() => {
    console.log('Database migrations completed.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
