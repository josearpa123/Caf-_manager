const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_STORAGE_KEY = 'coffee-manager:accessToken';
const REFRESH_STORAGE_KEY = 'coffee-manager:refreshToken';

// Rutas que nunca deben disparar un intento de refresh (evita loops: si
// /auth/refresh mismo devuelve 401, o si el login falló por credenciales
// incorrectas, no tiene sentido "renovar" nada).
const NO_REFRESH_PATHS = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_STORAGE_KEY);
}

export function setRefreshToken(token: string) {
  window.localStorage.setItem(REFRESH_STORAGE_KEY, token);
}

export function clearRefreshToken() {
  window.localStorage.removeItem(REFRESH_STORAGE_KEY);
}

// Varias peticiones pueden recibir 401 casi al mismo tiempo (ej. al volver
// de segundo plano). El refresh token es de un solo uso, así que todas
// deben esperar el mismo intento en curso en vez de disparar uno cada una
// (la segunda invalidaría el token que la primera ya canjeó).
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) throw new Error('refresh failed');
        const data = (await res.json()) as { accessToken: string; refreshToken: string };
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return true;
      } catch {
        clearToken();
        clearRefreshToken();
        window.dispatchEvent(new Event('auth:session-expired'));
        return false;
      }
    })();
  }
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !isRetry && !NO_REFRESH_PATHS.has(path) && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, true);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch {
      // el cuerpo no era JSON, se conserva el statusText
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
