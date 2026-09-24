import { db } from '../lib/firebase.js';
import { createDeterministicEventId } from '../lib/ids.js';
import { parseSince } from '../lib/time.js';

export async function addEvent(event) {
  const collection = db?.collection('events');
  const payload = { ...event };
  if (!payload.id) payload.id = createDeterministicEventId({ source: payload.source, type: payload.type, zone: payload.location?.zone || 'global', dedupeKey: `${payload.timestamp}-${Math.random().toString(16).slice(2)}` });

  if (collection) {
    await collection.doc(payload.id).set(payload);
    return payload;
  }

  const store = db; 
  if (!store) {
    return payload;
  }
  store.collection('events').doc(payload.id).set(payload);
  return payload;
}

export async function listEvents({ zone, source, type, since, severity, limit = 100, offset = 0 } = {}) {
  const collection = db?.collection('events');
  const rows = collection ? await collection.list() : [];
  const zoneFilters = zone ? (Array.isArray(zone) ? zone : String(zone).split(',').map((item) => item.trim()).filter(Boolean)) : [];
  const sourceFilters = source ? (Array.isArray(source) ? source : String(source).split(',').map((item) => item.trim()).filter(Boolean)) : [];
  const typeFilters = type ? (Array.isArray(type) ? type : String(type).split(',').map((item) => item.trim()).filter(Boolean)) : [];

  const minDate = since ? parseSince(since, new Date()).getTime() : null;
  const minSeverity = severity != null ? Number(severity) : null;

  return rows
    .filter((event) => {
      if (zoneFilters.length && !zoneFilters.includes(String(event.location?.zone || ''))) return false;
      if (sourceFilters.length && !sourceFilters.includes(String(event.source || ''))) return false;
      if (typeFilters.length && !typeFilters.includes(String(event.type || ''))) return false;
      if (minDate != null && new Date(event.timestamp || 0).getTime() < minDate) return false;
      if (minSeverity != null && Number(event.severity || 0) < minSeverity) return false;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime())
    .slice(offset, offset + Number(limit || 100));
}

export async function deleteSyntheticScenarioEvents(scenarioId) {
  if (!db) return 0;
  const collection = db.collection('events');
  const rows = await collection.list();
  let count = 0;
  for (const row of rows) {
    if (row.metadata?.synthetic === true && row.metadata?.scenario_id === scenarioId) {
      await collection.doc(row.id).delete();
      count += 1;
    }
  }
  return count;
}
