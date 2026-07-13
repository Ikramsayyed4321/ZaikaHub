import { getPool } from '../db.js';

getPool()
  .then((pool) => pool.end())
  .then(() => {
    console.log('Development seed data checked.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
