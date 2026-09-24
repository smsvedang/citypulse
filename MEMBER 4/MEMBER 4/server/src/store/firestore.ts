import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import admin from 'firebase-admin';
import type {
  AlertDoc,
  AnomalyDoc,
  CivicEvent,
  CorrelationDoc,
  FeedStatusDoc,
  ZoneDoc,
} from '../types/civic.js';

export type StoreMode = 'firestore' | 'memory';

const memory = {
  events: [] as CivicEvent[],
  zones: [] as ZoneDoc[],
  anomalies: [] as AnomalyDoc[],
  correlations: [] as CorrelationDoc[],
  alerts: [] as AlertDoc[],
  feed_status: [] as FeedStatusDoc[],
};

let mode: StoreMode = 'memory';
let db: admin.firestore.Firestore | null = null;

function seedZones(): ZoneDoc[] {
  const centers: Record<string, { lat: number; lng: number }> = {
    Z01: { lat: 26.95, lng: 75.75 },
    Z02: { lat: 26.93, lng: 75.77 },
    Z03: { lat: 26.92, lng: 75.78 },
    Z04: { lat: 26.91, lng: 75.79 },
    Z05: { lat: 26.89, lng: 75.81 },
  };
  return Object.entries(centers).map(([id, center]) => ({
    id,
    name: `Zone ${id.slice(-1)}`,
    center,
    status: 'normal',
    baseline_config: { window_minutes: 60, threshold: 2.0 },
    last_updated: isoNow(),
  }));
}

function seedFeeds(): FeedStatusDoc[] {
  const now = isoNow();
  return (['weather', 'traffic', 'transit'] as const).map((source) => ({
    source,
    last_success: now,
    latency_ms: 300 + Math.floor(Math.random() * 200),
    health: 'healthy' as const,
    error_count: 0,
  }));
}

export function isoNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const off = 5.5 * 60;
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  const ist = new Date(utc + off * 60_000);
  return `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}T${pad(ist.getHours())}:${pad(ist.getMinutes())}:${pad(ist.getSeconds())}+05:30`;
}

export function initStore(): StoreMode {
  if (memory.zones.length === 0) {
    memory.zones.push(...seedZones());
    memory.feed_status.push(...seedFeeds());
  }

  if (db) return mode;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  try {
    if (credPath && existsSync(resolve(credPath))) {
      const json = JSON.parse(readFileSync(resolve(credPath), 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(json) });
      db = admin.firestore();
      mode = 'firestore';
      return mode;
    }
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      db = admin.firestore();
      mode = 'firestore';
      return mode;
    }
  } catch (e) {
    console.warn('[citypulse] Firestore init failed, using in-memory store:', e);
  }

  mode = 'memory';
  return mode;
}

export function getStoreMode(): StoreMode {
  return mode;
}

async function col<T>(name: keyof typeof memory, id?: string): Promise<T | T[]> {
  if (mode === 'memory') {
    const arr = memory[name] as T[];
    if (id) return arr.find((x: any) => x.id === id) as T;
    return [...arr] as T[];
  }
  if (!db) throw new Error('Firestore not initialized');
  if (id) {
    const snap = await db.collection(name).doc(id).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as T) : (null as T);
  }
  const snap = await db.collection(name).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export async function listEvents(filter?: {
  zone?: string;
  source?: string;
  type?: string;
  since?: string;
  minSeverity?: number;
  limit?: number;
}): Promise<CivicEvent[]> {
  let events =
    mode === 'memory'
      ? [...memory.events]
      : ((await col<CivicEvent>('events')) as CivicEvent[]);

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (filter?.zone) events = events.filter((e) => e.location.zone === filter.zone);
  if (filter?.source) events = events.filter((e) => e.source === filter.source);
  if (filter?.type) events = events.filter((e) => e.type === filter.type);
  if (filter?.since) events = events.filter((e) => e.timestamp >= filter.since!);
  if (filter?.minSeverity != null)
    events = events.filter((e) => e.severity >= filter.minSeverity!);

  const limit = filter?.limit ?? 500;
  return events.slice(-limit);
}

export async function getEventById(id: string): Promise<CivicEvent | null> {
  if (mode === 'memory') {
    return memory.events.find((e) => e.id === id) ?? null;
  }
  if (!db) return null;
  const snap = await db.collection('events').doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<CivicEvent, 'id'>) };
}

export async function writeEvent(event: CivicEvent): Promise<void> {
  if (mode === 'memory') {
    const idx = memory.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) memory.events[idx] = event;
    else memory.events.push(event);
    return;
  }
  if (!db) return;
  await db.collection('events').doc(event.id).set(event);
}

export async function deleteEventsBySimulation(simulationId: string): Promise<number> {
  if (mode === 'memory') {
    const before = memory.events.length;
    memory.events = memory.events.filter(
      (e) => e.metadata?.simulation_id !== simulationId,
    );
    return before - memory.events.length;
  }
  if (!db) return 0;
  const snap = await db.collection('events').where('metadata.simulation_id', '==', simulationId).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export async function deleteReplayEvents(replayId?: string): Promise<number> {
  if (mode === 'memory') {
    const before = memory.events.length;
    memory.events = memory.events.filter((e) => {
      if (!e.metadata?.replay) return true;
      if (replayId && e.metadata?.replay_id !== replayId) return true;
      return false;
    });
    return before - memory.events.length;
  }
  if (!db) return 0;
  let q = db.collection('events').where('metadata.replay', '==', true);
  if (replayId) {
    q = q.where('metadata.replay_id', '==', replayId);
  }
  const snap = await q.get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}


export async function listZones(): Promise<ZoneDoc[]> {
  return mode === 'memory'
    ? [...memory.zones]
    : ((await col<ZoneDoc>('zones')) as ZoneDoc[]);
}

export async function updateZone(id: string, patch: Partial<ZoneDoc>): Promise<void> {
  if (mode === 'memory') {
    const z = memory.zones.find((x) => x.id === id);
    if (z) Object.assign(z, patch, { last_updated: isoNow() });
    return;
  }
  if (!db) return;
  await db.collection('zones').doc(id).set({ ...patch, last_updated: isoNow() }, { merge: true });
}

export async function listAnomalies(): Promise<AnomalyDoc[]> {
  return mode === 'memory'
    ? [...memory.anomalies]
    : ((await col<AnomalyDoc>('anomalies')) as AnomalyDoc[]);
}

export async function writeAnomaly(doc: AnomalyDoc): Promise<void> {
  if (mode === 'memory') {
    memory.anomalies.push(doc);
    return;
  }
  if (!db) return;
  await db.collection('anomalies').doc(doc.id).set(doc);
}

export async function deleteAnomaliesBySimulation(simulationId: string): Promise<number> {
  if (mode === 'memory') {
    const before = memory.anomalies.length;
    memory.anomalies = memory.anomalies.filter((a) => a.simulation_id !== simulationId);
    return before - memory.anomalies.length;
  }
  if (!db) return 0;
  const snap = await db
    .collection('anomalies')
    .where('simulation_id', '==', simulationId)
    .get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export async function listCorrelations(): Promise<CorrelationDoc[]> {
  return mode === 'memory'
    ? [...memory.correlations]
    : ((await col<CorrelationDoc>('correlations')) as CorrelationDoc[]);
}

export async function writeCorrelation(doc: CorrelationDoc): Promise<void> {
  if (mode === 'memory') {
    memory.correlations.push(doc);
    return;
  }
  if (!db) return;
  await db.collection('correlations').doc(doc.id).set(doc);
}

export async function deleteCorrelationsBySimulation(simulationId: string): Promise<number> {
  if (mode === 'memory') {
    const before = memory.correlations.length;
    memory.correlations = memory.correlations.filter((c) => c.simulation_id !== simulationId);
    return before - memory.correlations.length;
  }
  if (!db) return 0;
  const snap = await db
    .collection('correlations')
    .where('simulation_id', '==', simulationId)
    .get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export async function listAlerts(status?: string): Promise<AlertDoc[]> {
  let alerts =
    mode === 'memory'
      ? [...memory.alerts]
      : ((await col<AlertDoc>('alerts')) as AlertDoc[]);
  if (status) alerts = alerts.filter((a) => a.status === status);
  alerts.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return alerts;
}

export async function writeAlert(doc: AlertDoc): Promise<void> {
  if (mode === 'memory') {
    memory.alerts.push(doc);
    return;
  }
  if (!db) return;
  await db.collection('alerts').doc(doc.id).set(doc);
}

export async function patchAlert(id: string, patch: Partial<AlertDoc>): Promise<AlertDoc | null> {
  if (mode === 'memory') {
    const a = memory.alerts.find((x) => x.id === id);
    if (!a) return null;
    Object.assign(a, patch);
    return a;
  }
  if (!db) return null;
  await db.collection('alerts').doc(id).set(patch, { merge: true });
  const snap = await db.collection('alerts').doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as AlertDoc) : null;
}

export async function deleteAlertsBySimulation(simulationId: string): Promise<number> {
  if (mode === 'memory') {
    const before = memory.alerts.length;
    memory.alerts = memory.alerts.filter((a) => a.simulation_id !== simulationId);
    return before - memory.alerts.length;
  }
  if (!db) return 0;
  const snap = await db.collection('alerts').where('simulation_id', '==', simulationId).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export async function listFeedStatus(): Promise<FeedStatusDoc[]> {
  return mode === 'memory'
    ? [...memory.feed_status]
    : ((await col<FeedStatusDoc>('feed_status')) as FeedStatusDoc[]);
}

export async function upsertFeedStatus(doc: FeedStatusDoc): Promise<void> {
  if (mode === 'memory') {
    const idx = memory.feed_status.findIndex((f) => f.source === doc.source);
    if (idx >= 0) memory.feed_status[idx] = doc;
    else memory.feed_status.push(doc);
    return;
  }
  if (!db) return;
  await db.collection('feed_status').doc(doc.source).set(doc);
}

export async function pingFirestore(): Promise<boolean> {
  if (mode === 'memory') return true;
  if (!db) return false;
  try {
    await db.collection('zones').limit(1).get();
    return true;
  } catch {
    return false;
  }
}

export async function resetZonesToNormal(): Promise<void> {
  const zones = await listZones();
  for (const z of zones) {
    await updateZone(z.id, { status: 'normal' });
  }
}
