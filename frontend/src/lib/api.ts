const BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const FORCE_LOCAL_DEMO = import.meta.env.VITE_USE_FIXTURES === 'true' || import.meta.env.VITE_USE_LOCAL_DATA === 'true';

export const DEMO_DATA_UPDATE_EVENT = 'citypulse-demo-data-updated';

export class ApiError extends Error {
  constructor(message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function resolveApiUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!BASE_URL || BASE_URL === '/api') {
    return normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  }

  const apiPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  if (BASE_URL.endsWith('/api')) {
    return `${BASE_URL}${apiPath.replace(/^\/api/, '')}`;
  }

  return `${BASE_URL}${apiPath}`;
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const localDemo = FORCE_LOCAL_DEMO && typeof window !== 'undefined' && window.localStorage
    ? (() => {
        const key = 'citypulse-demo-data-v1';
        const stored = window.localStorage.getItem(key);
        if (!stored) return null;
        try {
          const parsed = JSON.parse(stored);
          if (path === '/api/alerts') return parsed.alerts ?? [];
          if (path === '/api/events') {
            const limit = Number(new URLSearchParams((path.includes('?') ? path.split('?')[1] : '')).get('limit') || 200);
            return (parsed.events ?? []).slice(0, limit);
          }
          if (path === '/api/zones') return parsed.zones ?? [];
          if (path === '/api/feed-status') return parsed.feedStatus ?? [];
          if (path === '/api/pulse') return parsed.pulse ?? null;
          return null;
        } catch {
          return null;
        }
      })()
    : null;

  if (localDemo !== null) {
    return localDemo as T;
  }

  const url = resolveApiUrl(path);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text };
  }

  if (!res.ok) {
    const errorMsg = parsed?.error?.message || parsed?.message || res.statusText || 'Request failed';
    throw new ApiError(errorMsg, res.status, parsed?.error?.details || parsed);
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed && 'meta' in parsed) {
    return parsed.data as T;
  }

  return parsed as T;
}

export const api = fetchApi;
