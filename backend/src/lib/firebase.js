import { logger } from './logger.js';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

class MemoryCollection {
  constructor(store, collectionName) {
    this.store = store;
    this.collectionName = collectionName;
  }

  doc(id) {
    const docId = id || 'new';
    const collection = this.store.getCollection(this.collectionName);
    const setDoc = async (data) => {
      collection[docId] = { ...(data || {}) };
      this.store.emit('change', { collection: this.collectionName, id: docId, data: collection[docId] });
      return { id: docId };
    };

    const updateDoc = async (data) => {
      collection[docId] = { ...(collection[docId] || {}), ...(data || {}) };
      this.store.emit('change', { collection: this.collectionName, id: docId, data: collection[docId] });
      return { id: docId };
    };

    const deleteDoc = async () => {
      delete collection[docId];
      this.store.emit('change', { collection: this.collectionName, id: docId, data: null });
    };

    return {
      id: docId,
      async get() {
        const item = collection[docId];
        return item ? { exists: true, data: () => ({ ...item }) } : { exists: false, data: () => null };
      },
      set: setDoc,
      update: updateDoc,
      delete: deleteDoc,
    };
  }

  async add(data) {
    const id = data.id || `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const doc = this.doc(id);
    await doc.set(data);
    return { id };
  }

  async list() {
    return Object.values(this.store.getCollection(this.collectionName));
  }
}

class MemoryStore {
  constructor() {
    this.data = {};
    this.listeners = [];
  }

  getCollection(name) {
    if (!this.data[name]) this.data[name] = {};
    return this.data[name];
  }

  collection(name) {
    return new MemoryCollection(this, name);
  }

  emit(event, payload) {
    for (const fn of this.listeners) fn(event, payload);
  }

  on(event, fn) {
    this.listeners.push(fn);
  }
}

const memoryStore = new MemoryStore();

function getFirebaseDb() {
  try {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const app = getApps()[0] || initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'citypulse-local' });
      logger.info({ emulator: process.env.FIRESTORE_EMULATOR_HOST }, 'Using Firestore emulator');
      return getFirestore(app);
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
      const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id });
      logger.info({ projectId: serviceAccount.project_id }, 'Using Cloud Firestore');
      return getFirestore(app);
    }
  } catch (error) {
    logger.warn({ error: String(error.message || error) }, 'Firestore initialization failed; using memory store');
  }

  return memoryStore;
}

export const db = getFirebaseDb();

export function getFirebaseMessaging() {
  try {
    const app = getApps()[0];
    if (!app) return null;
    return getMessaging(app);
  } catch (error) {
    logger.warn({ error: String(error.message || error) }, 'Firebase Messaging unavailable');
    return null;
  }
}

export function getFirebaseAuth() {
  try {
    const app = getApps()[0];
    if (!app) return null;
    return getAuth(app);
  } catch (error) {
    logger.warn({ error: String(error.message || error) }, 'Firebase Auth unavailable');
    return null;
  }
}

export default db;
