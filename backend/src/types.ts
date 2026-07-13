import type { Request } from 'express';

export type Role = 'admin' | 'waiter' | 'cashier';

export interface AuthUser {
  id: number;
  restaurantId: number | null;
  name: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
