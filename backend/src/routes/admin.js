import { Router } from 'express';
import { db, getFirebaseAuth } from '../lib/firebase.js';

const router = Router();

function isAdmin(req) {
  return req.headers['x-admin-username'] === (process.env.ADMIN_USERNAME || 'admin')
    && req.headers['x-admin-password'] === (process.env.ADMIN_PASSWORD || 'admin123');
}

router.get('/admin/users', async (req, res, next) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ message: 'Admin credentials required.' });

    const optIns = new Map((await db.collection('notification_tokens').list()).map((row) => [row.uid, row]));
    const auth = getFirebaseAuth();
    const users = [];
    if (auth) {
      let page;
      do {
        page = await auth.listUsers(1000, page?.pageToken);
        page.users.forEach((user) => {
          const preferences = optIns.get(user.uid) || {};
          users.push({ uid: user.uid, email: user.email || null, displayName: user.displayName || null, emailOptIn: Boolean(preferences.email_opt_in), webOptIn: Boolean(preferences.token), criticalOnly: Boolean(preferences.critical_only), updatedAt: preferences.updated_at || null });
        });
      } while (page.pageToken);
    } else {
      optIns.forEach((preferences, uid) => users.push({ uid, email: preferences.email || null, displayName: null, emailOptIn: Boolean(preferences.email_opt_in), webOptIn: Boolean(preferences.token), criticalOnly: Boolean(preferences.critical_only), updatedAt: preferences.updated_at || null }));
    }
    res.set('Cache-Control', 'no-store').json(users);
  } catch (error) {
    next(error);
  }
});

export default router;