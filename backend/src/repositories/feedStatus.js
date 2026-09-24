import { db } from '../lib/firebase.js';

const defaultStatus = {
  weather: { source: 'weather', health: 'healthy', error_count: 0, last_success: null, latency_ms: 0, mode: 'synthetic', expected_interval_s: 300 },
  traffic: { source: 'traffic', health: 'healthy', error_count: 0, last_success: null, latency_ms: 0, mode: 'synthetic', expected_interval_s: 60 },
  transit: { source: 'transit', health: 'healthy', error_count: 0, last_success: null, latency_ms: 0, mode: 'synthetic', expected_interval_s: 60 },
  synthetic: { source: 'synthetic', health: 'healthy', error_count: 0, last_success: null, latency_ms: 0, mode: 'synthetic', expected_interval_s: 60 },
};

export async function getFeedStatus(source) {
  if (!db) {
    return defaultStatus[source] || null;
  }
  const snapshot = await db.collection('feed_status').doc(source).get();
  if (!snapshot.exists) return defaultStatus[source] || null;
  return snapshot.data();
}

export async function upsertFeedStatus(source, payload) {
  if (!db) return { ...defaultStatus[source], ...payload };
  const collection = db.collection('feed_status');
  await collection.doc(source).set({ source, ...payload });
  return { source, ...payload };
}

export async function listFeedStatus() {
  if (!db) return Object.values(defaultStatus);
  const rows = await db.collection('feed_status').list();
  return rows;
}
