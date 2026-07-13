import { Router } from 'express';
import { getPool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { AuthRequest } from '../types.js';
import { readState } from '../stateRepository.js';

export const stateRouter = Router();

stateRouter.get(
  '/',
  asyncHandler(async (request: AuthRequest, response) => {
    const db = await getPool();
    response.json(await readState(db, request.user?.restaurantId || 1));
  }),
);

stateRouter.put(
  '/',
  asyncHandler(async (request: AuthRequest, response) => {
    response.status(410).json({
      code: 'STATE_REPLACE_DISABLED',
      message: 'Full-state database replacement is disabled. Use domain APIs for orders, menu, and payments.',
    });
  }),
);
