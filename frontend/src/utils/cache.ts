// Cache management utilities
const CACHE_PREFIX = 'f1_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const cache = {
  set: <T>(key: string, data: T): void => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }
  },

  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const isExpired = Date.now() - entry.timestamp > CACHE_EXPIRY;

      if (isExpired) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return entry.data;
    } catch (e) {
      console.warn('Failed to retrieve cached data:', e);
      return null;
    }
  },

  clear: (): void => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (e) {
      console.warn('Failed to remove cache entry:', e);
    }
  },
};
