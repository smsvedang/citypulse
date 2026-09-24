import { citypulseConfig, type ReplaySpeed } from '../config/citypulse.config.js';
import { deleteReplayEvents, listEvents } from '../store/firestore.js';
import type { CivicEvent } from '../types/civic.js';
import { ingestEvent } from './eventPipeline.js';

type ReplayState = 'idle' | 'playing' | 'paused' | 'finished';

interface ReplaySession {
  replayId: string;
  events: CivicEvent[];
  index: number;
  speed: ReplaySpeed;
  state: ReplayState;
  timer: ReturnType<typeof setTimeout> | null;
  startedAt: number;
}

let session: ReplaySession | null = null;

function clearTimer(): void {
  if (session?.timer) {
    clearTimeout(session.timer);
    session.timer = null;
  }
}

function parseTs(iso: string): number {
  return new Date(iso.replace('+05:30', '+0530')).getTime();
}

function getStoredDemoScenario(): CivicEvent[] {
  const baseTime = Date.now() - 3600_000;
  const pad = (n: number) => String(n).padStart(2, '0');
  const makeIso = (offsetMs: number) => {
    const d = new Date(baseTime + offsetMs);
    const off = 5.5 * 60;
    const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
    const ist = new Date(utc + off * 60_000);
    return `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}T${pad(ist.getHours())}:${pad(ist.getMinutes())}:${pad(ist.getSeconds())}+05:30`;
  };

  return [
    {
      id: 'demo_hist_01',
      source: 'weather',
      type: 'weather_alert',
      severity: 0.76,
      location: { lat: 26.91, lng: 75.79, zone: 'Z04' },
      timestamp: makeIso(0),
      metadata: { rain_mm: 35 },
      confidence: 0.92,
    },
    {
      id: 'demo_hist_02',
      source: 'traffic',
      type: 'traffic_incident',
      severity: 0.62,
      location: { lat: 26.912, lng: 75.792, zone: 'Z04' },
      timestamp: makeIso(60_000),
      metadata: { lane_blocked: 1 },
      confidence: 0.86,
    },
    {
      id: 'demo_hist_03',
      source: 'transit',
      type: 'transit_delay',
      severity: 0.68,
      location: { lat: 26.91, lng: 75.79, zone: 'Z04' },
      timestamp: makeIso(120_000),
      metadata: { delay_min: 15 },
      confidence: 0.89,
    },
    {
      id: 'demo_hist_04',
      source: 'traffic',
      type: 'traffic_incident',
      severity: 0.78,
      location: { lat: 26.914, lng: 75.795, zone: 'Z04' },
      timestamp: makeIso(180_000),
      metadata: { congestion_level: 'high' },
      confidence: 0.94,
    },
  ];
}

async function scheduleNext(): Promise<void> {
  if (!session || session.state !== 'playing') return;
  if (session.index >= session.events.length) {
    session.state = 'finished';
    clearTimer();
    return;
  }

  const current = session.events[session.index];
  const next = session.events[session.index + 1];
  let delayMs = 1000;
  if (next) {
    const gap = parseTs(next.timestamp) - parseTs(current.timestamp);
    delayMs = Math.max(200, gap / session.speed);
  }

  session.timer = setTimeout(async () => {
    if (!session || session.state !== 'playing') return;
    const ev = session.events[session.index];
    const replayEventId = `${ev.id}_rep_${session.replayId}_${session.index}`;
    await ingestEvent({
      ...ev,
      id: replayEventId,
      metadata: { ...ev.metadata, replay: true, replay_id: session.replayId },
    });
    session.index += 1;
    if (session.index >= session.events.length) {
      session.state = 'finished';
      clearTimer();
      return;
    }
    void scheduleNext();
  }, delayMs);
}

export async function replayStart(options?: { speed?: ReplaySpeed }): Promise<{ ok: boolean; message?: string }> {
  if (session?.state === 'playing') {
    return { ok: false, message: 'Replay already playing' };
  }

  replayStopInternal(false);

  const events = await listEvents({ limit: 500 });
  let historical = events
    .filter((e) => !e.metadata?.simulation_id && !e.metadata?.replay)
    .sort((a, b) => parseTs(a.timestamp) - parseTs(b.timestamp));

  if (historical.length < 2) {
    historical = getStoredDemoScenario();
  }

  const replayId = `replay_${Date.now()}`;
  session = {
    replayId,
    events: historical,
    index: 0,
    speed: options?.speed ?? citypulseConfig.replay.defaultSpeed,
    state: 'playing',
    timer: null,
    startedAt: Date.now(),
  };

  void scheduleNext();
  return { ok: true };
}

function replayStopInternal(clearSession: boolean): void {
  clearTimer();
  if (session) {
    session.state = session.state === 'playing' ? 'paused' : session.state;
    if (clearSession) session = null;
  }
}

export function replayStop(): void {
  if (session) session.state = 'paused';
  clearTimer();
}

export function replayPause(): void {
  if (session?.state === 'playing') {
    session.state = 'paused';
    clearTimer();
  }
}

export function replayResume(): void {
  if (session && (session.state === 'paused' || session.state === 'idle')) {
    session.state = 'playing';
    void scheduleNext();
  }
}

export function replaySetSpeed(speed: ReplaySpeed): void {
  if (!session) return;
  if (!citypulseConfig.replay.speeds.includes(speed)) return;
  session.speed = speed;
}

export async function replayReset(): Promise<void> {
  clearTimer();
  const replayId = session?.replayId;
  session = null;
  await deleteReplayEvents(replayId);
}

export function replayStatus() {
  if (!session) {
    return {
      state: 'idle' as ReplayState,
      speed: citypulseConfig.replay.defaultSpeed,
      progress: { current: 0, total: 0 },
      replayId: null,
    };
  }
  return {
    state: session.state,
    speed: session.speed,
    progress: { current: session.index, total: session.events.length },
    replayId: session.replayId,
  };
}

