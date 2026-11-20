const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type ApiErrorKind = 'http' | 'network';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly kind: ApiErrorKind = 'http',
  ) {
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

function parseResponse<T>(text: string): T {
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

async function throwResponseError(response: Response): Promise<never> {
  const text = await response.text().catch(() => '');

  // Try to parse JSON error body so we can extract a human-readable message.
  let parsed: unknown = undefined;
  if (text) {
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
  }

  const extract = (v: unknown): string | undefined => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) {
      const parts = v.map(extract).filter(Boolean);
      return parts.length ? parts.join('; ') : undefined;
    }
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      // NestJS: { message: string | string[], error, statusCode }
      if (o.message) {
        const m = extract(o.message);
        if (m) return m;
      }
      if (typeof o.error === 'string') return o.error;
    }
    return undefined;
  };

  const detail = extract(parsed) ?? (text && !parsed ? text : undefined);

  if (response.status === 401) {
    // Only show the server's reason if it says something specific;
    // otherwise keep the friendly default.
    const msg = detail && detail !== 'Unauthorized' ? detail : 'Please sign in to continue.';
    throw new ApiError(401, msg);
  }

  if (response.status === 400 && (text.includes('X-Organization-Id') || (detail ?? '').includes('organization'))) {
    throw new ApiError(
      400,
      'No organization selected. Sign in again to refresh your organization context.',
    );
  }

  throw new ApiError(
    response.status,
    detail || `API request failed: ${response.status}`,
  );
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = {
    ...authHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };

  let response: Response;

  try {
    response = await fetch(API + path, {
      ...init,
      cache: init.cache ?? 'no-store',
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      'Unable to reach the ForestOS API. Check your connection and try again.',
      'network',
    );
  }

  if (!response.ok) {
    return throwResponseError(response);
  }

  const text = await response.text();
  return parseResponse<T>(text);
}

/**
 * GET JSON data.
 * Preserves the existing API signature.
 */
export async function getData<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

/**
 * POST JSON data.
 * Preserves the existing API signature.
 */
export async function postData<T>(
  path: string,
  body: unknown,
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * PATCH JSON data.
 * Preserves the existing API signature.
 */
export async function patchData<T>(
  path: string,
  body: unknown,
): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * PUT JSON data.
 */
export async function putData<T>(
  path: string,
  body: unknown,
): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * DELETE a resource.
 */
export async function deleteData<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

/**
 * Upload FormData.
 * Do not set Content-Type manually: fetch must generate the multipart boundary.
 */
export async function postFormData<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Download binary content.
 */
export async function getBlob(path: string): Promise<Blob> {
  let response: Response;

  try {
    response = await fetch(API + path, {
      method: 'GET',
      cache: 'no-store',
      headers: authHeaders(),
    });
  } catch {
    throw new ApiError(
      0,
      'Unable to reach the ForestOS API. Check your connection and try again.',
      'network',
    );
  }

  if (!response.ok) {
    return throwResponseError(response);
  }

  return response.blob();
}