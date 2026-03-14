// Cache simple avec IndexedDB pour économiser les crédits Base44
const DB_NAME = 'zonite_cache';
const STORE_NAME = 'entities';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let db = null;

const initDB = async () => {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

export const cacheGet = async (key) => {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const item = request.result;
        if (item && Date.now() - item.timestamp < CACHE_DURATION) {
          resolve(item.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const cacheSet = async (key, data) => {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ key, data, timestamp: Date.now() });
      transaction.oncomplete = () => resolve();
    });
  } catch {
    return null;
  }
};

export const cacheClear = async (key) => {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);
      transaction.oncomplete = () => resolve();
    });
  } catch {
    return null;
  }
};