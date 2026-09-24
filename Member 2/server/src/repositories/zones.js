import { zoneSeedData } from '../config/zones.seed.js';
import { db } from '../lib/firebase.js';

export async function seedZones() {
  const collection = db?.collection('zones');
  if (!collection) return zoneSeedData;

  for (const zone of zoneSeedData) {
    await collection.doc(zone.id).set({ ...zone, id: zone.id, name: zone.name, center: zone.center, baseline_config: zone.baseline_config });
  }

  return zoneSeedData;
}

export async function listZones() {
  if (!db) return zoneSeedData;
  const entries = await db.collection('zones').list();
  if (entries.length === 0) {
    await seedZones();
    return zoneSeedData;
  }
  return entries.map((item) => ({ ...item, id: item.id }));
}

export async function getZoneById(zoneId) {
  if (!db) return zoneSeedData.find((zone) => zone.id === zoneId) || null;
  const snapshot = await db.collection('zones').doc(zoneId).get();
  if (!snapshot.exists) {
    await seedZones();
    const refreshed = await db.collection('zones').doc(zoneId).get();
    return refreshed.exists ? refreshed.data() : null;
  }
  return snapshot.data();
}

export async function getZoneByLocation(lat, lng, maxDistanceKm = 8) {
  const zones = await listZones();
  let nearest = null;
  let minDistance = Infinity;

  for (const zone of zones) {
    const center = zone.center || {};
    const distance = haversineKm(lat, lng, center.lat, center.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = zone;
    }
  }

  if (!nearest || minDistance > maxDistanceKm) return null;
  return nearest;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
