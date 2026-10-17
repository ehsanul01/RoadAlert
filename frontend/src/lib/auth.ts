import type { Incident, NewIncident, User } from '../types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)ra_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (method !== 'GET') headers.set('X-CSRF-Token', csrfToken());

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { ...init, method, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === 'string') message = data.detail;
      else if (Array.isArray(data.detail)) message = 'Please check the form fields.';
    } catch {
      if (res.status >= 500) message = 'Cannot reach the server. Is the backend running?';
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await request<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
}

/** Restores an existing cookie session on page load. Returns null when signed out. */
export async function currentUser(): Promise<User | null> {
  try {
    const data = await request<{ user: User }>('/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

export async function fetchIncidents(includeCleared = false): Promise<Incident[]> {
  const data = await request<{ incidents: Incident[] }>(
    `/incidents${includeCleared ? '?include_cleared=true' : ''}`,
  );
  return data.incidents;
}

export async function createIncident(input: NewIncident): Promise<Incident> {
  const data = await request<{ incident: Incident }>('/incidents', {
    method: 'POST',
    body: JSON.stringify({
      type: input.type,
      severity: input.severity,
      road: input.road,
      direction: input.direction,
      location: input.location,
      description: input.description,
      lanes_blocked: input.lanesBlocked,
    }),
  });
  return data.incident;
}

export async function clearIncident(id: string): Promise<Incident> {
  const data = await request<{ incident: Incident }>(`/incidents/${encodeURIComponent(id)}/clear`, {
    method: 'POST',
  });
  return data.incident;
}
