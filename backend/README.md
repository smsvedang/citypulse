# CityPulse Data Module

This module implements the CityPulse data, normalization, validation, and feed-health layer described in the PRD. It exposes the shared civic event contract, zone seed data, demo replay hooks, and health endpoints expected by the wider dashboard.

## Stack

- Node.js 20+
- Express + Helmet + CORS + rate limiting
- Firebase Admin with a local in-memory Firestore fallback
- Zod validation and Vitest + Supertest testing

## Environment setup guide

### 1) Install dependencies

From the server folder:

```bash
cd server
npm install
```

### 2) Create your environment file

Copy the sample config:

```bash
cp .env.example .env
```

Then edit `.env` and fill in the values you need. The project will still run without valid Firebase credentials by using the in-memory Firestore fallback, but the local environment file should still be populated as shown below.

### 3) Required environment variables

The default values are already set in `.env.example`:

```env
PORT=8080
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_B64=
FIRESTORE_EMULATOR_HOST=
DEMO_MODE=true
FEED_MODE_WEATHER=synthetic
FEED_MODE_TRAFFIC=synthetic
FEED_MODE_TRANSIT=synthetic
FEED_INTERVAL_WEATHER_S=300
FEED_INTERVAL_TRAFFIC_S=60
FEED_INTERVAL_TRANSIT_S=60
FEED_TIMEOUT_MS=8000
AUTO_BASELINE=true
CITY_BBOX=26.70,75.55,27.15,76.05
ZONE_MAX_RADIUS_KM=8
MAX_EVENT_AGE_HOURS=24
LOG_LEVEL=info
```

### 4) Choose your Firebase mode

#### Option A: Local development without Firebase

Leave these blank:

```env
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_B64=
FIRESTORE_EMULATOR_HOST=
```

In this mode, the app uses the built-in in-memory Firestore stub for local testing and development. This is the easiest option for running the project on a clean machine.

#### Option B: Firebase emulator

Set:

```env
FIRESTORE_EMULATOR_HOST=localhost:8081
FIREBASE_PROJECT_ID=demo-citypulse
```

If you are using the emulator, you do not need a service account JSON. Start the emulator separately before running the app.

#### Option C: Real Firebase project

Use this when you want the app to write to a real Firestore database.

1. Open the Firebase Console.
2. Select your project.
3. Go to Project settings.
4. Copy the Project ID from the General tab.
5. Go to Service accounts.
6. Click "Generate new private key".
7. Download the JSON file and convert it to base64 for `FIREBASE_SERVICE_ACCOUNT_B64`.

Example:

```bash
# Linux / macOS
base64 -i service-account.json | tr -d '\n'

# Windows PowerShell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("service-account.json"))
```

Then set:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_B64=base64-encoded-service-account-json
```

You may also provide `GOOGLE_APPLICATION_CREDENTIALS` if your environment already has a service-account file configured.

> If you do not want to use Firebase at all, leave both `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_B64` blank and the app will use its in-memory local fallback.

### 5) Allowed origins for CORS

Update this value if the frontend runs on a different port:

```env
CORS_ORIGINS=http://localhost:5173
```

For multiple origins, use a comma-separated list:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

### 6) Demo behavior

The app is configured to run in demo mode by default:

```env
DEMO_MODE=true
```

This enables:

- `POST /api/events` presets
- replay and synthetic demo flows
- feed simulations for weather, traffic, and transit demo data

Set it to `false` if you want to disable those routes.

### 7) Feed settings

The feed modes and polling intervals can be tuned per data source:

```env
FEED_MODE_WEATHER=synthetic
FEED_MODE_TRAFFIC=synthetic
FEED_MODE_TRANSIT=synthetic

FEED_INTERVAL_WEATHER_S=300
FEED_INTERVAL_TRAFFIC_S=60
FEED_INTERVAL_TRANSIT_S=60
```

Use `live` only when you have a live provider implementation configured. The default PRD setup expects synthetic-mode demo feeds.

### 8) Validation and geography settings

These values are used for event validation and zone resolution:

```env
CITY_BBOX=26.70,75.55,27.15,76.05
ZONE_MAX_RADIUS_KM=8
MAX_EVENT_AGE_HOURS=24
```

These should remain aligned with the Jaipur demo geography unless the project is intentionally changed.

### 9) Run the app

Once `.env` is ready:

```bash
npm test
npm start
```

Or run in watch mode during development:

```bash
npm run dev
```

### 10) Validate the server is working

After the app starts, check:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/zones
curl http://localhost:8080/api/feed-status
```

Expected behavior:

- `/healthz` returns `ok: true`
- `/api/zones` returns the six seeded zone entries
- `/api/feed-status` returns feed health records, even if some are placeholders before the first successful tick

## Demo mode

`DEMO_MODE` is enabled by default. This allows the demo presets and replay endpoints to work without a secret token. Feature gates are enforced at the route level.

## Core behavior

- Validates civic events against the PRD schema and city bounding box
- Normalizes weather, traffic, and transit inputs into the common civic event format
- Scrubs PII before validation
- Seeds the six Jaipur demo zones into `zones/`
- Keeps feed status in `feed_status/` with health recomputed at read time
- Exposes `/api/events`, `/api/zones`, `/api/pulse`, `/api/feed-status`, and replay endpoints

## Seed commands

```bash
npm run seed:zones
npm run seed:baseline
```

## API smoke checks

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/zones
curl http://localhost:8080/api/feed-status
```

## Notes

- The module uses an in-memory Firestore fallback when no emulator or project credentials are present.
- The rules and indexes under the project root are aligned with the shared PRD contract.
- Demo data is labeled clearly and synthetic events continue to pass through the same validation pipeline as live traffic.
