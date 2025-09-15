interface CacheEntry<T> {
  data: T;
  expiry: number;
  accessTime: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;
  
  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute default

    // Start periodic cleanup if not in test environment
    if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
      this.startCleanup();
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  public cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.expiry <= now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  public set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    const expiry = ttl === Infinity ? Number.MAX_SAFE_INTEGER : now + ttl;

    // Check if we need to evict entries to maintain max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expiry,
      accessTime: now
    });
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (entry.expiry <= now) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access time for LRU
    entry.accessTime = now;
    this.hits++;

    return entry.data as T;
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiry <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  public size(): number {
    // Clean up expired entries before returning size
    this.cleanup();
    return this.cache.size;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Number.MAX_SAFE_INTEGER;

    // Find the least recently used entry
    this.cache.forEach((entry, key) => {
      if (entry.accessTime < lruTime) {
        lruTime = entry.accessTime;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.cache.delete(lruKey);
      this.evictions++;
    }
  }

  // Batch operations
  public getMultiple<T>(keys: string[]): Record<string, T | null> {
    const results: Record<string, T | null> = {};
    
    keys.forEach(key => {
      results[key] = this.get<T>(key);
    });

    return results;
  }

  public setMultiple<T>(entries: Record<string, T>, ttl?: number): void {
    Object.entries(entries).forEach(([key, value]) => {
      this.set(key, value, ttl);
    });
  }

  public deleteMultiple(keys: string[]): void {
    keys.forEach(key => {
      this.delete(key);
    });
  }

  // Pattern matching
  public getKeysByPrefix(prefix: string): string[] {
    const keys: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    });

    return keys;
  }

  public deleteByPattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.delete(key);
    });
  }

  // Statistics
  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate
    };
  }

  public resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  // Cleanup on destroy
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();