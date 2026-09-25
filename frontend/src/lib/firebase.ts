import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (!hasFirebaseConfig) {
    console.warn('Firebase Auth is unavailable: complete VITE_FIREBASE_* settings are required.');
    return null;
  }
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (err) {
      console.warn('Firebase initialization skipped or failed:', err);
      return null;
    }
  } else {
    app = getApps()[0];
  }
  return app;
}

export function getFirestoreDb(): Firestore | null {
  if (db) return db;
  const currentApp = getFirebaseApp();
  if (!currentApp) return null;

  try {
    db = getFirestore(currentApp);
    const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';
    if (useEmulator) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    return db;
  } catch (err) {
    console.warn('Firestore connection fallback to API/fixtures:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  const currentApp = getFirebaseApp();
  if (!currentApp) return null;
  if (!auth) auth = getAuth(currentApp);
  return auth;
}

export async function getWebPushToken(): Promise<string | null> {
  const currentApp = getFirebaseApp();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!currentApp || !vapidKey || !(await isSupported())) return null;

  try {
    messaging = messaging || getMessaging(currentApp);
    const serviceWorkerUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
    Object.entries(firebaseConfig).forEach(([key, value]) => serviceWorkerUrl.searchParams.set(key, value));
    const serviceWorkerRegistration = await navigator.serviceWorker.register(serviceWorkerUrl.toString());
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  } catch (error) {
    console.warn('Web push token unavailable:', error);
    return null;
  }
}
