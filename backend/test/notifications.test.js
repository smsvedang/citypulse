import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/lib/firebase.js';

describe('admin notification publishing', () => {
  it('writes a live operator event so the UI refreshes immediately', async () => {
    const app = createApp();
    const payload = {
      zoneId: 'ZONE-2',
      title: 'Live operator message test',
      body: 'This message should appear in both alerts and events.',
      channels: ['web'],
      demoMode: false,
    };

    const response = await request(app)
      .post('/api/notifications/messages')
      .set('x-admin-username', 'admin')
      .set('x-admin-password', 'admin123')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.message.zone_id).toBe('ZONE-2');

    const events = await db.collection('events').list();
    const matchingEvent = events.find((event) => event.title === payload.title && event.source === 'operator');

    expect(matchingEvent).toBeTruthy();
    expect(matchingEvent?.type).toBe('operator');

    if (matchingEvent?.id) {
      await db.collection('events').doc(matchingEvent.id).delete();
    }
  });
});
