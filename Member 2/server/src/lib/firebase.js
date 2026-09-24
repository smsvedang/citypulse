import { logger } from './logger.js';

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

export function getFirebaseDb() {
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_PROJECT_ID) {
    logger.warn('Using Firestore emulator or configured project; memory fallback is not active.');
    return null;
  }
  return memoryStore;
}

export const db = getFirebaseDb();
export default db;
