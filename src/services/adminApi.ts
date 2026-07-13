const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('zaikaHubAccessToken');
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listResource<T>(resource: string, search = '') {
  return adminRequest<T[]>(`/${resource}?search=${encodeURIComponent(search)}&limit=100`);
}

export function createResource<T>(resource: string, payload: unknown) {
  return adminRequest<T>(`/${resource}`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateResource<T>(resource: string, id: number, payload: unknown) {
  return adminRequest<T>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteResource(resource: string, id: number) {
  return adminRequest<void>(`/${resource}/${id}`, { method: 'DELETE' });
}
