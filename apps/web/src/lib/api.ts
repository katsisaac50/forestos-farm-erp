const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('forestos_token');
  const orgId =
    localStorage.getItem('forestos_organization_id') ||
    localStorage.getItem('forestos_active_organization');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (orgId) headers['X-Organization-Id'] = orgId;
  return headers;
}

export async function getData<T>(path: string): Promise<T> {
  const r = await fetch(API + path, { cache: 'no-store', headers: authHeaders() });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    if (r.status === 401) throw new ApiError(401, 'Please sign in to continue.');
    if (r.status === 400 && text.includes('X-Organization-Id')) {
      throw new ApiError(400, 'No organization selected. Sign in again to refresh your organization context.');
    }
    throw new ApiError(r.status, text || 'API request failed: ' + r.status);
  }
  return r.json();
}

export async function postData<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new ApiError(r.status, (await r.text()) || 'API request failed: ' + r.status);
  return r.json();
}

export async function patchData<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(API + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new ApiError(r.status, await r.text());
  return r.json();
}