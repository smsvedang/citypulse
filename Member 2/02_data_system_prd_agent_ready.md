# PRD 02 — Data, Ingestion, Normalization & Firebase (Agent-Ready)

> **How to use this document:** This is a build spec for an AI coding agent. Sections marked **MUST** are requirements. Sections marked **DECISION** are ambiguities in the original PRD that have been resolved so you don't have to guess; do not re-litigate them. Anything not specified is your call, but never change the shared schemas, collection names, or endpoint paths.

---

# 0. Shared Engineering Contract (unchanged unless marked DECISION)

## Product
CityPulse is a live civic health dashboard that fuses weather, traffic/incidents, transit and optional synthetic civic signals into a common event model, detects anomalies/correlations, and explains the situation in plain language.

## Shared Stack
- Frontend: React + Vite + Tailwind CSS
- Map: Leaflet (or MapLibre if standardized by the team)
- Backend: Node.js + Express
- Database: Firebase Cloud Firestore
- Realtime: Firestore realtime listeners (frontend reads Firestore directly)
- AI: Groq API (not part of this module)
- Charts: Recharts
- Source control: GitHub

## Shared CivicEvent Contract
```json
{
  "id": "evt_001",
  "source": "weather",
  "type": "weather_alert",
  "severity": 0.82,
  "location": {"lat": 26.91, "lng": 75.79, "zone": "Z04"},
  "timestamp": "2026-09-24T12:30:00+05:30",
  "metadata": {"subtype": "heavy_rain", "rain_mm": 41},
  "confidence": 0.94
}
```

Supported `type` values (closed enum):
`weather_alert`, `traffic_incident`, `transit_delay`, `civic_complaint`, `power_outage`, `road_hazard`, `air_quality_alert`.

Supported `source` values (closed enum): `weather`, `traffic`, `transit`, `synthetic`.

## Firestore Collections (names are fixed)
```text
events/  zones/  anomalies/  correlations/  alerts/  feed_status/
```

## Shared APIs (paths are fixed)
```text
GET  /api/events        GET  /api/zones         GET  /api/pulse
GET  /api/anomalies     GET  /api/correlations  GET  /api/alerts
GET  /api/feed-status   POST /api/events
POST /api/replay/start  POST /api/replay/stop
```

## Reliability Rules
- Show latest update time.
- Show feed health and delayed feeds.
- Keep confidence on uncertain data.
- Never claim causation from correlation alone.
- Clearly label synthetic/demo data.
- One failed feed must not break the dashboard.
- Do not expose private identities from civic data.

## AI Rule
Groq is used for grounded language generation only. Code computes facts, anomalies, correlations and evidence first. The model receives a compact structured evidence object and must return structured JSON. It never infers raw city state. *(Out of scope for this module; listed so you don't add LLM calls here.)*

## Demo Story
Heavy rain is injected into Zone 4 → traffic incidents rise → transit delay appears → anomaly detected → spatial/temporal correlation detected → Zone 4 status changes → dashboard updates live → Groq generates a grounded brief → alert can fire.

**This module must make the first three steps happen on demand and reliably** (see §9 Replay).

---

# 1. Contract Deltas (DECISIONS — read first)

The original PRD had internal inconsistencies. These are resolved as follows. Other team members depend on these; do not deviate.

| # | Problem in original | DECISION |
|---|---|---|
| D1 | Example event used `"type": "heavy_rain"`, which is not in the supported-types list. | Rain is `type: "weather_alert"` with `metadata.subtype: "heavy_rain"`. The type enum is closed; reject anything else. |
| D2 | `source` values were never enumerated. | `source` ∈ `weather \| traffic \| transit \| synthetic`. |
| D3 | "Clearly label synthetic data" had no mechanism, and "three synthetic feeds" conflicts with a `synthetic` source. | Weather/traffic/transit each run in `live` or `synthetic` **mode**. Events from a synthetic-mode feed keep their domain `source` (`weather`, `traffic`, `transit`) and MUST carry `metadata.synthetic: true`. Source `synthetic` is reserved for the optional civic signals (`civic_complaint`, `power_outage`, `air_quality_alert` when simulated). Downstream analytics should filter by `type`, not `source`. |
| D4 | Timestamp format/offset inconsistent; string range queries break across offsets. | Input: any ISO-8601 with offset. **Stored and returned: canonical UTC, `YYYY-MM-DDTHH:mm:ss.sssZ`.** Firestore docs additionally hold an internal `timestamp_ms` (number) used for range queries; the repository strips it from all API responses. |
| D5 | `feed_status.health` only showed `"healthy"`. | Enum: `healthy \| degraded \| delayed \| down`. Extra fields are additive (see §5.3). |
| D6 | No response envelope defined. | All `GET` list endpoints return `{ "data": [...], "meta": { ... } }`. Errors return `{ "error": { "code", "message", "details?" } }`. |
| D7 | `/api/pulse`, `/api/anomalies`, `/api/correlations`, `/api/alerts` are listed here but computed by other modules. | This module implements thin read endpoints over the collections (empty `data: []` when nothing exists) and an interim `/api/pulse` behind a replaceable `pulseService` seam (§8.4). |
| D8 | Event `id` format unspecified. | `evt_` + 16 hex chars. Deterministic for adapter/generator events (idempotent re-ingest); random for client `POST`s that omit `id`. |

---

# 2. Objective & Scope

## Objective
Convert weather, traffic/incidents and transit data into valid `CivicEvent` objects, store them in Firestore, expose them through REST APIs, and report feed health — with graceful degradation and a one-click demo simulator.

## In scope (P0)
Firestore setup · synthetic feed generators · ingestion adapters · CivicEvent normalizer/validator · `events` and `zones` collections · feed health · REST APIs · graceful feed failure · replay/demo simulator.

## P1 (only after all P0 acceptance passes)
Live Open-Meteo weather adapter · Open-Meteo air-quality adapter · Firestore TTL (`expires_at`, 7 days) on events · simulated feed-failure toggle in replay · `GET /api/replay/status`.

## Out of scope (do NOT build)
Anomaly detection, correlation logic, alert firing, Groq integration, frontend UI. Only provide the read endpoints/collections they need.

---

# 3. Architecture

```text
Weather ───────┐
Traffic ───────┼→ Adapter → Normalizer → PII scrub → Validator → Repository → Firestore
Transit ───────┘     ↑                                                  ↓
Synthetic ───────────┘ (generators emit raw payloads and go through the same pipeline)
                                                                  Express API → Frontend
```

**MUST:** synthetic generators emit *raw* payloads that pass through `normalizeSynthetic` and the full validator — never write events straight to Firestore. This keeps the demo path identical to the production path.

## 3.1 Tech choices (fixed)
- Node.js ≥ 20, **ESM**, plain JavaScript with JSDoc types.
- Dependencies: `express`, `cors`, `helmet`, `express-rate-limit`, `firebase-admin`, `zod`, `pino`, `dotenv`, `node-cron` (or `setInterval`), dev: `vitest`, `supertest`. Don't add others without a stated reason in the README.

## 3.2 Directory layout
```text
server/
  src/
    index.js                      # boot: env → firebase → seed zones → scheduler → listen
    app.js                        # express app factory (used by tests)
    config/env.js                 # zod-validated env, fail fast
    config/zones.seed.js
    lib/{firebase,logger,time,geo,errors,ids,pii}.js
    schemas/civicEvent.js         # zod schema + enums
    normalizers/{weather,traffic,transit,synthetic,index}.js
    validators/eventValidator.js
    adapters/{baseAdapter,weather,traffic,transit,syntheticCivic}.js
    generators/{heavyRain,trafficSpike,transitDelay,normalBaseline,index}.js
    ingestion/{pipeline,feedRunner,scheduler}.js
    repositories/{events,zones,feedStatus,anomalies,correlations,alerts}.js
    services/{feedHealth,pulseService,replayService}.js
    routes/{events,zones,pulse,anomalies,correlations,alerts,feedStatus,replay,health}.js
    middleware/{errorHandler,rateLimit,demoGuard,validateQuery,notFound}.js
  scripts/{seed-zones,seed-baseline,simulate}.js
  test/{unit,integration}/...
  firestore.rules
  firestore.indexes.json
  .env.example
  README.md
```

---

# 4. Environment & Security

## 4.1 Environment variables (validate with zod at boot; exit with a clear message if invalid)

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `NODE_ENV` | `development` | |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowlist |
| `FIREBASE_PROJECT_ID` | — | Required unless emulator |
| `FIREBASE_SERVICE_ACCOUNT_B64` | — | Base64 of service-account JSON. Alternative: `GOOGLE_APPLICATION_CREDENTIALS` path |
| `FIRESTORE_EMULATOR_HOST` | — | If set, use emulator, no credentials needed (tests/local) |
| `DEMO_MODE` | `true` | Enables `POST /api/events` presets and `/api/replay/*`. If `false` these return 403 |
| `FEED_MODE_WEATHER` / `_TRAFFIC` / `_TRANSIT` | `synthetic` | `live` or `synthetic` |
| `FEED_INTERVAL_WEATHER_S` | `300` | Poll interval |
| `FEED_INTERVAL_TRAFFIC_S` | `60` | |
| `FEED_INTERVAL_TRANSIT_S` | `60` | |
| `FEED_TIMEOUT_MS` | `8000` | Per-request timeout |
| `AUTO_BASELINE` | `true` | Synthetic-mode feeds emit low-severity "normal" events each tick |
| `CITY_BBOX` | `26.70,75.55,27.15,76.05` | `minLat,minLng,maxLat,maxLng`; coordinates outside are rejected |
| `ZONE_MAX_RADIUS_KM` | `8` | Max distance for nearest-zone assignment |
| `MAX_EVENT_AGE_HOURS` | `24` | Reject older timestamps (unless `metadata.backfill: true`) |
| `LOG_LEVEL` | `info` | |

Commit a `.env.example` with **no real values**. `GROQ_API_KEY` belongs to another module; this module must not read or log it.

## 4.2 Security rules (MUST)
- Never commit service-account JSON. `.gitignore` must include `.env*` (except `.env.example`), `*serviceAccount*.json`, `node_modules`.
- Firebase Admin credentials exist only on the server. Never send them to, or log them for, the frontend.
- `helmet()`, CORS allowlist from `CORS_ORIGINS`, JSON body limit `100kb`.
- Rate limits: 120 req/min per IP on all routes; 20 req/min on `POST` routes.
- Write endpoints (`POST /api/events`, `POST /api/replay/*`) are gated by `DEMO_MODE` (no secret needed in the frontend, and none may be exposed there).
- **Firestore security rules** (deliver `firestore.rules`): public read on the six collections, no client writes. The Admin SDK bypasses rules.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function readable(c) { return c in ['events','zones','anomalies','correlations','alerts','feed_status']; }
    match /{collection}/{doc} {
      allow read: if readable(collection);
      allow write: if false;
    }
  }
}
```

## 4.3 Privacy (MUST)
Civic signals must not carry private identities. The PII scrubber runs after normalization and before validation:
- Delete `metadata` keys matching `/(name|phone|mobile|email|address|user|reporter|device|imei|ip|account|aadhaar|license|plate)/i` (allow-list `route_name`, `zone_name`, `road_name`).
- Redact string values matching email or phone-number patterns → `"[redacted]"`.
- Record a count in `metadata.pii_redactions` only if > 0.
- Never log raw payloads at `info` level; log event ids and counts only.

---

# 5. Data Model

## 5.1 `events/{eventId}`
Document = CivicEvent + internal field `timestamp_ms`.

```json
{
  "id": "evt_9f3a1c07b2d45e88",
  "source": "traffic",
  "type": "traffic_incident",
  "severity": 0.75,
  "location": {"lat": 26.91, "lng": 75.79, "zone": "Z04"},
  "timestamp": "2026-09-24T07:00:00.000Z",
  "metadata": {"category": "flooding_congestion", "delay_minutes": 45, "synthetic": true, "scenario_id": "rain_zone4_chain"},
  "confidence": 0.90,
  "timestamp_ms": 1790233200000
}
```
`timestamp_ms` is internal; repositories add it on write and strip it on read.

## 5.2 `zones/{zoneId}`
```json
{
  "id": "Z04",
  "name": "Zone 4",
  "center": {"lat": 26.91, "lng": 75.79},
  "baseline_config": {"window_minutes": 60, "threshold": 2.0}
}
```
**Seed zones** (idempotent upsert at boot and via `npm run seed:zones`). Coordinates are placeholders around Jaipur, editable; `Z04` must stay exactly as shown because the demo story depends on it.

| id | name | lat | lng |
|---|---|---|---|
| Z01 | Zone 1 | 26.9855 | 75.8513 |
| Z02 | Zone 2 | 26.9240 | 75.8270 |
| Z03 | Zone 3 | 26.8500 | 75.8000 |
| Z04 | Zone 4 | 26.9100 | 75.7900 |
| Z05 | Zone 5 | 26.8850 | 75.7400 |
| Z06 | Zone 6 | 26.9500 | 75.7300 |

All use `baseline_config: {"window_minutes": 60, "threshold": 2.0}`.

## 5.3 `feed_status/{source}`
Doc id is the source name: `weather`, `traffic`, `transit`, `synthetic`.

Required (from original contract):
```json
{"source":"weather","last_success":"2026-09-24T07:00:00.000Z","latency_ms":420,"health":"healthy","error_count":0}
```
Additive optional fields (write them; consumers may ignore):
```json
{
  "mode": "synthetic",
  "last_attempt": "…Z",
  "last_error": "timeout after 8000ms",
  "consecutive_failures": 0,
  "expected_interval_s": 60,
  "events_ingested_total": 132,
  "events_rejected_total": 2,
  "last_rejection_reason": "SEVERITY_OUT_OF_RANGE"
}
```
`last_error` must be a short sanitized message (no URLs with keys, no stack traces).

### Health computation (MUST; implement in `services/feedHealth.js`, pure function, unit-tested)
Inputs: `last_success`, `last_attempt`, `consecutive_failures`, `expected_interval_s`, `latency_ms`, rejection ratio over the last 20 events, `now`.

| Health | Condition (first match wins, top to bottom) |
|---|---|
| `down` | `consecutive_failures ≥ 3` **or** `now − last_success > 5 × expected_interval_s` **or** never succeeded and ≥ 1 attempt made |
| `delayed` | `now − last_success > 2 × expected_interval_s` **or** `latency_ms > 5000` |
| `degraded` | `consecutive_failures ≥ 1` **or** rejection ratio > 30% |
| `healthy` | otherwise |

**MUST:** `GET /api/feed-status` recomputes `health` at read time from timestamps, so a dead scheduler shows as delayed/down even if nothing has written recently. (The stored `health` is the value at last write.)

## 5.4 Other collections
`anomalies/`, `correlations/`, `alerts/` are written by other modules. This module provides repositories with `list({limit, since, zone})` and `getById`, and does not define their schemas beyond requiring each doc to have `id` and a `timestamp` or `created_at` ISO string (used for ordering/`since`; if neither exists, order by document id).

---

# 6. Normalization & Validation

## 6.1 Normalizer signatures
```js
normalizeWeather(raw)   // → CivicEvent-candidate | throws NormalizationError
normalizeTraffic(raw)
normalizeTransit(raw)
normalizeSynthetic(raw)
```
Each returns a candidate that then passes through: **PII scrub → zone resolution → confidence adjustment → validator**. Failures throw/return a `ValidationError` with a stable `code`; one bad record never aborts a batch (skip, count, continue).

## 6.2 Raw input shapes (adapters MUST map provider responses to these first)

**Weather raw**
```json
{"observed_at":"2026-09-24T12:30:00+05:30","lat":26.91,"lng":75.79,"zone":"Z04","rain_mm_per_hr":41,"wind_kph":38,"temp_c":27,"provider":"open-meteo|synthetic"}
```
**Traffic raw**
```json
{"incident_id":"tr-118","reported_at":"…","lat":26.91,"lng":75.79,"zone":"Z04","category":"accident|stalled_vehicle|road_closed|flooding_congestion|congestion","delay_minutes":45,"road_name":"…","provider":"…"}
```
**Transit raw**
```json
{"route_id":"R-12","observed_at":"…","lat":26.91,"lng":75.79,"zone":"Z04","delay_minutes":18,"mode":"bus","provider":"…"}
```
**Synthetic raw** (generators and civic signals)
```json
{"kind":"weather|traffic|transit|civic","type":"<any supported type>","severity":0.8,"lat":26.91,"lng":75.79,"zone":"Z04","timestamp":"…","confidence":0.9,"metadata":{},"scenario_id":"rain_zone4_chain"}
```
`normalizeSynthetic` sets `metadata.synthetic = true`, copies `scenario_id`, and maps `kind` → `source` (`weather|traffic|transit` → same; `civic` → `synthetic`).

## 6.3 Mapping rules (deterministic — implement exactly)

| Normalizer | Emits when | `type` | `severity` | base `confidence` |
|---|---|---|---|---|
| weather | `rain_mm_per_hr ≥ 7.6` | `weather_alert`, `metadata.subtype = "heavy_rain"`, `metadata.rain_mm = rain_mm_per_hr` | `clamp(rain_mm_per_hr / 50, 0, 1)` | 0.94 |
| weather | `wind_kph ≥ 60` | `weather_alert`, `subtype = "high_wind"` | `clamp(wind_kph / 100, 0, 1)` | 0.90 |
| traffic | always | `traffic_incident` (or `road_hazard` if `category ∈ {waterlogging, road_closed, debris}`) | `clamp(delay_minutes / 60, 0, 1)` | 0.80 (0.90 if synthetic) |
| transit | `delay_minutes ≥ 5` | `transit_delay` | `clamp(delay_minutes / 30, 0, 1)` | 0.85 |

A weather record may yield 0–2 events. Below-threshold weather is **not** stored (it's not a civic event).

Round `severity` and `confidence` to 2 decimals.

**Freshness adjustment (live data only, skip if `metadata.synthetic`):** `age = now − timestamp`. `confidence *= 1.0` if age ≤ 10 min, `0.85` if ≤ 30 min, `0.7` otherwise.

## 6.4 Zone resolution
1. If `zone` present: must exist in `zones` → else `ZONE_UNKNOWN`.
2. Else: nearest zone center (haversine) within `ZONE_MAX_RADIUS_KM` → else `ZONE_UNRESOLVED`.
3. Zones are cached in memory (refresh every 5 min or on zone write).

## 6.5 Validator (`validators/eventValidator.js`, zod-based)
Return `{ok: true, event}` or `{ok: false, errors: [{code, field, message}]}`.

| Field | Rule | Error code |
|---|---|---|
| `id` | `/^evt_[a-z0-9_]{3,32}$/` | `ID_INVALID` |
| `source` | in enum | `SOURCE_INVALID` |
| `type` | in enum | `TYPE_INVALID` |
| `severity` | number, `0 ≤ x ≤ 1`, finite | `SEVERITY_OUT_OF_RANGE` |
| `confidence` | number, `0 ≤ x ≤ 1`, finite | `CONFIDENCE_OUT_OF_RANGE` |
| `location.lat/lng` | finite; `-90..90` / `-180..180`; inside `CITY_BBOX` | `COORDS_INVALID` / `COORDS_OUT_OF_BBOX` |
| `location.zone` | exists in zones | `ZONE_UNKNOWN` |
| `timestamp` | parseable ISO-8601 with offset; ≤ now + 5 min; ≥ now − `MAX_EVENT_AGE_HOURS` (unless `metadata.backfill`) | `TIMESTAMP_INVALID` / `TIMESTAMP_FUTURE` / `TIMESTAMP_TOO_OLD` |
| `metadata` | plain object, serialized ≤ 4 KB | `METADATA_INVALID` |
| source/type coherence | `weather→weather_alert`; `traffic→traffic_incident\|road_hazard`; `transit→transit_delay`; `synthetic→civic_complaint\|power_outage\|air_quality_alert\|road_hazard` | `SOURCE_TYPE_MISMATCH` |
| synthetic label | if produced by a synthetic-mode feed/generator, `metadata.synthetic === true` | `SYNTHETIC_UNLABELED` |

The validator canonicalizes `timestamp` to UTC `Z` (D4) and sets `timestamp_ms`.

## 6.6 IDs and idempotency
- Adapter/generator events: `id = "evt_" + sha1(source|type|zone|dedupeKey).slice(0,16)`.
  - `dedupeKey` = provider record id if present (`incident_id`, `route_id + minute-bucket`); else `zone + minute-bucket(timestamp)` + subtype.
- Persist with `set(doc)` (upsert), so re-ingesting the same raw record never duplicates.
- Client `POST` without `id` → `"evt_" + randomBytes(8).toString("hex")`.

---

# 7. Ingestion Pipeline

## 7.1 Feed runner contract
```js
// adapters/baseAdapter.js
export class BaseAdapter {
  source;            // 'weather' | 'traffic' | 'transit'
  mode;              // 'live' | 'synthetic'
  intervalSeconds;
  async fetchRaw(ctx) {}   // returns raw[]; throws on failure; must honor ctx.signal (timeout)
  normalize(raw) {}        // calls the matching normalizer
}
```

`runFeed(adapter)` MUST:
1. Record `t0`; create `AbortController` with `FEED_TIMEOUT_MS`.
2. `fetchRaw` (one retry after 1 s on network/5xx; none on 4xx).
3. For each raw record: normalize → scrub → validate; collect `accepted` and `rejected` (with codes).
4. Batch-write accepted events (chunks ≤ 400 per Firestore batch).
5. Update `feed_status/{source}` (success: `last_success`, `latency_ms`, reset `consecutive_failures`, add counters; failure: `error_count++`, `consecutive_failures++`, `last_error`).
6. **Never throw out of `runFeed`.** Catch everything, update status, log, return a result object.

```text
feed request
  ↓
success → normalize → scrub → validate → store → status=success
  ↓
failure → status update (error_count++, last_error) → continue other feeds
```

## 7.2 Scheduler
- One interval per feed, independent; run all with `Promise.allSettled` on startup and then per its own interval.
- Overlap guard: skip a tick if the previous run of the same feed is still in flight.
- Circuit breaker: after 3 consecutive failures, back off to `min(5 × interval, 10 min)` until a success.
- Graceful shutdown on `SIGTERM`/`SIGINT`: stop timers, await in-flight runs (max 5 s), exit.

## 7.3 Adapters
| Adapter | `synthetic` mode (P0) | `live` mode |
|---|---|---|
| weather | Emits nothing by default (no rain unless replay/preset). Records a successful feed tick so feed health stays `healthy`. | **P1:** Open-Meteo `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=rain,precipitation,wind_speed_10m,temperature_2m` per zone center. No API key. Map `current.rain` (mm) → `rain_mm_per_hr` (treat as mm/h; note assumption in README). |
| traffic | With `AUTO_BASELINE`: 0–2 low-severity incidents per zone per tick (§10.1). | Stub that throws `NOT_CONFIGURED`. Interface only; do not invent a provider. |
| transit | With `AUTO_BASELINE`: 0–1 minor delay per zone per tick. | Stub as above. |
| syntheticCivic (optional P1) | `civic_complaint` / `power_outage` at low rates, `source: synthetic`. | — |

A `live` adapter set to `NOT_CONFIGURED` must produce a `down` feed_status without crashing the process — this doubles as a natural failure-handling demo.

---

# 8. REST API

Base path `/api`. All responses are JSON. All timestamps UTC `Z`. Add `Cache-Control: no-store`.

## 8.1 Conventions
- Success list: `{ "data": [...], "meta": { "count": 12, "generated_at": "…Z", "last_event_at": "…Z" | null } }`
- Error: `{ "error": { "code": "BAD_REQUEST", "message": "…", "details": [...] } }` with status 400 / 403 / 404 / 422 / 429 / 500.
- Query params validated with zod; unknown params ignored; bad values → 400 with details.
- Events in responses contain exactly the CivicEvent fields (no `timestamp_ms`).

## 8.2 `GET /api/events`
| Param | Type | Default | Notes |
|---|---|---|---|
| `zone` | `Z01`… | — | Comma-separated allowed |
| `source` | enum | — | Comma-separated allowed |
| `type` | enum | — | Comma-separated allowed |
| `since` | ISO-8601 **or** relative `15m`, `2h`, `1d` | now − 60m | Inclusive |
| `severity` | number 0..1 | — | Minimum severity (`severity ≥ x`) |
| `limit` | int | 100 | Max 500 |

Sorted newest first. `meta` also echoes `filters` applied.

**Query strategy (MUST):** Firestore filters on equality fields plus `timestamp_ms >= since` ordered by `timestamp_ms desc`. Apply `severity` (and any filter combination lacking a composite index) **in memory**, over-fetching up to 1000 docs before slicing to `limit`. On Firestore `FAILED_PRECONDITION` (missing index) fall back to the in-memory path and log the index-creation link once at `warn`.

Deliver `firestore.indexes.json`:
```json
{
  "indexes": [
    {"collectionGroup":"events","queryScope":"COLLECTION","fields":[{"fieldPath":"location.zone","order":"ASCENDING"},{"fieldPath":"timestamp_ms","order":"DESCENDING"}]},
    {"collectionGroup":"events","queryScope":"COLLECTION","fields":[{"fieldPath":"type","order":"ASCENDING"},{"fieldPath":"timestamp_ms","order":"DESCENDING"}]},
    {"collectionGroup":"events","queryScope":"COLLECTION","fields":[{"fieldPath":"source","order":"ASCENDING"},{"fieldPath":"timestamp_ms","order":"DESCENDING"}]},
    {"collectionGroup":"events","queryScope":"COLLECTION","fields":[{"fieldPath":"location.zone","order":"ASCENDING"},{"fieldPath":"type","order":"ASCENDING"},{"fieldPath":"timestamp_ms","order":"DESCENDING"}]},
    {"collectionGroup":"events","queryScope":"COLLECTION","fields":[{"fieldPath":"location.zone","order":"ASCENDING"},{"fieldPath":"source","order":"ASCENDING"},{"fieldPath":"timestamp_ms","order":"DESCENDING"}]}
  ],
  "fieldOverrides": []
}
```

## 8.3 Other endpoints

| Endpoint | Behavior |
|---|---|
| `GET /api/zones` | All zones. `meta.count`. |
| `GET /api/feed-status` | All four feeds (create a `never_run`-style `down`/`healthy` placeholder for any feed with no doc). Health recomputed at read time (§5.3). `meta` includes `overall`: `healthy` if all healthy, `down` if all down, else `degraded`. |
| `GET /api/anomalies` `GET /api/correlations` `GET /api/alerts` | Params: `zone`, `since`, `limit` (default 50, max 200). Return `data: []` if collection is empty. Never error on empty. |
| `GET /api/pulse` | See §8.4. |
| `GET /healthz` | Liveness only (no Firestore call): `{ "ok": true, "uptime_s": n }`. Additive. |

## 8.4 `GET /api/pulse` (interim; replaceable)
Implemented in `services/pulseService.js` exporting `computePulse({zones, recentEvents, feedStatus, now})`. The analytics owner may replace this function; the route must not change.

```json
{
  "data": {
    "last_updated": "…Z",
    "feed_health": {"overall": "healthy", "delayed": []},
    "zones": [
      {"zone_id":"Z04","name":"Zone 4","status":"watch","event_count_60m":11,
       "max_severity_60m":0.84,"latest_event_at":"…Z","types_60m":{"weather_alert":1,"traffic_incident":8,"transit_delay":2}}
    ]
  },
  "meta": {"generated_at":"…Z","interim": true}
}
```
Interim `status` rule per zone (60-minute window): `normal` if `max_severity < 0.5`; `watch` if `0.5 ≤ max < 0.75`; `critical` if `max ≥ 0.75` **and** ≥ 2 distinct event types present; else `watch`. Always include `interim: true` so consumers know it's not the analytics module's verdict. No causal language anywhere.

## 8.5 `POST /api/events`  (DEMO_MODE only)
Accepts one of three body shapes:
1. Single CivicEvent (must include everything except `id`, which is optional).
2. `{ "events": [ …up to 100 CivicEvents ] }`
3. **Preset:** `{ "preset": "heavy_rain" | "traffic_spike" | "transit_delay" | "normal_baseline", "zone": "Z04", "options": { … } }` → runs the matching generator through the full pipeline.

Responses:
- `201` `{ "data": { "accepted": [CivicEvent…], "rejected": [{"index":0,"errors":[{code,field,message}]}] } }` when ≥ 1 accepted.
- `422` same shape when all rejected. `403` when `DEMO_MODE=false`.
- Manually posted events get `metadata.manual: true`. If `source` is a synthetic-mode domain source, enforce D3 labeling by adding `metadata.synthetic = true` when preset-generated; for hand-posted raw events the caller decides, and the validator doesn't force it.

---

# 9. Replay / Demo Simulator

## 9.1 Endpoints (DEMO_MODE only)
`POST /api/replay/start`
```json
{ "scenario": "rain_zone4_chain", "zone": "Z04", "speed": 1, "clear_previous": true, "seed_baseline": true }
```
- All optional; defaults shown. `speed` ∈ {1, 2, 5, 10} divides all offsets. Returns `202 { "data": { "run_id": "…", "scenario": "…", "zone": "Z04", "started_at": "…Z", "ends_at": "…Z" } }`.
- If a run is active → `409 REPLAY_ALREADY_RUNNING` (with the active `run_id`).
- `clear_previous`: delete earlier events with `metadata.synthetic == true && metadata.scenario_id` set (batched ≤ 400/batch). Never delete non-synthetic events.
- `seed_baseline`: if the zone has < 10 events in the last 60 min, backfill baseline (§10.1) first.

`POST /api/replay/stop` → cancels pending timers, returns `200 { "data": { "stopped": true, "run_id": "…" | null } }`. Idempotent (stopping with no run returns `stopped: false`).

**P1:** `GET /api/replay/status`, and `"fail_feeds": ["transit"], "fail_duration_s": 60` on start to force a feed failure and demonstrate non-fatal degradation.

## 9.2 Scenario `rain_zone4_chain` (offsets at speed 1; emitted with **real current timestamps**, not scripted ones, so live windows work)

| Offset | Action | Generator | Expected event types |
|---|---|---|---|
| +0 s | Heavy rain begins | `generateHeavyRain(zone)` | 1× `weather_alert` (sev ≈ 0.82) |
| +20 s | Traffic wave 1 | `generateTrafficSpike(zone, {count:3, severityFrom:0.45, severityTo:0.6})` | `traffic_incident` (+1 `road_hazard`) |
| +40 s | Traffic wave 2 | `generateTrafficSpike(zone, {count:5, severityFrom:0.6, severityTo:0.9})` | `traffic_incident` (+1 `road_hazard`) |
| +60 s | Transit delays | `generateTransitDelay(zone, {routes:3})` | 3× `transit_delay` |
| +90 s | Rain intensifies | `generateHeavyRain(zone, {rainMm:47})` | 1× `weather_alert` (sev 0.94) |
| +120 s | Run ends | — | mark run complete |

Every emitted event carries `metadata.synthetic: true`, `metadata.scenario_id`, and `metadata.run_id`. Each event goes through the normal pipeline (§7.1 steps 3–4) and updates the `synthetic`-mode feed's status counters. Failure in one step is logged and the scenario continues.

Run state is in-memory (single active run). No new Firestore collections.

---

# 10. Synthetic Generators

All generators are pure with an injectable `now` and seedable RNG (`opts.seed`) so tests are deterministic. They return **raw synthetic payloads** (§6.2) — they do not write to Firestore. Locations are jittered within `radius_km` (default 1.5) of the zone center.

```js
generateNormalBaseline(zoneId, {now, seed})   → RawSynthetic[]
generateHeavyRain(zoneId, {now, seed, rainMm = 41})
generateTrafficSpike(zoneId, {now, seed, count = 8, severityFrom = 0.45, severityTo = 0.9})
generateTransitDelay(zoneId, {now, seed, routes = 3})
```

## 10.1 Baseline (important for downstream anomaly detection)
The anomaly module compares current counts to a per-zone baseline (`window_minutes: 60`, `threshold: 2.0`). Without history it has nothing to compare against, so:
- `generateNormalBaseline`: per call, traffic 0–2 incidents (severity 0.10–0.40, delay 3–20 min) and transit 0–1 delay (severity 0.10–0.30, delay 5–9 min); **no** weather.
- Steady-state target: ≈ 3 traffic incidents/hour/zone and ≈ 2 transit delays/hour/zone.
- `scripts/seed-baseline.js` (`npm run seed:baseline -- --minutes 120`): backfill 5-minute buckets for **all zones** with timestamps in the past (`metadata.backfill: true`, `metadata.synthetic: true`), so a fresh database has usable baselines immediately.

## 10.2 Event shapes
- **Rain:** `type: weather_alert`, `severity = clamp(rainMm/50)`, `confidence 0.94`, `metadata {subtype:"heavy_rain", rain_mm, wind_kph: 30–45}`.
- **Traffic spike:** `count` events spread over the call (timestamps jittered ±10 s), severity ramp linear from→to, categories cycled from `flooding_congestion`, `accident`, `stalled_vehicle`, `congestion`; **one in five** is `road_hazard` with `category: "waterlogging"`. `metadata.delay_minutes = round(severity × 60)`.
- **Transit delay:** `routes` events, `delay_minutes` 12–28 (severity = delay/30, capped 1), `metadata {route_id:"R-<n>", mode:"bus", delay_minutes}`.

---

# 11. Observability & Errors
- `pino` structured logs; one line per feed run: `{feed, mode, fetched, accepted, rejected, latency_ms, health}`.
- Central Express error handler returns the D6 envelope; never leaks stack traces or credentials outside `NODE_ENV=development`.
- Log at `warn` on rejections with codes (sampled: max 5 lines/min/feed).
- Every request logs method, path, status, duration.

---

# 12. Build Order (checkpoints — stop and verify each)

1. **Scaffold** — package.json, ESM, env validation, logger, app factory, `/healthz`, `.env.example`, `.gitignore`. ✅ `curl /healthz`.
2. **Firestore + zones** — `lib/firebase.js` (emulator-aware), zone seed, `zones` repo, `GET /api/zones`. ✅ 6 zones returned.
3. **Schema + validator + normalizers + PII scrubber + ID helper** with unit tests. ✅ Test suite green.
4. **Events repository + `GET /api/events`** with filters, `since` parsing, in-memory fallback, index file. ✅ Filters verified.
5. **Generators + pipeline + `POST /api/events`** (incl. presets). ✅ Preset `heavy_rain` on `Z04` stores a valid event.
6. **Feed runner + adapters + scheduler + feed_status + health computation + `GET /api/feed-status`**. ✅ Four feeds visible; killing one adapter doesn't affect others.
7. **Replay service + endpoints + baseline seeding**. ✅ Full chain appears in ~2 min.
8. **Read endpoints for anomalies/correlations/alerts + interim `/api/pulse`**. ✅ Empty collections return `data: []`.
9. **Rules, hardening, README**, then P1 items if time allows.

---

# 13. Testing Requirements

Use Vitest; integration tests run against the Firestore emulator (or an in-memory repository fake behind the same interface — state which in the README).

**Unit**
- Each normalizer: below/above thresholds, severity clamping, type mapping, rounding.
- Validator: one test per error code in §6.5; canonical UTC conversion of `+05:30` input (`12:30+05:30` → `07:00:00.000Z`).
- PII scrubber: strips keys, redacts emails/phones, keeps allow-listed keys.
- Zone resolution: explicit zone, nearest zone, unknown, out-of-radius.
- Feed health: table-driven, every row in §5.3.
- ID determinism: same raw → same id; different minute bucket → different id.
- Generators: seeded output stable; all outputs pass the validator.

**Integration**
- `GET /api/events` with each filter and combined filters; `limit` cap at 500; bad params → 400.
- `POST /api/events`: single, batch with mixed valid/invalid (201 + `rejected`), all invalid (422), `DEMO_MODE=false` (403), preset.
- **Failure isolation:** with weather adapter forced to throw, traffic and transit still ingest and `feed_status/weather.health` becomes `degraded` then `down` after 3 failures; `/api/events` and `/api/zones` still return 200.
- Replay: start → events of each type appear for `Z04`; second start → 409; stop → no further emissions.
- Idempotency: ingesting the same raw batch twice leaves the event count unchanged.

---

# 14. Acceptance Criteria

- [ ] Firestore collections `events`, `zones`, `anomalies`, `correlations`, `alerts`, `feed_status` exist/work; six zones seeded.
- [ ] Three synthetic-mode feeds (weather, traffic, transit) produce valid events through the full pipeline.
- [ ] Every stored event conforms to CivicEvent (D1–D4) and passes the validator; no `timestamp_ms` in API responses.
- [ ] `GET /api/events` filters by zone, source, type, since, severity, limit; default window 60 min; newest first.
- [ ] Synthetic events are labeled `metadata.synthetic: true`.
- [ ] `GET /api/feed-status` shows health per feed with `last_success`; health is recomputed at read time.
- [ ] One feed failure is non-fatal (proved by test); process never crashes on adapter errors.
- [ ] `POST /api/replay/start` produces the chain: rain (Z04) → traffic incidents rising → transit delays, within ~2 minutes at speed 1.
- [ ] `GET /api/pulse` returns per-zone interim status with `interim: true` and `last_updated`.
- [ ] Empty `anomalies`/`correlations`/`alerts` return `data: []` with 200.
- [ ] No secrets in repo; `.env.example` present; Firestore rules and indexes files delivered.
- [ ] README documents setup, env vars, npm scripts, and the curl checks below.

## Verification commands (include in README)
```bash
curl -s localhost:8080/healthz
curl -s localhost:8080/api/zones | jq '.meta.count'                       # 6
curl -s -X POST localhost:8080/api/replay/start -H 'content-type: application/json' \
     -d '{"zone":"Z04","speed":5}'                                          # 202
sleep 30
curl -s "localhost:8080/api/events?zone=Z04&since=15m" | jq '[.data[].type] | group_by(.) | map({(.[0]): length}) | add'
curl -s "localhost:8080/api/events?type=weather_alert&severity=0.8" | jq '.meta.count'
curl -s localhost:8080/api/feed-status | jq '.data[] | {source, health}'
curl -s -X POST localhost:8080/api/replay/stop
```

---

# 15. Agent Operating Rules

1. **Do not change** shared schemas, collection names, endpoint paths, or the enums in §0 beyond what §1 specifies.
2. Preserve one-way dependencies: routes → services → repositories → Firestore. Routes never touch Firestore directly.
3. Every external call has a timeout; every feed run is wrapped so it cannot throw.
4. Don't invent a live traffic or transit provider. Leave clean stubs behind the adapter interface.
5. Secrets only via environment variables; never log them.
6. If a requirement seems contradictory, follow §1 (Contract Deltas), then this document's more specific section over the general one, and note the assumption in the README under "Assumptions".
7. Work in the §12 order. After each checkpoint, run the tests and state what passed before moving on.
8. Final deliverable: working code, tests passing, README, `firestore.rules`, `firestore.indexes.json`, `.env.example`, and a short "Known limitations" section.

---

# 16. AI Agent Prompt (paste this to the agent along with this file)

> You are building the **CityPulse data module** as specified in the attached PRD (`02_data_system_prd_agent_ready.md`). Build a Node 20 + Express (ESM, plain JS) + Firebase Firestore backend that implements: ingestion adapters, synthetic generators, CivicEvent normalization/validation with PII scrubbing, Firestore repositories, feed health computation, the documented REST APIs, and the replay simulator that produces the full rain → traffic → transit disruption chain for Zone Z04.
>
> Follow §1 (Contract Deltas) exactly: rain is `weather_alert` with `metadata.subtype = "heavy_rain"`, sources are `weather|traffic|transit|synthetic`, synthetic data is labeled `metadata.synthetic: true`, timestamps are stored and returned as canonical UTC, list endpoints use the `{data, meta}` envelope. Preserve all collection names and endpoint paths. Use environment variables for all secrets and never commit credentials. One failed feed must never stop the pipeline or break any API.
>
> Work through the build order in §12, running tests at each checkpoint. Do not implement anomaly detection, correlation, alerting, Groq, or any frontend. When finished, provide the code, tests, README with the verification commands from §14, `firestore.rules`, `firestore.indexes.json`, and `.env.example`.
