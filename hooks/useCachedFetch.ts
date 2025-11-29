/**
 * useCachedFetch: Hook for making cached API requests
 * 
 * Caches responses in memory to prevent redundant database queries
 * when filters are reloaded without changes
 * 
 * Features:
 * - Response caching with TTL (Time To Live)
 * - Automatic cache invalidation after TTL expires
 * - Manual cache clearing
 * - Same query deduplication
 */

import { useCallback, useRef, useEffect } from 'react';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class FetchCache {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-cleanup expired entries every 5 minutes
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  private generateKey(url: string, options?: Record<string, any>): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${url}::${optionsStr}`;
  }

  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  get(url: string, options?: Record<string, any>): any | null {
    const key = this.generateKey(url, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(url: string, data: any, ttl: number = 30000, options?: Record<string, any>): void {
    const key = this.generateKey(url, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  invalidate(url: string, options?: Record<string, any>): void {
    const key = this.generateKey(url, options);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Global cache instance
const globalCache = new FetchCache();

interface UseCachedFetchOptions {
  ttl?: number; // Time to live in milliseconds (default: 30s)
  skipCache?: boolean; // Skip cache for this request
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
}

export function useCachedFetch() {
  const cacheRef = useRef(globalCache);

  const cachedFetch = useCallback(
    async (
      url: string,
      options: UseCachedFetchOptions & RequestInit = {}
    ): Promise<any> => {
      const { ttl = 30000, skipCache = false, ...fetchOptions } = options;
      const method = (options.method || 'GET').toUpperCase();

      // Only cache GET requests
      if (method !== 'GET') {
        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        return data;
      }

      // Check cache first if not skipping cache
      if (!skipCache) {
        const cached = cacheRef.current.get(url, fetchOptions);
        if (cached) {
          return cached;
        }

        // Return pending request if same request is already in flight
        const key = `${url}::${JSON.stringify(fetchOptions)}`;
        if (cacheRef.current['pendingRequests']?.has(key)) {
          return cacheRef.current['pendingRequests'].get(key);
        }
      }

      // Make the fetch request
      const promise = fetch(url, { ...fetchOptions, method })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          // Cache successful responses
          cacheRef.current.set(url, data, ttl, fetchOptions);
          return data;
        });

      // Store pending request
      if (!skipCache) {
        const key = `${url}::${JSON.stringify(fetchOptions)}`;
        cacheRef.current['pendingRequests'].set(key, promise);
        promise.finally(() => {
          cacheRef.current['pendingRequests'].delete(key);
        });
      }

      return promise;
    },
    []
  );

  const invalidateCache = useCallback((url: string, options?: Record<string, any>) => {
    cacheRef.current.invalidate(url, options);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy global cache on unmount, just in component cleanup
    };
  }, []);

  return {
    fetch: cachedFetch,
    invalidateCache,
    clearCache,
  };
}

export default useCachedFetch;
