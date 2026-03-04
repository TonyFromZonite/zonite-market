/**
 * IndexedDB Cache - Persiste les données hors-ligne
 * Stratégie : Lazy-load + TTL intelligent
 * Poids : ~4KB minified
 */

const DB_NAME = 'ZONITE_CACHE_V1';
const DB_VERSION = 1;

class IndexedDBCacheManager {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Créer stores pour les entités principales
        const stores = [
          { name: 'produits', keyPath: 'id' },
          { name: 'vendeurs', keyPath: 'id' },
          { name: 'categories', keyPath: 'id' },
          { name: 'metadata', keyPath: 'key' },
        ];

        stores.forEach(({ name, keyPath }) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        });
      };
    });
  }

  async set(storeName, data) {
    await this.init();
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Si data est un array, stocker chaque item
    if (Array.isArray(data)) {
      data.forEach(item => store.put(item));
    } else {
      store.put(data);
    }

    // Mettre à jour le timestamp
    const metaTx = this.db.transaction('metadata', 'readwrite');
    metaTx.objectStore('metadata').put({
      key: storeName,
      timestamp: Date.now(),
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(storeName, id = null) {
    await this.init();
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      let request;
      if (id) {
        request = store.get(id);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    return this.get(storeName);
  }

  async clear(storeName) {
    await this.init();
    const tx = this.db.transaction(storeName, 'readwrite');
    const request = tx.objectStore(storeName).clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(storeName) {
    const data = await this.get('metadata', storeName);
    return data || { key: storeName, timestamp: 0 };
  }

  async isExpired(storeName, ttlMs) {
    const metadata = await this.getMetadata(storeName);
    return Date.now() - metadata.timestamp > ttlMs;
  }
}

export const idbCache = new IndexedDBCacheManager();

/**
 * Hook React pour charger depuis cache + API avec fallback
 */
export function useOfflineData(storeName, queryFn, ttlMs = 24 * 60 * 60 * 1000) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const loadData = async () => {
      try {
        // 1. Essayer charger depuis cache d'abord
        const cached = await idbCache.getAll(storeName);
        if (cached && cached.length > 0) {
          setData(cached);
          setLoading(false);

          // 2. Si online et cache expiré, mettre à jour en fond
          if (navigator.onLine) {
            const expired = await idbCache.isExpired(storeName, ttlMs);
            if (expired) {
              try {
                const fresh = await queryFn();
                await idbCache.set(storeName, fresh);
                setData(fresh);
              } catch (err) {
                // Garder les données cachées si fetch échoue
              }
            }
          }
          return;
        }

        // 3. Si pas de cache, charger depuis API
        if (navigator.onLine) {
          const fresh = await queryFn();
          await idbCache.set(storeName, fresh);
          setData(fresh);
          setError(null);
        }
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [storeName, queryFn, ttlMs]);

  return { data, loading, error, isOffline };
}