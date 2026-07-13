import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema } from '../validation/schemas.js';
import { config } from '../config.js';
import { requireAuth, signAccessToken, signRefreshToken } from '../middleware/auth.js';
export const authRouter = Router();
authRouter.post('/login', asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const db = await getPool();
    const [[user]] = await db.query('SELECT id, restaurant_id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1', [payload.email]);
    const ok = user?.password_hash ? await bcrypt.compare(payload.password, user.password_hash) : false;
    await db.query('INSERT INTO login_audit_logs (user_id, restaurant_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)', [user?.id || null, user?.restaurant_id || null, payload.email, request.ip, request.headers['user-agent'] || '', ok ? 'success' : 'failed']);
    if (!user || !ok || !user.is_active) {
        response.status(401).json({ message: 'Invalid email or password' });
        return;
    }
    const authUser = {
        id: Number(user.id),
        restaurantId: user.restaurant_id ? Number(user.restaurant_id) : null,
        name: user.name,
        email: user.email,
        role: user.role,
    };
    response.json({
        user: authUser,
        accessToken: signAccessToken(authUser),
        refreshToken: signRefreshToken(authUser),
    });
}));
authRouter.post('/refresh', asyncHandler(async (request, response) => {
    const token = request.body.refreshToken;
    if (!token) {
        response.status(401).json({ message: 'Refresh token required' });
        return;
    }
    const decoded = jwt.verify(token, config.auth.refreshSecret);
    const db = await getPool();
    const [[user]] = await db.query('SELECT id, restaurant_id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1', [
        decoded.id,
    ]);
    if (!user || !user.is_active) {
        response.status(401).json({ message: 'Session expired' });
        return;
    }
    const authUser = {
        id: Number(user.id),
        restaurantId: user.restaurant_id ? Number(user.restaurant_id) : null,
        name: user.name,
        email: user.email,
        role: user.role,
    };
    response.json({ user: authUser, accessToken: signAccessToken(authUser), refreshToken: signRefreshToken(authUser) });
}));
authRouter.post('/logout', requireAuth, asyncHandler(async (request, response) => {
    const db = await getPool();
    await db.query('INSERT INTO login_audit_logs (user_id, restaurant_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)', [
        request.user?.id || null,
        request.user?.restaurantId || null,
        request.user?.email || null,
        request.ip,
        request.headers['user-agent'] || '',
        'logout',
    ]);
    response.json({ ok: true });
}));
authRouter.get('/me', requireAuth, (request, response) => {
    response.json({ user: request.user });
});
