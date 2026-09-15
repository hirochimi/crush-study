import { RateLimitCategory } from './types';
/**
 * Rate Limiter Class
 * Implements request throttling and resource protection
 */
export class RateLimiter {
    constructor(config) {
        this.store = new Map();
        this.categoryConfigs = new Map();
        this.config = config;
        this.stats = {
            totalRequests: 0,
            blockedRequests: 0,
            activeEntries: 0,
            byCategory: {},
            timestamp: Date.now()
        };
        // Start cleanup interval to remove expired entries
        this.startCleanup();
    }
    /**
     * Set rate limit configuration for a specific category
     * @param category Rate limit category
     * @param config Category-specific configuration
     */
    setCategoryConfig(category, config) {
        this.categoryConfigs.set(category, config);
    }
    /**
     * Check if request is within rate limits
     * @param key Rate limit key (usually IP or user ID)
     * @param category Request category
     * @returns Rate limit check result
     */
    checkLimit(key, category = RateLimitCategory.GENERAL) {
        const config = this.categoryConfigs.get(category) || this.config;
        const now = Date.now();
        const windowStart = now - config.windowMs;
        // Get or create entry for this key
        let entry = this.store.get(key);
        if (!entry || entry.windowStart < windowStart) {
            // Create new window
            entry = {
                count: 0,
                windowStart: now,
                firstRequest: now
            };
            this.store.set(key, entry);
        }
        // Update statistics
        this.stats.totalRequests++;
        if (!this.stats.byCategory[category]) {
            this.stats.byCategory[category] = { requests: 0, blocked: 0 };
        }
        this.stats.byCategory[category].requests++;
        // Check if limit exceeded
        const allowed = entry.count < config.maxRequests;
        if (allowed) {
            entry.count++;
        }
        else {
            this.stats.blockedRequests++;
            this.stats.byCategory[category].blocked++;
        }
        const resetTime = entry.windowStart + config.windowMs;
        const retryAfter = allowed ? undefined : Math.ceil((resetTime - now) / 1000);
        return {
            allowed,
            remaining: Math.max(0, config.maxRequests - entry.count),
            resetTime,
            retryAfter,
            limit: config.maxRequests,
            current: entry.count
        };
    }
    /**
     * Reset rate limits for a specific key
     * @param key Rate limit key to reset
     */
    resetLimits(key) {
        this.store.delete(key);
    }
    /**
     * Reset all rate limits
     */
    resetAllLimits() {
        this.store.clear();
    }
    /**
     * Get rate limiter statistics
     * @returns Current statistics
     */
    getStats() {
        this.stats.activeEntries = this.store.size;
        this.stats.timestamp = Date.now();
        return { ...this.stats };
    }
    /**
     * Get current entries count
     * @returns Number of active rate limit entries
     */
    getActiveEntries() {
        return this.store.size;
    }
    /**
     * Check if a key is currently rate limited
     * @param key Rate limit key
     * @param category Request category
     * @returns Whether the key is rate limited
     */
    isRateLimited(key, category = RateLimitCategory.GENERAL) {
        const result = this.checkLimit(key, category);
        return !result.allowed;
    }
    /**
     * Get remaining requests for a key
     * @param key Rate limit key
     * @param category Request category
     * @returns Number of remaining requests
     */
    getRemainingRequests(key, category = RateLimitCategory.GENERAL) {
        const result = this.checkLimit(key, category);
        return result.remaining;
    }
    /**
     * Start cleanup interval to remove expired entries
     */
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Cleanup every minute
    }
    /**
     * Stop cleanup interval
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    /**
     * Remove expired rate limit entries
     */
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, entry] of this.store.entries()) {
            // Remove entries older than the longest window
            const maxWindow = Math.max(this.config.windowMs, ...Array.from(this.categoryConfigs.values()).map(c => c.windowMs));
            if (entry.windowStart < now - maxWindow) {
                expiredKeys.push(key);
            }
        }
        expiredKeys.forEach(key => this.store.delete(key));
    }
}
/**
 * Resource Limiter Class
 * Manages system resource limits
 */
export class ResourceLimiter {
    constructor(config) {
        this.activeBrowsers = 0;
        this.config = config;
    }
    /**
     * Check if browser instance can be created
     * @returns Whether browser creation is allowed
     */
    canCreateBrowser() {
        return this.activeBrowsers < this.config.maxBrowsers;
    }
    /**
     * Register a new browser instance
     */
    registerBrowser() {
        this.activeBrowsers++;
    }
    /**
     * Unregister a browser instance
     */
    unregisterBrowser() {
        this.activeBrowsers = Math.max(0, this.activeBrowsers - 1);
    }
    /**
     * Get current browser count
     */
    getActiveBrowserCount() {
        return this.activeBrowsers;
    }
    /**
     * Check current memory usage
     * @returns Whether memory usage is within limits
     */
    checkMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        return memoryUsage.heapUsed < this.config.maxMemoryUsage;
    }
    /**
     * Get current memory usage percentage
     * @returns Memory usage as percentage of limit
     */
    getMemoryUsagePercent() {
        const memoryUsage = process.memoryUsage();
        return (memoryUsage.heapUsed / this.config.maxMemoryUsage) * 100;
    }
}
