import { citypulseConfig } from '../config/citypulse.config.js';
import { groqConfigured } from '../intelligence/groqBrief.js';
import { getStoreMode, isoNow, listFeedStatus, pingFirestore } from '../store/firestore.js';

export type HealthState = 'Healthy' | 'Delayed' | 'Failed' | 'Unknown' | 'Unavailable';

function feedState(lastSuccessIso: string, forced?: string): HealthState {
  if (forced === 'failed') return 'Failed';
  if (forced === 'delayed') return 'Delayed';
  try {
    const t = new Date(lastSuccessIso.replace('+05:30', '+0530')).getTime();
    const age = Date.now() - t;
    if (age >= citypulseConfig.health.feedFailedAfterMs) return 'Failed';
    if (age >= citypulseConfig.health.feedDelayedAfterMs) return 'Delayed';
    return 'Healthy';
  } catch {
    return 'Unknown';
  }
}

const simulatedFeedOverride = new Map<string, 'failed' | 'delayed' | null>();

export function simulateFeedFailure(source: string): void {
  simulatedFeedOverride.set(source, 'failed');
}

export function simulateFeedRecover(source: string): void {
  simulatedFeedOverride.set(source, null);
}

export async function getSystemHealth() {
  const lastUpdate = isoNow();
  const feeds: Record<string, HealthState> = {
    weather: 'Unknown',
    traffic: 'Unknown',
    transit: 'Unknown',
  };

  try {
    const status = await listFeedStatus();
    for (const f of status) {
      feeds[f.source as keyof typeof feeds] = feedState(
        f.last_success,
        simulatedFeedOverride.get(f.source) ?? f.health,
      );
    }
  } catch {
    feeds.weather = feeds.traffic = feeds.transit = 'Unknown';
  }

  let firestore: HealthState = 'Unknown';
  try {
    const ok = await pingFirestore();
    firestore = ok ? 'Healthy' : 'Failed';
  } catch {
    firestore = 'Unknown';
  }

  let groq: HealthState = 'Unknown';
  try {
    groq = groqConfigured() ? 'Healthy' : 'Unavailable';
  } catch {
    groq = 'Unknown';
  }

  if (groq === 'Unavailable') {
    // PRD UI label
  }

  return {
    weather: feeds.weather,
    traffic: feeds.traffic,
    transit: feeds.transit,
    firestore,
    groq: groqConfigured() ? ('Healthy' as HealthState) : ('Unavailable' as HealthState),
    groqConfigured: groqConfigured(),
    storeMode: getStoreMode(),
    lastUpdate,
  };
}
