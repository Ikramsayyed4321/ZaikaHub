import type { AppState, MenuItem, Order, OrderStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const accessToken = localStorage.getItem('zaikaHubAccessToken');
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchAppState() {
  return request<AppState>('/state');
}

export function createOrder(payload: { tableNo: number; items: Array<{ menuItemId: number; quantity: number }> }) {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOrderStatus(id: number, status: OrderStatus) {
  return request<Order>(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function cancelOrder(id: number) {
  return request<{ ok: boolean }>(`/orders/${id}`, { method: 'DELETE' });
}

export function createPayment(payload: { tableNo: number; amount: number; paymentMethod?: string }) {
  return request<{ ok: boolean }>('/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createMenuItem(payload: Omit<MenuItem, 'id'>) {
  return request<MenuItem>('/menu', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMenuItem(id: number, payload: Partial<Omit<MenuItem, 'id'>>) {
  return request<MenuItem>(`/menu/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteMenuItem(id: number) {
  return request<{ ok: boolean }>(`/menu/${id}`, { method: 'DELETE' });
}
