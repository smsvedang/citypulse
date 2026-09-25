const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const FORCE_LOCAL_DEMO = import.meta.env.VITE_USE_FIXTURES === 'true' || import.meta.env.VITE_USE_LOCAL_DATA === 'true';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function resolveApiUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!API_BASE || API_BASE === '/api') {
    return normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  }

  const apiPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  if (API_BASE.endsWith('/api')) {
    return `${API_BASE}${apiPath.replace(/^\/api/, '')}`;
  }

  return `${API_BASE}${apiPath}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const localDemo = FORCE_LOCAL_DEMO && typeof window !== 'undefined' && window.localStorage
    ? (() => {
        const key = 'citypulse-demo-data-v1';
        const stored = window.localStorage.getItem(key);
        if (!stored) return null;
        try {
          const parsed = JSON.parse(stored);
          if (path === '/api/alerts') return parsed.alerts ?? [];
          if (path === '/api/events') return (parsed.events ?? []).slice(0, Number(new URLSearchParams((path.includes('?') ? path.split('?')[1] : '')).get('limit') || 200));
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

  const r = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await r.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!r.ok) {
    throw new ApiError((data as { message?: string })?.message || r.statusText || 'Request failed', r.status);
  }

  if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
    return (data as { data: T }).data;
  }

  return data as T;
}
