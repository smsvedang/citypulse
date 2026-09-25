# CityPulse — Civic Health Intelligence Platform

CityPulse is a real-time civic health monitoring platform that fuses weather, traffic incidents, transit delays, and civic signals into a unified event model. It detects anomalies, computes spatial/temporal correlations, and generates grounded situation briefs in plain language.

---

## 🏛️ System Architecture

```text
citypulse/
├── frontend/         # React + Vite + Tailwind dashboard (all 7 views connected)
├── backend/          # Express API server (port 8080) with ingestion adapters
├── intelligence/     # Anomaly detector, correlation engine, and Groq brief generator
├── simulator/        # Scenario runner and replay controller
├── shared/           # @citypulse/shared contract, schemas, enums, fixtures
├── docs/             # Integration audit and report
└── scripts/          # Contract check, smoke test, and demo runners
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 20
- npm >= 10

### 2. Setup
Clone the repository and copy the environment configuration:
```bash
cp .env.example .env
npm install
```

> **Note on Firestore:** By default, CityPulse uses an embedded high-speed in-memory store, so neither Firebase credentials nor a running emulator is required to test or run the app. If you wish to use Cloud Firestore or the Firebase Emulator, configure `FIREBASE_PROJECT_ID` or `FIRESTORE_EMULATOR_HOST` in `.env`.

### 3. Run Development Environment
To start the frontend, backend, and intelligence services concurrently:
```bash
npm run dev
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8080](http://localhost:8080)

### Deploy to Vercel

The repository is configured as one Vercel project. Vercel builds `frontend/dist` and serves the Express API through `api/[...path].js`.

```bash
npm install
npm run build
```

Import the repository into Vercel with the project root left at the repository root. Add production environment variables from `.env.example`; Firebase credentials are optional when using the in-memory store.

The deployed dashboard is available at `/`, and the API remains available under `/api/*`.

---

## 🧪 Testing & Verification

### Contract Verification
Validates that all event models, enums, zone schemas, and timestamps strictly adhere to the contract:
```bash
npm run contract:check
```

### Unit & Integration Tests
Runs the test suite across all workspaces:
```bash
npm test
```

### API Smoke Tests
Validates that all backend API routes respond with HTTP 200:
```bash
npm run smoke
```

### Production Build
Verifies that the frontend builds without type or bundling errors:
```bash
npm run build
```

---

## 🎬 Running the Demo Replay

The canonical demo scenario (**Rain in Zone 4 → Traffic Congestion Spike → Transit Delay → Anomaly Detected → Grounded AI Brief → Alert Fired**) can be triggered in two ways:

1. **In Browser:**
   - Open [http://localhost:5173/demo](http://localhost:5173/demo).
   - Click **"Play Scenario"** to observe real-time progression through all 8 stages.
2. **Via Command Line:**
   ```bash
   npm run demo
   ```

---

## 📄 Documentation

- [Environment Setup Guide](docs/environment-setup-guide.md)
- [Phase 1 Integration Audit](docs/integration-audit.md)
- [Integration Report](docs/integration-report.md)
# citypulse
# citypulse
