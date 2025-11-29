/**
 * Simple request cache to prevent duplicate API calls
 * Caches responses for a specified duration
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class RequestCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Generate cache key from URL and options
   */
  private generateKey(url: string, options?: Record<string, any>): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${url}::${optionsStr}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Get cached response
   */
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

  /**
   * Set cached response
   */
  set(url: string, data: any, ttl: number = 30000, options?: Record<string, any>): void {
    const key = this.generateKey(url, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(url: string, options?: Record<string, any>): void {
    const key = this.generateKey(url, options);
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Cleanup and stop interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearAll();
  }
}

// Export singleton instance
export const requestCache = new RequestCache();

/**
 * Fetch with cache support
 * 
 * @example
 * const data = await cachedFetch('/api/shipments', { 
 *   credentials: 'include',
 *   cacheTTL: 30000 // 30 seconds
 * });
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit & { cacheTTL?: number }
): Promise<Response> {
  const { cacheTTL = 30000, ...fetchOptions } = options || {};

  // Check cache first
  const cached = requestCache.get(url, { method: fetchOptions?.method || 'GET' });
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Make actual request
  const response = await fetch(url, fetchOptions);

  // Cache successful responses
  if (response.ok) {
    const data = await response.clone().json();
    requestCache.set(url, data, cacheTTL, { method: fetchOptions?.method || 'GET' });
  }

  return response;
}

/**
 * Clear cache when data changes (after mutations)
 */
export function invalidateCache(urlPattern: string): void {
  // If you need pattern-based invalidation, implement it here
  requestCache.clearAll(); // For now, clear everything on mutation
}
