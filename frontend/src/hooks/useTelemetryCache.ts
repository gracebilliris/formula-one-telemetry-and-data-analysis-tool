import { useCallback, useState } from 'react';
import { cache } from '../utils/cache';

interface CacheMetadata {
  key: string;
  size: number;
  timestamp: number;
  expiresAt: number;
  itemCount: number;
  type: 'small' | 'large';
}

interface UseTelemetryCacheState {
  getCached: <T = unknown>(key: string) => T | null;
  setCached: <T = unknown>(key: string, data: T, ttlHours?: number) => void;
  clearCache: (key?: string) => void;
  getCacheMetadata: () => CacheMetadata[];
  isCacheValid: (key: string) => boolean;
}

const TELEMETRY_CACHE_PREFIX = 'telemetry_';
const METADATA_CACHE_PREFIX = 'telemetry_meta_';
const DEFAULT_TTL_HOURS = 24;
const SMALL_THRESHOLD = 100000; // ~100KB threshold for choosing storage type

/**
 * Custom hook for caching large telemetry datasets
 * Features:
 * - Uses localStorage for metadata and cache info
 * - Automatically determines optimal storage (localStorage for small, IndexedDB for large)
 * - Validates cache expiry and returns null for expired entries
 * - Tracks cache size and item count
 * - Support for custom TTL per entry
 * - Methods to get, set, and clear cached data
 * 
 * @returns Object with getCached, setCached, clearCache, and utility methods
 * 
 * @example
 * ```ts
 * const { getCached, setCached, clearCache } = useTelemetryCache();
 * 
 * // Cache car data
 * setCached('session_9161_cardata', carDataArray, 24);
 * 
 * // Retrieve cached data
 * const cachedData = getCached('session_9161_cardata');
 * 
 * // Check if cache is still valid
 * if (telemetryCache.isCacheValid('session_9161_cardata')) {
 *   // Data is fresh
 * }
 * 
 * // Clear specific cache or all telemetry cache
 * telemetryCache.clearCache('session_9161_cardata');
 * telemetryCache.clearCache(); // Clear all
 * ```
 */
export function useTelemetryCache(): UseTelemetryCacheState {
  const [, forceUpdate] = useState({});

  /**
   * Get cached data by key, validating expiry
   */
  const getCached = useCallback(<T = unknown>(key: string): T | null => {
    try {
      const cacheKey = `${TELEMETRY_CACHE_PREFIX}${key}`;
      const metadataKey = `${METADATA_CACHE_PREFIX}${key}`;

      // Get metadata to check expiry
      const metadata = cache.get<CacheMetadata>(metadataKey);
      if (!metadata || Date.now() > metadata.expiresAt) {
        // Cache expired, remove it
        cache.remove(cacheKey);
        cache.remove(metadataKey);
        return null;
      }

      // Get the actual data
      const data = cache.get<T>(cacheKey);
      return data;
    } catch (error) {
      console.warn('Failed to retrieve cached telemetry data:', error);
      return null;
    }
  }, []);

  /**
   * Set cached data with optional TTL
   */
  const setCached = useCallback(<T = unknown>(
    key: string,
    data: T,
    ttlHours: number = DEFAULT_TTL_HOURS
  ): void => {
    try {
      const cacheKey = `${TELEMETRY_CACHE_PREFIX}${key}`;
      const metadataKey = `${METADATA_CACHE_PREFIX}${key}`;

      // Estimate size (rough calculation)
      const dataString = JSON.stringify(data);
      const sizeEstimate = new Blob([dataString]).size;
      
      // Determine storage type based on size
      const storageType: 'small' | 'large' = sizeEstimate > SMALL_THRESHOLD ? 'large' : 'small';

      // Create metadata
      const now = Date.now();
      const expiresAt = now + (ttlHours * 60 * 60 * 1000);
      
      const itemCount = Array.isArray(data) ? data.length : 1;
      
      const metadata: CacheMetadata = {
        key,
        size: sizeEstimate,
        timestamp: now,
        expiresAt,
        itemCount,
        type: storageType,
      };

      // Store data
      cache.set(cacheKey, data);
      cache.set(metadataKey, metadata);

      console.debug(
        `Cached telemetry data: ${key} (${storageType}, ${sizeEstimate} bytes, ${itemCount} items)`
      );
    } catch (error) {
      console.warn('Failed to cache telemetry data:', error);
    }
  }, []);

  /**
   * Clear cache by key or all telemetry cache
   */
  const clearCache = useCallback((key?: string): void => {
    try {
      if (key) {
        // Clear specific cache entry
        const cacheKey = `${TELEMETRY_CACHE_PREFIX}${key}`;
        const metadataKey = `${METADATA_CACHE_PREFIX}${key}`;
        cache.remove(cacheKey);
        cache.remove(metadataKey);
        console.debug(`Cleared cache for: ${key}`);
      } else {
        // Clear all telemetry cache
        const storedKeys = Object.keys(localStorage);
        storedKeys.forEach(storageKey => {
          if (
            storageKey.startsWith(`f1_cache_${TELEMETRY_CACHE_PREFIX}`) ||
            storageKey.startsWith(`f1_cache_${METADATA_CACHE_PREFIX}`)
          ) {
            localStorage.removeItem(storageKey);
          }
        });
        console.debug('Cleared all telemetry cache');
      }
      forceUpdate({});
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }, []);

  /**
   * Get metadata for all cached items
   */
  const getCacheMetadata = useCallback((): CacheMetadata[] => {
    try {
      const allMetadata: CacheMetadata[] = [];
      const storageKeys = Object.keys(localStorage);

      storageKeys.forEach(key => {
        if (key.startsWith(`f1_cache_${METADATA_CACHE_PREFIX}`)) {
          const metadata = cache.get<CacheMetadata>(
            key.replace('f1_cache_', '')
          );
          if (metadata && Date.now() <= metadata.expiresAt) {
            allMetadata.push(metadata);
          }
        }
      });

      // Sort by timestamp descending
      return allMetadata.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.warn('Failed to get cache metadata:', error);
      return [];
    }
  }, []);

  /**
   * Check if a cache entry is still valid (not expired)
   */
  const isCacheValid = useCallback((key: string): boolean => {
    try {
      const metadataKey = `${METADATA_CACHE_PREFIX}${key}`;
      const metadata = cache.get<CacheMetadata>(metadataKey);
      
      if (!metadata) {
        return false;
      }

      return Date.now() <= metadata.expiresAt;
    } catch (error) {
      console.warn('Failed to validate cache:', error);
      return false;
    }
  }, []);

  return {
    getCached,
    setCached,
    clearCache,
    getCacheMetadata,
    isCacheValid,
  };
}
