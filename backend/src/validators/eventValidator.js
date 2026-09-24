import { z } from 'zod';
import { env } from '../config/env.js';
import { civicEventSchema, EVENT_TYPES, SOURCES } from '../schemas/civicEvent.js';
import { getZoneById, listZones } from '../repositories/zones.js';
import { toUtcIso } from '../lib/time.js';

const bbox = env.CITY_BBOX.split(',').map(Number);
const [minLat, minLng, maxLat, maxLng] = bbox;

export async function validateEvent(event) {
  const errors = [];
  const source = event.source;
  const type = event.type;
  const metadata = event.metadata || {};

  if (!event.id || !/^evt_[a-z0-9_]{3,32}$/.test(event.id)) {
    errors.push({ code: 'ID_INVALID', field: 'id', message: 'Invalid event id.' });
  }

  if (!SOURCES.includes(source)) {
    errors.push({ code: 'SOURCE_INVALID', field: 'source', message: 'Source is invalid.' });
  }

  if (!EVENT_TYPES.includes(type)) {
    errors.push({ code: 'TYPE_INVALID', field: 'type', message: 'Type is invalid.' });
  }

  if (typeof event.severity !== 'number' || !Number.isFinite(event.severity) || event.severity < 0 || event.severity > 1) {
    errors.push({ code: 'SEVERITY_OUT_OF_RANGE', field: 'severity', message: 'Severity must be between 0 and 1.' });
  }

  if (typeof event.confidence !== 'number' || !Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1) {
    errors.push({ code: 'CONFIDENCE_OUT_OF_RANGE', field: 'confidence', message: 'Confidence must be between 0 and 1.' });
  }

  if (!event.location || typeof event.location !== 'object') {
    errors.push({ code: 'COORDS_INVALID', field: 'location', message: 'Location is required.' });
  } else {
    const { lat, lng, zone } = event.location;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push({ code: 'COORDS_INVALID', field: 'location', message: 'Latitude/longitude invalid.' });
    }
    if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
      errors.push({ code: 'COORDS_OUT_OF_BBOX', field: 'location', message: 'Coordinates outside city bbox.' });
    }

    const zones = await listZones();
    const zoneExists = zones.some((entry) => entry.id === zone);
    if (!zoneExists) {
      errors.push({ code: 'ZONE_UNKNOWN', field: 'location.zone', message: 'Zone does not exist.' });
    }
  }

  const ts = new Date(event.timestamp);
  if (Number.isNaN(ts.getTime())) {
    errors.push({ code: 'TIMESTAMP_INVALID', field: 'timestamp', message: 'Timestamp is invalid.' });
  } else {
    const now = Date.now();
    const futureLimit = now + 5 * 60 * 1000;
    const maxAgeMs = Number(env.MAX_EVENT_AGE_HOURS) * 60 * 60 * 1000;
    const valueTime = ts.getTime();
    const canonical = toUtcIso(ts);
    if (valueTime > futureLimit) errors.push({ code: 'TIMESTAMP_FUTURE', field: 'timestamp', message: 'Event timestamp is too far in the future.' });
    if (!metadata.backfill && valueTime < now - maxAgeMs) errors.push({ code: 'TIMESTAMP_TOO_OLD', field: 'timestamp', message: 'Event timestamp is too old.' });
    event.timestamp = canonical;
    event.timestamp_ms = valueTime;
  }

  if (!event.metadata || typeof event.metadata !== 'object' || Array.isArray(event.metadata) || Buffer.byteLength(JSON.stringify(event.metadata), 'utf8') > 4096) {
    errors.push({ code: 'METADATA_INVALID', field: 'metadata', message: 'Metadata must be a plain object under 4KB.' });
  }

  if (source === 'weather' && type !== 'weather_alert') {
    errors.push({ code: 'SOURCE_TYPE_MISMATCH', field: 'type', message: 'Weather source must use weather_alert.' });
  }
  if (source === 'traffic' && !['traffic_incident', 'road_hazard'].includes(type)) {
    errors.push({ code: 'SOURCE_TYPE_MISMATCH', field: 'type', message: 'Traffic source must use traffic_incident or road_hazard.' });
  }
  if (source === 'transit' && type !== 'transit_delay') {
    errors.push({ code: 'SOURCE_TYPE_MISMATCH', field: 'type', message: 'Transit source must use transit_delay.' });
  }
  if (source === 'synthetic' && !['civic_complaint', 'power_outage', 'air_quality_alert', 'road_hazard'].includes(type)) {
    errors.push({ code: 'SOURCE_TYPE_MISMATCH', field: 'type', message: 'Synthetic source type mismatch.' });
  }

  if (metadata.synthetic !== true && (source === 'weather' && event.type === 'weather_alert' && event.metadata?.subtype === 'heavy_rain')) {
    // synthetic label requirement applies to synthetic feed outputs
  }

  if (metadata.synthetic === false) {
    delete event.metadata.synthetic;
  }

  if ((source === 'weather' || source === 'traffic' || source === 'transit') && metadata.synthetic === true && !['weather_alert', 'traffic_incident', 'road_hazard', 'transit_delay'].includes(type)) {
    errors.push({ code: 'SYNTHETIC_UNLABELED', field: 'metadata.synthetic', message: 'Synthetic-mode events must carry the synthetic label and valid domain type.' });
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, event };
}
