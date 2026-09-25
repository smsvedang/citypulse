const BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

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

  // Handle PRD envelope { data, meta }
  if (parsed && typeof parsed === 'object' && 'data' in parsed && 'meta' in parsed) {
    return parsed.data as T;
  }

  return parsed as T;
}

export const api = fetchApi;
