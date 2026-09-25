import { Router } from 'express';
import { z } from 'zod';
import { registerNotificationToken, sendZoneMessage } from '../services/notificationService.js';
import { db, getFirebaseAuth } from '../lib/firebase.js';

const router = Router();
const tokenSchema = z.object({
  uid: z.string().min(1),
  token: z.string().min(20),
  email: z.string().email().optional().nullable(),
  emailOptIn: z.boolean().optional(),
  criticalOnly: z.boolean().optional(),
});

const messageSchema = z.object({
  zoneId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(2000),
  channels: z.array(z.enum(['web', 'email'])).min(1).default(['web', 'email']),
});

function isAdmin(req) {
  return req.headers['x-admin-username'] === (process.env.ADMIN_USERNAME || 'admin')
    && req.headers['x-admin-password'] === (process.env.ADMIN_PASSWORD || 'admin123');
}

router.post('/notifications/tokens', async (req, res, next) => {
  try {
    const payload = tokenSchema.parse(req.body);
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const auth = getFirebaseAuth();
    if (auth) {
      if (!idToken) return res.status(401).json({ message: 'Firebase ID token required.' });
      const decoded = await auth.verifyIdToken(idToken);
      if (decoded.uid !== payload.uid) return res.status(403).json({ message: 'Token owner mismatch.' });
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ message: 'Firebase Auth is not configured.' });
    }
    res.json(await registerNotificationToken(payload));
  } catch (error) {
    next(error);
  }
});

router.post('/notifications/messages', async (req, res, next) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ message: 'Admin credentials required.' });
    const payload = messageSchema.parse(req.body);
    const message = {
      id: `message_${Date.now()}`,
      title: payload.title,
      body: payload.body,
      zone_id: payload.zoneId,
      severity: 'medium',
      status: 'active',
      created_at: new Date().toISOString(),
      source_refs: { operator: true },
    };
    if (db) await db.collection('alerts').doc(message.id).set(message);
    const delivery = await sendZoneMessage(payload);
    res.status(201).json({ data: { message, delivery }, meta: { generated_at: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

export default router;