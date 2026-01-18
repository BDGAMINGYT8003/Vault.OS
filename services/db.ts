import { VaultFile } from '../types';

const DB_NAME = 'ObsidianVaultDB';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_CONFIG = 'config';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('Database error: ' + (event.target as IDBOpenDBRequest).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };
  });
};

export const dbService = {
  // Check if a password exists (config store)
  hasPassword: async (): Promise<boolean> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONFIG, 'readonly');
      const store = tx.objectStore(STORE_CONFIG);
      const request = store.get('password');
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Verify password (simple string comparison for this demo)
  verifyPassword: async (input: string): Promise<boolean> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONFIG, 'readonly');
      const store = tx.objectStore(STORE_CONFIG);
      const request = store.get('password');
      request.onsuccess = () => {
        if (request.result && request.result.value === input) {
          resolve(true);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Set password
  setPassword: async (password: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONFIG, 'readwrite');
      const store = tx.objectStore(STORE_CONFIG);
      store.put({ key: 'password', value: password });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // Save a file
  saveFile: async (file: File): Promise<VaultFile> => {
    const db = await openDB();
    const vaultFile: VaultFile = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      data: file, // File inherits from Blob
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.add(vaultFile);
      tx.oncomplete = () => resolve(vaultFile);
      tx.onerror = () => reject(tx.error);
    });
  },

  // Get all files
  getFiles: async (): Promise<VaultFile[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort by newest first
        const files = (request.result as VaultFile[]).sort((a, b) => b.createdAt - a.createdAt);
        resolve(files);
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Delete a file
  deleteFile: async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
};
