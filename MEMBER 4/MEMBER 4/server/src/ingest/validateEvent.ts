import { CIVIC_EVENT_TYPES, type CivicEvent } from '../types/civic.js';

export function validateCivicEvent(input: Partial<CivicEvent>): CivicEvent {
  const id = String(input.id ?? '').trim();
  const source = String(input.source ?? '').trim();
  const type = String(input.type ?? '').trim();
  const severity = Number(input.severity);
  const confidence = Number(input.confidence);
  const lat = Number(input.location?.lat);
  const lng = Number(input.location?.lng);
  const zone = String(input.location?.zone ?? '').trim();
  const timestamp = String(input.timestamp ?? '').trim();

  if (!id) throw new Error('Event id is required');
  if (!source) throw new Error('Event source is required');
  if (!type) throw new Error('Event type is required');
  if (!CIVIC_EVENT_TYPES.includes(type as any)) {
    throw new Error(`Unsupported event type: ${type}`);
  }
  if (!Number.isFinite(severity) || severity < 0 || severity > 1) {
    throw new Error('severity must be between 0 and 1');
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('confidence must be between 0 and 1');
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('location lat/lng required');
  }
  if (!zone) throw new Error('location.zone required');
  if (!timestamp) throw new Error('timestamp required');

  return {
    id,
    source,
    type,
    severity,
    location: { lat, lng, zone },
    timestamp,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    confidence,
  };
}
