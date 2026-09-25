const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const normalizedPath = BASE_URL.endsWith('/api') && path.startsWith('/api/') ? path.slice(4) : path;
  const url = normalizedPath.startsWith('http')
    ? normalizedPath
    : `${BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  
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
