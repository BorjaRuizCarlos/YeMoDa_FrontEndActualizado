import type { ApiError } from './types';

// ─── Base URL ──────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_TARGET;

// ─── Token storage keys ──────────────────────────────────────────────────────
const STORAGE_ACCESS = 'pip_access_token';
const STORAGE_REFRESH = 'pip_refresh_token';
export const AUTH_SESSION_EXPIRED_EVENT = 'pip:auth-session-expired';
export const AUTH_EMAIL_BLOCKED_EVENT = 'pip:auth-email-blocked';

export function emitSessionExpired() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

function emitEmailBlocked() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_EMAIL_BLOCKED_EVENT));
}

function isSessionExpiredError(status: number, body: ApiError): boolean {
  if (status === 401) return true;

  const detail = String(body?.detail ?? '').toLowerCase();
  return (status === 403 || status === 400)
    && detail.includes('token')
    && (detail.includes('expir') || detail.includes('venc'));
}

export const tokenStore = {
  getAccess: () => localStorage.getItem(STORAGE_ACCESS),
  // Legacy: the refresh token used to live here. It now lives in an HttpOnly cookie set by the
  // backend; this getter only exists to migrate devices that still hold an old value.
  getRefresh: () => localStorage.getItem(STORAGE_REFRESH),
  // Only the access token is kept in JS-readable storage now; the refresh token is the
  // HttpOnly cookie and is never written to localStorage.
  set: (access: string) => localStorage.setItem(STORAGE_ACCESS, access),
  setAccess: (access: string) => localStorage.setItem(STORAGE_ACCESS, access),
  clearLegacyRefresh: () => localStorage.removeItem(STORAGE_REFRESH),
  clear: () => {
    localStorage.removeItem(STORAGE_ACCESS);
    localStorage.removeItem(STORAGE_REFRESH);
  },
};

// ─── API error class ─────────────────────────────────────────────────────────
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiError,
  ) {
    const message = body.detail ?? `HTTP ${status}`;
    super(message);
    this.name = 'ApiRequestError';
  }
}

// ─── Internal fetch helper ───────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = tokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${BASE_URL}${path}`;
  if (import.meta.env.DEV) {
    console.log(`[API] ${options.method || 'GET'} ${fullUrl}`);
  }

  // credentials: 'include' so the HttpOnly refresh cookie is sent (and Set-Cookie honored).
  const res = await fetch(fullUrl, { ...options, headers, credentials: 'include' });

  // 401 → try refresh once, then re-attempt
  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${tokenStore.getAccess()}`;
      const retry = await fetch(fullUrl, { ...options, headers, credentials: 'include' });
      return handleResponse<T>(retry, auth);
    }
    // Refresh failed — clear tokens and bubble up
    return handleResponse<T>(res, auth);
  }

  return handleResponse<T>(res, auth);
}

async function handleResponse<T>(res: Response, authRequest = true): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (authRequest && res.status === 401 && (data as { code?: string })?.code === 'email_verification_required') {
      tokenStore.clear();
      emitEmailBlocked();
    } else if (authRequest && isSessionExpiredError(res.status, data as ApiError)) {
      tokenStore.clear();
      emitSessionExpired();
    }
    if (import.meta.env.DEV) {
      console.error(`[API] Error ${res.status} from ${res.url}`);
    }
    throw new ApiRequestError(res.status, data as ApiError);
  }
  return data as T;
}

export async function tryRefresh(): Promise<boolean> {
  // The refresh token is sent automatically via the HttpOnly cookie (credentials: 'include').
  // A legacy localStorage token (pre-cookie devices) is sent in the body once, to migrate it.
  const legacy = tokenStore.getRefresh();
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacy ? { refresh_token: legacy } : {}),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenStore.setAccess(data.access_token);
    if (legacy) tokenStore.clearLegacyRefresh(); // migrated to the cookie
    return true;
  } catch {
    return false;
  }
}

// ─── Public API client ───────────────────────────────────────────────────────
export const api = {
  get: <T>(path: string, auth = true) =>
    request<T>(path, { method: 'GET' }, auth),

  post: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, auth),

  put: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }, auth),

  patch: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, auth),

  delete: <T>(path: string, auth = true) =>
    request<T>(path, { method: 'DELETE' }, auth),
};
