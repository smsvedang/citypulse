import { db } from '../lib/firebase.js';

export async function listAnomalies({ zone, since, limit = 50 } = {}) {
  const rows = db ? await db.collection('anomalies').list() : [];
  const filtered = rows.filter((item) => {
    if (zone && item.zone !== zone && item.location?.zone !== zone) return false;
    if (since) {
      const value = new Date(item.timestamp || item.created_at || 0).getTime();
      if (value < new Date(since).getTime()) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime());

  return filtered.slice(0, Math.min(limit, 200));
}
