# CityPulse — Member 4 integration slice

Standalone **Express + Vite + Firestore** project for PRD-04 (analytics, alerts, replay, health, demo simulator).

## Run

```bash
cd C:\Users\Naveen\Desktop\citypulse
copy .env.example .env
npm install
npm run dev
```

- API: http://localhost:4000/api/health  
- UI: http://localhost:5173  

Without Firebase credentials, the server uses an **in-memory store** (same collection names and API contract).

## Member 4 ownership

- Writes: `alerts/`, `feed_status/` (plus dev feed simulate endpoints)
- Reads: `events/`, `anomalies/`, `correlations/`, `zones/`

## Upstream note

Minimal ingestion + intelligence modules live under `server/src/ingest` and `server/src/intelligence` so the demo pipeline runs until Member 2/3 merge into the team repo. Replace those modules when the shared repo is available—Member 4 services hook via `ingestEvent()` only.

## Integration test

With API running:

```bash
npm run test:integration -w server
```
