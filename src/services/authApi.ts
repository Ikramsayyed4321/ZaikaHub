import type { Role } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface AuthUser {
  id: number;
  restaurantId: number | null;
  name: string;
  email: string;
  role: 'admin' | 'waiter' | 'cashier';
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export function roleToAppRole(role: AuthUser['role']): Role {
  if (role === 'admin') return 'Admin';
  if (role === 'cashier') return 'Admin';
  return 'Waiter';
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return authRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function refresh() {
  return authRequest<LoginResponse>('/auth/refresh', {
    method: 'POST',
  });
}

export function logout(accessToken: string) {
  return authRequest<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
