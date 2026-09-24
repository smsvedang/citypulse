# CityPulse Integration Audit (Phase 1)

## 1. Member 1 — Live Map, Zone Views, Feed Banner

### Folder Tree
```
Member 1/
├── app/
│   ├── globals.css      (15 KB — full CSS design system)
│   ├── layout.jsx       (Next.js root layout)
│   └── page.jsx         (14 KB — all components in one file)
├── package.json         (Next.js 14.2.15 / React 18.3.1)
├── next.config.mjs
└── jsconfig.json
```

### Assessment
- **Full standalone Next.js app** with its own `index.html` equivalent (Next.js serves via layout).
- Single-page design: all UI lives in `page.jsx` — MapPanel, DetailPanel, StatCards, feed activity stream, correlation panel, alerts panel.
- **No API calls, no Firebase, no Firestore listeners.** All data is hardcoded inline (zones, feedEvents, zone details, signals).
- **No env vars** used.
- Port: Next.js default (`3000`).
- Uses `'use client'` directive; all components are client-rendered.

### What it provides
| Feature | Location |
|---|---|
| Stylized CSS map with 6 zones | `page.jsx` MapPanel |
| Zone detail panel with AI brief stub | `page.jsx` DetailPanel |
| Stat cards (city pulse, active signals, most affected, data health) | `page.jsx` StatCards |
| Activity stream with source filters | `page.jsx` inline |
| Correlation panel (hardcoded 2 correlations) | `page.jsx` inline |
| Alerts panel with acknowledge | `page.jsx` inline |
| Top bar with DEMO badge, live indicator, simulate button | `page.jsx` inline |
| Global CSS design system | `globals.css` |

### Schema/Enum deviations from Master PRD
- No CivicEvent model used; data is ad-hoc.
- Zone IDs are `1..6` (numbers), not `Z01..Z06`.
- No `source` enum used; uses `'rain'`, `'traffic'`, `'transit'` as CSS color classes.
- Zone objects have `place`, `residents`, `brief`, `signals` — custom shape, not matching PRD zones.

---

## 2. Member 2 — Data System (Ingestion, APIs, Repositories, Replay)

### Folder Tree
```
Member 2/
├── 02_data_system_prd_agent_ready.md     (PRD)
└── server/
    ├── src/
    │   ├── index.js / app.js             (Express factory, boot)
    │   ├── config/ (env.js, zones.seed.js)
    │   ├── lib/ (firebase, logger, time, geo, errors, ids, pii)
    │   ├── schemas/ (civicEvent.js — zod)
    │   ├── normalizers/ (weather, traffic, transit, synthetic, index)
    │   ├── validators/ (eventValidator.js)
    │   ├── adapters/ (baseAdapter, weather, traffic, transit)
    │   ├── generators/ (heavyRain, trafficSpike, transitDelay, normalBaseline, index)
    │   ├── ingestion/ (pipeline, feedRunner, scheduler)
    │   ├── repositories/ (events, zones, feedStatus, anomalies, correlations, alerts)
    │   ├── services/ (feedHealth, pulseService, replayService)
    │   ├── routes/ (events, zones, pulse, anomalies, correlations, alerts, feedStatus, replay, health)
    │   └── middleware/ (errorHandler, rateLimit, demoGuard, validateQuery, notFound)
    ├── scripts/ (seed-zones, seed-baseline)
    ├── test/ (dataPipeline, feedHealth, health)
    ├── firestore.rules  firestore.indexes.json
    ├── .env.example
    └── README.md
```

### Assessment
- **Full standalone Express backend** — the most complete module.
- **ESM**, plain JavaScript with JSDoc, Node >= 20.
- All 9 routes from PRD are implemented.
- Zod-based schema validation, PII scrubber, deterministic IDs.
- Replay/demo simulator with `rain_zone4_chain` scenario.
- In-memory Firestore fallback (MemoryStore class).
- Port: `8080` (from env).
- Uses `{data, meta}` envelope per PRD D6.
- Timestamps canonicalized to UTC `Z`.

### Env vars used
`PORT`, `NODE_ENV`, `CORS_ORIGINS`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_B64`, `FIRESTORE_EMULATOR_HOST`, `DEMO_MODE`, `FEED_MODE_*`, `FEED_INTERVAL_*`, `FEED_TIMEOUT_MS`, `AUTO_BASELINE`, `CITY_BBOX`, `ZONE_MAX_RADIUS_KM`, `MAX_EVENT_AGE_HOURS`, `LOG_LEVEL`.

### Firebase init
- In-memory MemoryStore by default. Does NOT actually initialize firebase-admin.

### Schema definitions
- `schemas/civicEvent.js`: zod schema with enums `SOURCES`, `EVENT_TYPES`, `FEED_SOURCES`. Matches PRD.

---

## 3. Member 3 — Intelligence Layer (UI only)

### Folder Tree
```
Member 3/
├── app/
│   ├── api/
│   │   ├── anomalies/route.js    (stub: hardcoded array)
│   │   ├── correlations/route.js (stub: hardcoded array)
│   │   ├── pulse/route.js        (stub: hardcoded object)
│   │   └── replay/ (start/stop stubs)
│   ├── globals.css               (24 bytes — near-empty)
│   ├── layout.js
│   └── page.js                   (15 KB — full intelligence dashboard UI)
├── styles.css                    (24 KB — full CSS design system)
└── package.json                  (Next.js 14.2.30 / React 18.3.1)
```

### Assessment
- **Full standalone Next.js app** — UI only, no real logic.
- `page.js` contains intelligence dashboard: metric cards, CSS map, AI situation brief, event activity chart, feed health, events table, replay button.
- Next.js API routes return **hardcoded demo data** — no actual computation.
- **No Firebase, no Firestore, no env vars, no actual intelligence logic.**
- Port: Next.js default (`3000`).

### Schema deviations
- Anomaly stub has extra fields: `is_triggered`, `current_count`, `recent_average`.
- Correlation stub has `spatial_distance_km`, `detected_at`, `confidence`.
- Pulse stub not in `{data, meta}` envelope.
- Uses `'civic'` as source (PRD: `'synthetic'`).

---

## 4. Member 4 — Analytics, Alerts, Demo Controls, Simulator

### Folder Tree
```
MEMBER 4/MEMBER 4/
├── .env / .env.example
├── package.json          (root: npm workspaces [server, client])
├── client/               (Vite + React + Tailwind + TypeScript)
│   ├── src/
│   │   ├── App.tsx / main.tsx
│   │   ├── api/client.ts (API wrapper)
│   │   └── components/ (AnalyticsSection, HealthPanel, ReplayControls, SimulatorButton, ErrorBoundary)
│   ├── vite.config.ts / tailwind.config.js / postcss.config.js
│   └── package.json
├── server/               (Express + TypeScript)
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/citypulse.config.ts
│   │   ├── routes/api.ts
│   │   ├── store/firestore.ts (dual: Firestore + memory)
│   │   ├── types/civic.ts
│   │   ├── intelligence/ (anomalyEngine, correlationEngine, evidence, groqBrief)
│   │   └── services/ (alertEngine, alertTemplates, analyticsService, eventPipeline, healthService, replayController, simulator)
│   └── package.json
└── README.md
```

### Assessment
- **Full standalone monorepo** — most feature-complete module.
- TypeScript throughout. Real anomaly/correlation engines, Groq integration, alert system, simulator, analytics.
- Server port: `4000` (not `8080`). Client port: `5173`.
- Has own Firebase Admin init with memory fallback.
- Uses `uuid` for IDs (not deterministic sha1).

### Deviations from Master PRD
| Issue | Detail |
|---|---|
| Server port | `4000`, not `8080` |
| Zones | Seeds 5 (Z01-Z05), PRD requires 6 |
| Timestamps | `+05:30`, not UTC `Z` |
| IDs | `uuid`-based, not deterministic sha1 |
| API envelope | Raw objects, not `{data, meta}` |
| Feed health | `'failed'` instead of `'down'` |
| No `helmet` or rate limiting | Security middleware missing |

---

## Conflict List and Proposed Resolutions

| # | Conflict | Members | Resolution |
|---|---|---|---|
| C1 | **Duplicate full apps**: 3 standalone frontends | 1, 3, 4 | ONE Vite + React app. Use Member 4's Vite/Tailwind shell; port Member 1 and 3 UI as feature folders. Discard Next.js scaffolding. |
| C2 | **Duplicate backends**: Express/JS + Express/TS | 2, 4 | Use Member 2 as canonical backend (more PRD-compliant). Move Member 4's intelligence + alert into `intelligence/` module. |
| C3 | **Port clash**: `8080` vs `4000` | 2, 4 | Standardize to `8080` per PRD. |
| C4 | **Duplicate Firebase init** | 2, 4 | ONE init in `backend/src/lib/firebase.js`. |
| C5 | **TS vs JS**: Backend JS, intelligence TS | 2, 4 | Keep intelligence as TS with `tsx` dev runner. |
| C6 | **Timestamp format**: UTC `Z` vs `+05:30` | 2, 4 | Fix to UTC `Z` per PRD D4. |
| C7 | **API envelope**: `{data, meta}` vs raw | 2, 4 | Fix to PRD envelope. |
| C8 | **Feed health enum**: `down` vs `failed` | 2, 4 | Fix to PRD: `healthy\|degraded\|delayed\|down`. |
| C9 | **Zone count**: 6 vs 5 | 2, 4 | Use 6 zones per PRD. |
| C10 | **Zone IDs**: numeric vs `Z0n` | 1 | Fix to `Z01..Z06`. |
| C11 | **Duplicate enums/schemas** | 2, 4 | Create `shared/` with canonical zod schemas. |
| C12 | **CSS systems**: two 15-24 KB CSS files | 1, 3 | Merge into unified design system. |
| C13 | **GROQ_API_KEY** in `.env` (blank) | 4 | Root `.env`, server-only. |
| C14 | **Firebase init never real** | 2, 4 | Unify: real -> emulator -> memory fallback. |
| C15 | **Member 3 API stubs** are Next.js route handlers | 3 | Discard. Real logic from Member 4 + Member 2. |
| C16 | **Member 3 has no intelligence logic** | 3 | UI only -> `frontend/src/features/intelligence/`. Logic from Member 4. |

## Decisions Needed

1. **TypeScript vs JavaScript for intelligence module**: Member 4's intelligence is TS. Backend (Member 2) is JS. Recommendation: Keep TS for intelligence, use `tsx` dev runner.

2. **CSS design system**: Members 1 and 3 have 40 KB+ CSS. Will merge best parts with Tailwind. Proceed?

---

*No secrets were found hardcoded. `.env` in Member 4 contains blank values only.*
*Pre-integration backup tagged as `pre-integration`.*
