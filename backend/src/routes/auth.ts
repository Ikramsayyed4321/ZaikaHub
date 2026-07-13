import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getPool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema } from '../validation/schemas.js';
import { config } from '../config.js';
import { requireAuth, signAccessToken } from '../middleware/auth.js';
import { loginRateLimiter, refreshRateLimiter } from '../middleware/security.js';
import type { AuthRequest, AuthUser } from '../types.js';

export const authRouter = Router();

const REFRESH_COOKIE = 'zaika_refresh';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function parseCookies(header?: string) {
  return Object.fromEntries(
    (header || '')
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separator = cookie.indexOf('=');
        return separator === -1 ? [cookie, ''] : [cookie.slice(0, separator), decodeURIComponent(cookie.slice(separator + 1))];
      }),
  );
}

function refreshCookieOptions() {
  const secure = config.nodeEnv === 'production';
  return [`HttpOnly`, `Path=/api/auth`, `SameSite=${secure ? 'Strict' : 'Lax'}`, secure ? 'Secure' : '', `Max-Age=${7 * 24 * 60 * 60}`]
    .filter(Boolean)
    .join('; ');
}

async function createRefreshSession(db: Awaited<ReturnType<typeof getPool>>, request: AuthRequest, user: AuthUser, familyId = randomUUID()) {
  const token = randomBytes(48).toString('base64url');
  const jti = randomUUID();
  await db.query(
    `INSERT INTO refresh_sessions
      (user_id, restaurant_id, token_hash, family_id, jti, user_agent, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
    [user.id, user.restaurantId, hashToken(token), familyId, jti, request.headers['user-agent'] || '', request.ip],
  );
  return { token, jti, familyId };
}

function setRefreshCookie(response: import('express').Response, token: string) {
  response.setHeader('Set-Cookie', `${REFRESH_COOKIE}=${encodeURIComponent(token)}; ${refreshCookieOptions()}`);
}

function clearRefreshCookie(response: import('express').Response) {
  response.setHeader('Set-Cookie', `${REFRESH_COOKIE}=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=Lax`);
}

authRouter.post(
  '/login',
  loginRateLimiter,
  asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const db = await getPool();
    const [[user]] = await db.query<any[]>(
      'SELECT id, restaurant_id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
      [payload.email],
    );

    const ok = user?.password_hash ? await bcrypt.compare(payload.password, user.password_hash) : false;
    await db.query(
      'INSERT INTO login_audit_logs (user_id, restaurant_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user?.id || null, user?.restaurant_id || null, payload.email, request.ip, request.headers['user-agent'] || '', ok ? 'success' : 'failed'],
    );

    if (!user || !ok || !user.is_active) {
      response.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const authUser: AuthUser = {
      id: Number(user.id),
      restaurantId: user.restaurant_id ? Number(user.restaurant_id) : null,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const refreshSession = await createRefreshSession(db, request as AuthRequest, authUser);
    setRefreshCookie(response, refreshSession.token);

    response.json({
      user: authUser,
      accessToken: signAccessToken(authUser),
    });
  }),
);

authRouter.post(
  '/refresh',
  refreshRateLimiter,
  asyncHandler(async (request, response) => {
    const token = parseCookies(request.headers.cookie)[REFRESH_COOKIE] || request.body.refreshToken;
    if (!token) {
      response.status(401).json({ message: 'Refresh token required' });
      return;
    }

    const db = await getPool();
    const tokenHash = hashToken(token);
    const [[session]] = await db.query<any[]>(
      `SELECT rs.*, u.name, u.email, u.role, u.is_active
       FROM refresh_sessions rs JOIN users u ON u.id = rs.user_id
       WHERE rs.token_hash = ? LIMIT 1`,
      [tokenHash],
    );
    if (!session) {
      response.status(401).json({ message: 'Session expired' });
      return;
    }
    if (session.revoked_at) {
      await db.query('UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE family_id = ?', [session.family_id]);
      clearRefreshCookie(response);
      response.status(401).json({ message: 'Session reuse detected' });
      return;
    }
    if (new Date(session.expires_at).getTime() <= Date.now() || !session.is_active) {
      await db.query('UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = ?', [tokenHash]);
      clearRefreshCookie(response);
      response.status(401).json({ message: 'Session expired' });
      return;
    }

    const authUser: AuthUser = {
      id: Number(session.user_id),
      restaurantId: session.restaurant_id ? Number(session.restaurant_id) : null,
      name: session.name,
      email: session.email,
      role: session.role,
    };
    const nextRefreshSession = await createRefreshSession(db, request as AuthRequest, authUser, session.family_id);
    await db.query('UPDATE refresh_sessions SET revoked_at = NOW(), replaced_by_jti = ? WHERE token_hash = ?', [
      nextRefreshSession.jti,
      tokenHash,
    ]);
    setRefreshCookie(response, nextRefreshSession.token);

    response.json({ user: authUser, accessToken: signAccessToken(authUser) });
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const db = await getPool();
    const token = parseCookies(request.headers.cookie)[REFRESH_COOKIE];
    if (token) {
      await db.query('UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = ?', [hashToken(token)]);
    }
    await db.query('INSERT INTO login_audit_logs (user_id, restaurant_id, email, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)', [
      request.user?.id || null,
      request.user?.restaurantId || null,
      request.user?.email || null,
      request.ip,
      request.headers['user-agent'] || '',
      'logout',
    ]);
    clearRefreshCookie(response);
    response.json({ ok: true });
  }),
);

authRouter.get('/me', requireAuth, (request: AuthRequest, response) => {
  response.json({ user: request.user });
});
