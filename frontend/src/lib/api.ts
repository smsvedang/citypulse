const BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const LOCAL_STORE_KEY = 'citypulse-demo-data-v1';
export const DEMO_DATA_UPDATE_EVENT = 'citypulse-demo-data-updated';

const defaultDemoData = {
  zones: [
    { id: 'ZONE-1', name: 'Amber Colony', lat: 26.9124, lng: 75.7873, risk: 'medium', status: 'active', place: 'North-west civic corridor', center: { lat: 26.9124, lng: 75.7873 } },
    { id: 'ZONE-2', name: 'Malviya Nagar', lat: 26.854, lng: 75.8245, risk: 'high', status: 'active', place: 'Flood-prone central route', center: { lat: 26.854, lng: 75.8245 } },
    { id: 'ZONE-3', name: 'Sanganer', lat: 26.8217, lng: 75.7789, risk: 'medium', status: 'active', place: 'Transit and utility belt', center: { lat: 26.8217, lng: 75.7789 } },
    { id: 'ZONE-4', name: 'Vaishali Nagar', lat: 26.9095, lng: 75.7439, risk: 'low', status: 'stable', place: 'Residential and commercial mix', center: { lat: 26.9095, lng: 75.7439 } },
  ],
  alerts: [
    { id: 'alert-1', title: 'Waterlogging reported near Malviya Nagar', body: 'Heavy rain has created water accumulation near the main junction. Citizens should avoid the area and use alternative routes.', severity: 'high', status: 'active', zone_id: 'ZONE-2', created_at: new Date().toISOString(), source_refs: { operator: true } },
    { id: 'alert-2', title: 'Traffic diversion in Amber Colony', body: 'Road maintenance is causing slow traffic. Please use parallel lanes where available.', severity: 'medium', status: 'active', zone_id: 'ZONE-1', created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(), source_refs: { operator: true } },
    { id: 'alert-3', title: 'Power fluctuation in Sanganer', body: 'Temporary voltage instability has been observed in the sub-grid. Local teams are monitoring the area.', severity: 'low', status: 'active', zone_id: 'ZONE-3', created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), source_refs: { operator: true } },
  ],
  events: [
    { id: 'event-1', title: 'Rainfall intensity spike', description: 'Short-duration heavy rainfall trend observed in Zone 2.', severity: 0.9, zone_id: 'ZONE-2', source: 'weather', type: 'rain', location: { lat: 26.854, lng: 75.8245, zone: 'ZONE-2' }, created_at: new Date().toISOString() },
    { id: 'event-2', title: 'Traffic congestion rising', description: 'Vehicle density is greater than expected across Amber Colony.', severity: 0.72, zone_id: 'ZONE-1', source: 'traffic', type: 'traffic', location: { lat: 26.9124, lng: 75.7873, zone: 'ZONE-1' }, created_at: new Date(Date.now() - 1000 * 60 * 6).toISOString() },
    { id: 'event-3', title: 'Transit delays reported', description: 'Bus frequency reduced near Sanganer corridor.', severity: 0.64, zone_id: 'ZONE-3', source: 'transit', type: 'transit', location: { lat: 26.8217, lng: 75.7789, zone: 'ZONE-3' }, created_at: new Date(Date.now() - 1000 * 60 * 13).toISOString() },
  ],
  feedStatus: [
    { id: 'rainfeed', name: 'Weather feed', health: 'healthy' },
    { id: 'trafficfeed', name: 'Traffic feed', health: 'degraded' },
    { id: 'transitfeed', name: 'Transit feed', health: 'healthy' },
  ],
  pulse: { city: 'Jaipur', status: 'stable', activeRisk: 'moderate', updatedAt: new Date().toISOString(), top_zone: 'ZONE-2' },
};

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

function readLocalDemoData() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultDemoData;
  }

  const stored = window.localStorage.getItem(LOCAL_STORE_KEY);
  if (!stored) {
    window.localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(defaultDemoData));
    return defaultDemoData;
  }

  try {
    return { ...defaultDemoData, ...JSON.parse(stored) };
  } catch {
    window.localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(defaultDemoData));
    return defaultDemoData;
  }
}

function notifyDemoDataUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DEMO_DATA_UPDATE_EVENT));
}

function writeLocalDemoData(next: any) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(next));
    notifyDemoDataUpdated();
  }
}

function getLocalDemoResponse(path: string, options?: RequestInit) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const method = (options?.method || 'GET').toUpperCase();
  const store = readLocalDemoData();

  if (method === 'POST' && normalizedPath === '/api/notifications/messages') {
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    const zoneId = body.zoneId || 'CITY';
    const message = {
      id: `alert-${Date.now()}`,
      title: body.title || 'Local alert',
      body: body.body || 'Alert created from same-browser demo mode.',
      severity: body.severity || 'high',
      status: 'active',
      zone_id: zoneId,
      created_at: new Date().toISOString(),
      source_refs: { operator: true },
    };

    const nextEvent = {
      id: `event-${Date.now()}`,
      title: body.title || 'Admin message broadcast',
      description: body.body || 'Operator message published to local browser data.',
      severity: 0.88,
      zone_id: zoneId,
      source: 'operator',
      type: 'operator',
      location: {
        zone: zoneId,
        lat: zoneId === 'CITY' ? 26.9124 : (store.zones.find((zone: any) => zone.id === zoneId)?.center?.lat ?? 26.9124),
        lng: zoneId === 'CITY' ? 75.7873 : (store.zones.find((zone: any) => zone.id === zoneId)?.center?.lng ?? 75.7873),
      },
      created_at: new Date().toISOString(),
    };

    const nextStore = {
      ...store,
      alerts: [message, ...store.alerts],
      events: [nextEvent, ...store.events],
      pulse: { ...store.pulse, top_zone: zoneId === 'CITY' ? (store.pulse?.top_zone || 'ZONE-2') : zoneId },
    };

    writeLocalDemoData(nextStore);

    return {
      delivery: {
        web: { sent: body.channels?.includes('web') ? 1 : 0 },
        email: { sent: body.channels?.includes('email') ? 1 : 0 },
        volunteer: { sent: body.channels?.includes('volunteer') ? 1 : 0 },
      },
    } as any;
  }

  if (normalizedPath === '/api/zones') return store.zones;
  if (normalizedPath === '/api/alerts') return store.alerts;
  if (normalizedPath === '/api/events') {
    const url = new URL(path, 'http://localhost');
    const limit = Number(url.searchParams.get('limit') || '200');
    return store.events.slice(0, limit);
  }
  if (normalizedPath === '/api/feed-status') return store.feedStatus;
  if (normalizedPath === '/api/pulse') return store.pulse;

  return null;
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const localDemo = getLocalDemoResponse(path, options);
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

  // Handle PRD envelope { data, meta }
  if (parsed && typeof parsed === 'object' && 'data' in parsed && 'meta' in parsed) {
    return parsed.data as T;
  }

  return parsed as T;
}

export const api = fetchApi;
