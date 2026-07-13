import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { AuthRequest, AuthUser, Role } from '../types.js';

export function signAccessToken(user: AuthUser) {
  return jwt.sign(user, config.auth.jwtSecret, { expiresIn: config.auth.accessTokenTtl } as jwt.SignOptions);
}

export function signRefreshToken(user: AuthUser) {
  return jwt.sign({ id: user.id, restaurantId: user.restaurantId }, config.auth.refreshSecret, {
    expiresIn: config.auth.refreshTokenTtl,
  } as jwt.SignOptions);
}

export function requireAuth(request: AuthRequest, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    response.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    request.user = jwt.verify(token, config.auth.jwtSecret) as AuthUser;
    next();
  } catch {
    response.status(401).json({ message: 'Session expired or invalid token' });
  }
}

export function requireRole(...roles: Role[]) {
  return (request: AuthRequest, response: Response, next: NextFunction) => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ message: 'You do not have permission to access this resource' });
      return;
    }
    next();
  };
}
