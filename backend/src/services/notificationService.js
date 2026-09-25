import crypto from 'node:crypto';
import { db, getFirebaseMessaging } from '../lib/firebase.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import nodemailer from 'nodemailer';

const notificationCountBySeverity = { low: 1, medium: 3, high: 5 };
const emailOtpStore = new Map();

function tokenId(uid, token) {
  return `${uid}_${crypto.createHash('sha256').update(token).digest('hex').slice(0, 20)}`;
}

export function notificationCountForSeverity(severity) {
  return notificationCountBySeverity[severity] || 1;
}

export async function registerNotificationToken({ uid, token, email, emailOptIn, criticalOnly }) {
  if (!db || !token) return { registered: false, reason: 'firebase_unavailable' };
  await db.collection('notification_tokens').doc(tokenId(uid, token)).set({
    uid,
    token,
    email: email || null,
    email_opt_in: Boolean(emailOptIn),
    critical_only: Boolean(criticalOnly),
    updated_at: new Date().toISOString(),
  });
  return { registered: true };
}

function recipientsForZone(rows, zoneId) {
  return rows.filter((row) => {
    const zones = Array.isArray(row.zone_ids) ? row.zone_ids : [];
    return !zones.length || zones.includes(zoneId) || zoneId === 'CITY';
  });
}

async function sendEmailNotifications(recipients, message) {
  const smtpPassword = env.SMTP_PASSWORD || env.SMTP_PASS;
  if (!env.SMTP_HOST || !env.SMTP_USER || !smtpPassword) {
    return { sent: 0, skipped: true, reason: 'smtp_unconfigured' };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: smtpPassword },
  });
  const targets = recipients.filter((row) => row.email_opt_in && row.email);
  const results = await Promise.allSettled(targets.map((row) => transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: row.email,
    subject: message.title,
    text: message.body,
  })));
  return { sent: results.filter((result) => result.status === 'fulfilled').length, skipped: false };
}

export async function sendZoneMessage({ zoneId, title, body, channels = ['web', 'email'] }) {
  const rows = db ? await db.collection('notification_tokens').list() : [];
  const recipients = recipientsForZone(rows, zoneId);
  const result = { web: { sent: 0, skipped: !channels.includes('web') }, email: { sent: 0, skipped: !channels.includes('email') } };

  if (channels.includes('web')) {
    const messaging = getFirebaseMessaging();
    const tokens = recipients.map((row) => row.token).filter(Boolean);
    if (messaging && tokens.length) {
      const response = await messaging.sendEachForMulticast({ tokens, notification: { title, body }, data: { zoneId, kind: 'operator_message' } });
      result.web = { sent: response.successCount, skipped: false, recipients: tokens.length };
    } else {
      result.web = { sent: 0, skipped: true, reason: messaging ? 'no_registered_tokens' : 'firebase_unavailable' };
    }
  }

  if (channels.includes('email')) result.email = await sendEmailNotifications(recipients, { title, body });
  logger.info({ zoneId, title, channels, delivery: result }, 'operator zone message dispatched');
  return result;
}

export async function sendAlertNotifications(alert) {
  const messaging = getFirebaseMessaging();
  if (!messaging || !db) return { sent: 0, skipped: true };

  const rows = await db.collection('notification_tokens').list();
  const eligible = rows.filter((row) => !row.critical_only || alert.severity === 'high');
  const tokens = eligible.map((row) => row.token).filter(Boolean);
  if (!tokens.length) return { sent: 0, skipped: false };

  const count = notificationCountForSeverity(alert.severity);
  let sent = 0;
  for (let index = 0; index < count; index += 1) {
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: alert.title, body: alert.body },
      data: { alertId: alert.id, severity: alert.severity, sequence: String(index + 1), total: String(count) },
    });
    sent += result.successCount;
  }

  logger.info({ alertId: alert.id, severity: alert.severity, notificationCount: count, recipients: tokens.length, sent }, 'alert notifications dispatched');
  return { sent, skipped: false, notificationCount: count };
}

function createSmtpTransporter() {
  const smtpPassword = env.SMTP_PASSWORD || env.SMTP_PASS;
  if (!env.SMTP_HOST || !env.SMTP_USER || !smtpPassword) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: smtpPassword },
  });
}

export async function sendEmailOtp(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const transporter = createSmtpTransporter();
  if (!transporter) throw new Error('Email OTP is not configured for this environment.');
  const code = String(crypto.randomInt(100000, 1000000));
  emailOtpStore.set(normalizedEmail, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: normalizedEmail,
    subject: 'Your CityPulse email code',
    text: `Your CityPulse verification code is ${code}. It expires in 10 minutes.`,
  });
  return { sent: true, expiresInSeconds: 600, ...(process.env.NODE_ENV !== 'production' ? { code } : {}) };
}

export function verifyEmailOtp(email, code) {
  const key = String(email || '').trim().toLowerCase();
  const normalizedCode = String(code || '').trim();
  const entry = emailOtpStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    emailOtpStore.delete(key);
    return false;
  }
  if (entry.code !== normalizedCode) return false;
  emailOtpStore.delete(key);
  return true;
}