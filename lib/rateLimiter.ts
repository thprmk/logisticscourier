/**
 * Rate Limiting Utility
 * Prevents brute force attacks and DDoS
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   * @param key Unique identifier (IP, user ID, email, etc.)
   * @param limit Maximum requests allowed
   * @param windowMs Time window in milliseconds
   * @returns true if request is allowed, false if rate limit exceeded
   */
  isAllowed(key: string, limit: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry) {
      // First request from this key
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    // Check if window has expired
    if (now >= entry.resetTime) {
      // Reset the window
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    // Window still active
    if (entry.count < limit) {
      entry.count++;
      return true;
    }

    // Limit exceeded
    return false;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, limit: number = 100): number {
    const entry = this.limits.get(key);
    if (!entry) return limit;
    return Math.max(0, limit - entry.count);
  }

  /**
   * Get reset time for a key (milliseconds until next window)
   */
  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Reset a specific key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all limits
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Destroy the limiter (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Export singleton instance
export const globalRateLimiter = new RateLimiter();

/**
 * Common rate limiting presets
 */
export const RateLimitPresets = {
  // Strict: 10 requests per minute (for sensitive operations like login)
  LOGIN: { limit: 10, windowMs: 60000 },

  // Moderate: 30 requests per minute (for API operations)
  API: { limit: 30, windowMs: 60000 },

  // Relaxed: 100 requests per minute (for read operations)
  READ: { limit: 100, windowMs: 60000 },

  // Very Relaxed: 500 requests per minute (for non-sensitive operations)
  RELAXED: { limit: 500, windowMs: 60000 },

  // Per Hour: 1000 requests per hour (for bulk operations)
  BULK: { limit: 1000, windowMs: 3600000 },
};

/**
 * Middleware helper to check rate limits
 * @param key Unique identifier for the request
 * @param preset One of the preset limits
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  key: string,
  preset: 'LOGIN' | 'API' | 'READ' | 'RELAXED' | 'BULK' = 'API'
) {
  const config = RateLimitPresets[preset];
  const allowed = globalRateLimiter.isAllowed(key, config.limit, config.windowMs);
  const remaining = globalRateLimiter.getRemaining(key, config.limit);
  const resetTime = globalRateLimiter.getResetTime(key);

  return {
    allowed,
    remaining,
    resetTime,
    limit: config.limit,
    windowMs: config.windowMs,
  };
}

/**
 * Extract IP address from request (handles proxies)
 */
export function getClientIp(request: any): string {
  const forwarded = request.headers?.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers?.get('x-client-ip') || request.ip || 'unknown';
}

