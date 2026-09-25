import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from 'firebase/auth';
import { CitizenAuth } from './CitizenAuth';
import { getFirebaseAuth, getWebPushToken } from '../../lib/firebase';
import { api } from '../../api/client';

type NotificationPreferences = {
  web: boolean;
  email: boolean;
  criticalOnly: boolean;
};

const preferenceKey = 'citypulse-notification-preferences';
const defaultPreferences: NotificationPreferences = {
  web: false,
  email: true,
  criticalOnly: false,
};

function readPreferences(): NotificationPreferences {
  try {
    const saved = window.localStorage.getItem(preferenceKey);
    return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(readPreferences);
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    const auth = getFirebaseAuth();
    return auth ? onAuthStateChanged(auth, setUser) : undefined;
  }, []);

  useEffect(() => {
    window.localStorage.setItem(preferenceKey, JSON.stringify(preferences));
  }, [preferences]);

  const otpVerified = !!user && (user.emailVerified || (user.email ? window.localStorage.getItem(`citypulse-email-otp-verified:${user.email.toLowerCase()}`) === 'true' : false));

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const enableWebNotifications = async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission === 'granted' && user) {
      const token = await getWebPushToken();
      if (token) {
        try {
          await api('/api/notifications/tokens', {
            method: 'POST',
            headers: { Authorization: `Bearer ${await user.getIdToken()}` },
            body: JSON.stringify({ uid: user.uid, token, email: user.email, emailOptIn: preferences.email, criticalOnly: preferences.criticalOnly }),
          });
        } catch (error) {
          console.warn('Notification token registration failed:', error);
        }
      }
    }
    updatePreference('web', nextPermission === 'granted');
  };

  const enableEmailNotifications = async (value: boolean) => {
    updatePreference('email', value);
    if (value && user && !user.emailVerified) await sendEmailVerification(user);
  };

  const savePreferences = () => {
    window.localStorage.setItem(preferenceKey, JSON.stringify(preferences));
    setSaved(true);
  };

  if (!user || !otpVerified) return <CitizenAuth onAuthenticated={() => setUser(getFirebaseAuth()?.currentUser ?? null)} />;

  const displayName = user.displayName || user.email?.split('@')[0] || 'Citizen';
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20 md:p-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-slate-950 shadow-lg shadow-amber-400/10">
              {initials}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Member profile</p>
              <h1 className="mt-1 text-2xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-slate-400">Citizen account · Jaipur Metro Area</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 md:self-center">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Active account
          </div>
        </div>
        <div className="mt-7 grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-3">
          <ProfileDetail label="Email address" value={user.email || 'Not provided'} />
          <ProfileDetail label="Email security" value={user.emailVerified || otpVerified ? 'Email OTP verified' : 'Email OTP required'} />
          <ProfileDetail label="Account" value="CityPulse citizen account" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Stay informed</p>
              <h2 className="mt-1 text-xl font-bold text-white">Notification preferences</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-400">Choose how CityPulse should reach you when the city needs attention.</p>
            </div>
            <span className="hidden rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-mono text-slate-500 sm:block">SYNCED</span>
          </div>

          <div className="mt-6 divide-y divide-slate-800">
            <PreferenceRow
              icon="◉"
              title="Web notifications"
              description={permission === 'granted' ? 'Browser alerts are enabled on this device.' : 'Get an alert when a subscribed civic signal changes.'}
              checked={preferences.web}
              onChange={(value) => (value ? enableWebNotifications() : updatePreference('web', false))}
              actionLabel={permission === 'granted' ? 'Enabled' : 'Allow'}
            />
            <PreferenceRow
              icon="✉"
              title="Email notifications"
              description="Receive digests and high-priority alerts at your work email."
              checked={preferences.email}
              onChange={enableEmailNotifications}
              actionLabel="Toggle"
            />
            <PreferenceRow
              icon="!"
              title="Critical alerts only"
              description="Limit notifications to severe incidents and feed outages."
              checked={preferences.criticalOnly}
              onChange={(value) => updatePreference('criticalOnly', value)}
              actionLabel="Toggle"
            />
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-500">
              {permission === 'denied' ? 'Web alerts are blocked in your browser settings.' : 'Preferences are saved on this device.'}
            </p>
            <button onClick={savePreferences} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400">
              {saved ? 'Preferences saved' : 'Save preferences'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Workspace access</p>
          <h2 className="mt-1 text-xl font-bold text-white">Your CityPulse</h2>
          <div className="mt-6 space-y-4">
            <AccessDetail label="Default area" value="Jaipur Metro Area" />
            <AccessDetail label="Subscribed zones" value="7 zones" />
            <AccessDetail label="Last active" value="Today, 10:42 AM" />
          </div>
          <button onClick={() => signOut(getFirebaseAuth()!)} className="mt-7 w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-500/50 hover:bg-slate-800">
            Sign out of citizen account
          </button>
        </section>
      </div>
    </div>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}

function AccessDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-200">{value}</span>
    </div>
  );
}

function PreferenceRow({
  icon,
  title,
  description,
  checked,
  onChange,
  actionLabel,
}: {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-cyan-300">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        aria-label={`${actionLabel} ${title}`}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${checked ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600 bg-slate-800'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}