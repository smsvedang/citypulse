# CityPulse Environment Setup Guide

This guide explains where each environment variable comes from, what it controls, and whether it is required.

## 1. Create the files

From the repository root:

```powershell
Copy-Item .env.example .env
```

The root `.env` is read by the backend and intelligence worker. Vite reads frontend variables only when they use the `VITE_` prefix.

Never commit `.env`, Firebase service-account JSON, or API keys.

## 2. Server variables

### `PORT`

- Value: local HTTP port for Express.
- Get it from: nowhere; choose an unused port.
- Recommended: `8080`.

```env
PORT=8080
```

### `NODE_ENV`

- Value: `development`, `test`, or `production`.
- Get it from: nowhere; set it according to the environment.

```env
NODE_ENV=development
```

### `CORS_ORIGINS`

- Value: frontend URL allowed to call the API.
- Get it from: your frontend URL.
- Local: `http://localhost:5173`.
- Vercel: replace it with your deployed frontend domain.
- Multiple values: comma-separated.

```env
CORS_ORIGINS=http://localhost:5173,https://your-app.vercel.app
```

### `LOG_LEVEL`

- Value: logging detail.
- Allowed practical values: `debug`, `info`, `warn`, `error`.
- Recommended: `info`.

```env
LOG_LEVEL=info
```

## 3. Firebase and Firestore variables

### `FIREBASE_PROJECT_ID`

- Get it from: Firebase Console -> Project settings -> General -> Project ID.
- Example: `citypulse-demo`.

```env
FIREBASE_PROJECT_ID=your-project-id
```

### `FIREBASE_SERVICE_ACCOUNT_B64`

This is a server-only secret. Do not put it in any `VITE_*` variable and do not expose it to the browser.

1. Open Firebase Console.
2. Select the project.
3. Open Project settings -> Service accounts.
4. Click **Generate new private key**.
5. Download the JSON file temporarily.
6. Convert it to one-line Base64 in PowerShell:

Run this as one single line in PowerShell. Do not copy the `PS>` or `>>` prompt characters:

```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("C:\path\to\service-account.json"))
```

If PowerShell is currently showing a `>>` prompt, press `Ctrl+C` first to cancel the incomplete command, then paste the one-line command.

7. Put the resulting one-line value in `.env`:

```env
FIREBASE_SERVICE_ACCOUNT_B64=your-long-base64-value
```

Delete the downloaded JSON after configuring it, or keep it outside the repository. Never commit it.

### `FIRESTORE_EMULATOR_HOST`

- Get it from: Firebase Emulator Suite configuration.
- Local example: `127.0.0.1:8081`.
- Leave blank when using the normal in-memory fallback.

```env
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081
```

### Current Firebase limitation

The current backend contains an in-memory Firestore-compatible store for local/demo use. The backend Firebase module detects Firebase settings but does not yet create a Firebase Admin Firestore client. Therefore, adding Firebase credentials alone does **not** currently switch persistence to Cloud Firestore. Keep the values blank for the currently supported local/demo mode, or implement the Admin SDK initialization before using production Firestore.

## 4. Demo and feed variables

### `DEMO_MODE`

- `true`: enables replay, synthetic presets, and demo event creation.
- `false`: disables demo-only event routes.

```env
DEMO_MODE=true
```

### `FEED_MODE_WEATHER`, `FEED_MODE_TRAFFIC`, `FEED_MODE_TRANSIT`

- Allowed values: `synthetic` or `live`.
- `synthetic`: generated demo events.
- `live`: reserved for a connected live provider adapter.

For a real-data deployment, use:

```env
FEED_MODE_WEATHER=live
FEED_MODE_TRAFFIC=live
FEED_MODE_TRANSIT=live
```

Weather live mode reads current precipitation and wind from Open-Meteo. Traffic and transit live modes require real provider adapters and credentials; until those are configured, their feed status is `down` and no fake events are created.

### `FEED_INTERVAL_WEATHER_S`

- Weather feed interval in seconds.
- Default: `300` (5 minutes).

### `FEED_INTERVAL_TRAFFIC_S`

- Traffic feed interval in seconds.
- Default: `60` (1 minute).

### `FEED_INTERVAL_TRANSIT_S`

- Transit feed interval in seconds.
- Default: `60` (1 minute).

These values are tuning settings, not API keys.

### `FEED_TIMEOUT_MS`

- Maximum time allowed for a live feed request.
- Default: `8000` milliseconds.

### `AUTO_BASELINE`

- `true`: enables baseline behavior where supported.
- `false`: disables it.

## 5. Geography and validation variables

### `CITY_BBOX`

Bounding box in this order:

```text
minLat,minLng,maxLat,maxLng
```

Default Jaipur-area value:

```env
CITY_BBOX=26.70,75.55,27.15,76.05
```

### `ZONE_MAX_RADIUS_KM`

Maximum distance used when assigning an event to a zone. Default: `8`.

### `MAX_EVENT_AGE_HOURS`

Maximum age accepted for normal events. Default: `24` hours.

## 6. Groq AI variables

### `GROQ_API_KEY`

This is a secret used only by the intelligence service.

1. Open `https://console.groq.com/`.
2. Create or sign in to your Groq account.
3. Open API keys.
4. Create a new key and copy it once.
5. Put it only in the root `.env`:

```env
GROQ_API_KEY=gsk_your_key_here
```

Never add this key to frontend code, `VITE_*` variables, Git, screenshots, or browser settings.

If it is blank, the application uses the deterministic fallback brief instead of Groq.

### `GROQ_MODEL`

Optional model name used by the intelligence service. If omitted, the code uses its default model.

```env
GROQ_MODEL=llama-3.3-70b-versatile
```

## 7. Frontend variables

### `VITE_API_BASE_URL`

Frontend API base URL.

- Local with Vite proxy: leave blank or use `/api` through the configured proxy.
- Separate local backend: `http://localhost:8080`.
- Vercel single deployment: leave blank so requests use the same domain.

```env
VITE_API_BASE_URL=
```

### `VITE_API_URL`

Used by the secondary frontend API client. Normally leave it blank so it uses `/api`.

```env
VITE_API_URL=
```

### `VITE_USE_FIXTURES`

- `false`: use backend API.
- `true`: force bundled sample data.

For normal development and production:

```env
VITE_USE_FIXTURES=false
```

### Firebase browser variables

These are public Firebase web-app configuration values, not service-account secrets:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`

Get them from:

1. Firebase Console -> Project settings.
2. General tab.
3. Your apps -> Web app.
4. Open the Firebase SDK setup/config snippet.
5. Copy the matching values into the frontend environment file.

Example:

```env
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

These values can be visible in browser builds. Security must come from Firebase Authentication and Firestore Security Rules, not from hiding the web API key.

### `VITE_USE_EMULATOR`

- `true`: frontend attempts to connect to the local Firestore emulator.
- `false`: normal browser Firebase configuration.

```env
VITE_USE_EMULATOR=false
```

## 8. Scripts variables

### `API_BASE_URL`

Used by command-line scripts such as smoke and demo.

```env
API_BASE_URL=http://localhost:8080
```

### `GOOGLE_APPLICATION_CREDENTIALS`

Optional server environment variable containing the path to a Google service-account JSON file. Prefer the Base64 approach above for hosted deployments. Never commit the file.

## 9. Recommended local configuration

For the current working demo, use:

```env
PORT=8080
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
DEMO_MODE=true
FEED_MODE_WEATHER=live
FEED_MODE_TRAFFIC=live
FEED_MODE_TRANSIT=live
VITE_USE_FIXTURES=false
VITE_USE_EMULATOR=false
VITE_API_BASE_URL=
VITE_API_URL=
GROQ_API_KEY=
```

Then run:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The dashboard will use the backend API, live Open-Meteo weather data, and no synthetic fallback. Traffic and transit remain unavailable until their real providers are configured. If Groq is not configured, briefs use the deterministic evidence-based generator.

## 10. Production checklist

- Set `NODE_ENV=production`.
- Set `CORS_ORIGINS` to the deployed frontend domain.
- Keep `DEMO_MODE=false` unless this is a demo deployment.
- Keep `GROQ_API_KEY` server-only.
- Do not use `VITE_` for secrets.
- Configure real feed providers before setting feed modes to `live`.
- Do not assume Firebase persistence is active until the backend Admin SDK integration is implemented and tested.
