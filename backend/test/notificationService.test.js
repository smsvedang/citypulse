import { describe, it, expect } from 'vitest';
import { shouldUseDemoNotifications } from '../src/services/notificationService.js';
import { env } from '../src/config/env.js';

describe('notification demo mode', () => {
  it('keeps live email and FCM delivery real when services are configured', () => {
    const originalDemo = env.DEMO_MODE;
    const originalHost = env.SMTP_HOST;
    const originalUser = env.SMTP_USER;
    const originalPassword = env.SMTP_PASSWORD || env.SMTP_PASS;

    env.DEMO_MODE = false;
    env.SMTP_HOST = 'smtp.gmail.com';
    env.SMTP_USER = 'demo@example.com';
    env.SMTP_PASSWORD = 'secret';

    try {
      expect(shouldUseDemoNotifications({ demoMode: true })).toBe(false);
    } finally {
      env.DEMO_MODE = originalDemo;
      env.SMTP_HOST = originalHost;
      env.SMTP_USER = originalUser;
      if (originalPassword) {
        env.SMTP_PASSWORD = originalPassword;
      } else {
        delete env.SMTP_PASSWORD;
      }
    }
  });
});
