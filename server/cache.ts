/**
 * Simple in-memory cache for API responses
 * Optimized for faster page loads and reduced database queries
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ResponseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear a specific cache key
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats (for debugging)
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const apiCache = new ResponseCache();

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  STATIC: 60 * 60 * 1000,      // 1 hour - for rarely changing data (countries)
  MEDIUM: 15 * 60 * 1000,      // 15 minutes - for map data
  SHORT: 5 * 60 * 1000,        // 5 minutes - for stats
  VERY_SHORT: 60 * 1000,       // 1 minute - for frequently updated data
} as const;
