import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'citypulse-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'citypulse-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'citypulse-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
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
