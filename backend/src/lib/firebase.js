import net from 'node:net';
import { logger } from './logger.js';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export function wrapCollection(collection, fallbackFactory) {
  if (!collection || typeof collection !== 'object') return collection;
  if (typeof collection.list === 'function' && !fallbackFactory) return collection;

  const getFallback = () => {
    if (!fallbackFactory) return null;
    const fallback = fallbackFactory();
    return fallback && typeof fallback === 'object' ? fallback : null;
  };

  const doc = (id) => {
    const nativeDoc = typeof collection.doc === 'function' ? collection.doc(id) : null;
    const fallbackDoc = () => {
      const fallback = getFallback();
      return fallback && typeof fallback.doc === 'function' ? fallback.doc(id) : null;
    };

    if (!nativeDoc) return fallbackDoc();

    return {
      ...nativeDoc,
      async get() {
        try {
          return await nativeDoc.get();
        } catch (error) {
          const fallback = fallbackDoc();
          if (fallback && typeof fallback.get === 'function') return fallback.get();
          throw error;
        }
      },
      async set(data) {
        try {
          return await nativeDoc.set(data);
        } catch (error) {
          const fallback = fallbackDoc();
          if (fallback && typeof fallback.set === 'function') return fallback.set(data);
          throw error;
        }
      },
      async update(data) {
        try {
          return await nativeDoc.update(data);
        } catch (error) {
          const fallback = fallbackDoc();
          if (fallback && typeof fallback.update === 'function') return fallback.update(data);
          throw error;
        }
      },
      async delete() {
        try {
          return await nativeDoc.delete();
        } catch (error) {
          const fallback = fallbackDoc();
          if (fallback && typeof fallback.delete === 'function') return fallback.delete();
          throw error;
        }
      },
    };
  };

  return {
    ...collection,
    doc,
    async add(data) {
      try {
        if (typeof collection.add === 'function') return await collection.add(data);
        return null;
      } catch (error) {
        const fallback = getFallback();
        if (fallback && typeof fallback.add === 'function') return fallback.add(data);
        throw error;
      }
    },
    async list() {
      try {
        if (typeof collection.list === 'function') {
          return await collection.list();
        }
        if (typeof collection.get === 'function') {
          const snapshot = await collection.get();
          if (snapshot && Array.isArray(snapshot.docs)) {
            return snapshot.docs.map((docEntry) => ({ id: docEntry.id, ...docEntry.data() }));
          }
        }
        throw new Error('Collection does not support list()');
      } catch (error) {
        const fallback = getFallback();
        if (fallback && typeof fallback.list === 'function') return fallback.list();
        throw error;
      }
    },
  };
}

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
    return wrapCollection(new MemoryCollection(this, name));
  }

  emit(event, payload) {
    for (const fn of this.listeners) fn(event, payload);
  }

  on(event, fn) {
    this.listeners.push(fn);
  }
}

const memoryStore = new MemoryStore();

async function isHostReachable(host, port, timeoutMs = 250) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function getFirebaseDb() {
  try {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const [host, portText] = String(process.env.FIRESTORE_EMULATOR_HOST).split(':');
      const port = Number(portText || 8081);
      const reachable = await isHostReachable(host || '127.0.0.1', port);
      if (!reachable) {
        logger.warn({ emulator: process.env.FIRESTORE_EMULATOR_HOST }, 'Firestore emulator unavailable; using memory store');
        return memoryStore;
      }

      const app = getApps()[0] || initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'citypulse-local' });
      logger.info({ emulator: process.env.FIRESTORE_EMULATOR_HOST }, 'Using Firestore emulator');
      const firestore = getFirestore(app);
      const originalCollection = firestore.collection.bind(firestore);
      firestore.collection = (name) => wrapCollection(originalCollection(name), () => memoryStore.collection(name));
      return firestore;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
      const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id });
      logger.info({ projectId: serviceAccount.project_id }, 'Using Cloud Firestore');
      const firestore = getFirestore(app);
      const originalCollection = firestore.collection.bind(firestore);
      firestore.collection = (name) => wrapCollection(originalCollection(name), () => memoryStore.collection(name));
      return firestore;
    }
  } catch (error) {
    logger.warn({ error: String(error.message || error) }, 'Firestore initialization failed; using memory store');
  }

  return memoryStore;
}

export const db = await getFirebaseDb();

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
