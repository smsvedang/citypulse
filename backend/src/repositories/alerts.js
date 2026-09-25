import { db } from '../lib/firebase.js';
import { sendAlertNotifications } from '../services/notificationService.js';

export async function writeAlert(alert) {
  if (!db) return alert;
  await db.collection('alerts').doc(alert.id).set(alert);
  await sendAlertNotifications(alert).catch(() => undefined);
  return alert;
}

export async function createAlertForEvent(event) {
  const severity = Number(event.severity || 0) >= 0.75 ? 'high' : Number(event.severity || 0) >= 0.5 ? 'medium' : 'low';
  if (Number(event.severity || 0) < 0.3) return null;

  const alert = {
    id: `alert_${event.id}`,
    title: `${severity === 'high' ? 'Red' : severity === 'medium' ? 'Yellow' : 'Green'} civic alert in ${event.location?.zone || 'the city'}`,
    body: `${event.type.replace(/_/g, ' ')} detected with severity ${Number(event.severity || 0).toFixed(2)}. Review the live pulse for context.`,
    severity,
    zone_id: event.location?.zone || 'CITY',
    created_at: event.timestamp || new Date().toISOString(),
    status: 'active',
    source_refs: { event_ids: [event.id] },
  };

  const existing = await db.collection('alerts').doc(alert.id).get();
  if (existing.exists) return null;
  return writeAlert(alert);
}

export async function listAlerts({ zone, since, limit = 50 } = {}) {
  const rows = db ? await db.collection('alerts').list() : [];
  const filtered = rows.filter((item) => {
    if (zone && item.zone !== zone && item.zone_id !== zone && item.location?.zone !== zone) return false;
    if (since) {
      const value = new Date(item.timestamp || item.created_at || 0).getTime();
      if (value < new Date(since).getTime()) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime());

  return filtered.slice(0, Math.min(limit, 200));
}
