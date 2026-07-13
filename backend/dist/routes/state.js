import { Router } from 'express';
import { getPool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { readState, replaceState } from '../stateRepository.js';
export const stateRouter = Router();
stateRouter.get('/', asyncHandler(async (request, response) => {
    const db = await getPool();
    response.json(await readState(db, request.user?.restaurantId || 1));
}));
stateRouter.put('/', requireAuth, asyncHandler(async (request, response) => {
    const db = await getPool();
    await replaceState(db, request.body, request.user?.restaurantId || 1);
    response.json({ ok: true });
}));
