import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import type { AuthRequest, AuthUser } from '../types.js';
import { requireAuth, requireRole, signAccessToken } from './auth.js';

const user: AuthUser = {
  id: 1,
  restaurantId: 10,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
};

function createResponse() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return response as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('auth middleware', () => {
  it('rejects requests without a bearer token', () => {
    const request = { headers: {} } as AuthRequest;
    const response = createResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the user and calls next for a valid token', () => {
    const token = signAccessToken(user);
    const request = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const response = createResponse();
    const next = vi.fn() as NextFunction;

    requireAuth(request, response, next);

    expect(request.user).toMatchObject(user);
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows users with an accepted role', () => {
    const request = { user } as AuthRequest;
    const response = createResponse();
    const next = vi.fn() as NextFunction;

    requireRole('admin', 'cashier')(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('rejects users without an accepted role', () => {
    const request = { user: { ...user, role: 'waiter' } } as AuthRequest;
    const response = createResponse();
    const next = vi.fn() as NextFunction;

    requireRole('admin')(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: 'You do not have permission to access this resource' });
    expect(next).not.toHaveBeenCalled();
  });
});
