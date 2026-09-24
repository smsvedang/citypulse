import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes/api.js';
import { initStore, upsertFeedStatus, isoNow } from './store/firestore.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';

initStore();

app.use(
  cors({
    origin: [webOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.json({ service: 'citypulse-api', docs: '/api/health' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal error' });
});

app.listen(port, () => {
  console.log(`CityPulse API http://localhost:${port}/api`);
});
