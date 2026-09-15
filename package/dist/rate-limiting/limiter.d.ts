import { RateLimitConfig, RateLimitResult, RateLimitStats, ResourceLimitConfig } from './types';
/**
 * Rate Limiter Class
 * Implements request throttling and resource protection
 */
export declare class RateLimiter {
    private config;
    private store;
    private categoryConfigs;
    private stats;
    private cleanupInterval?;
    constructor(config: RateLimitConfig);
    /**
     * Set rate limit configuration for a specific category
     * @param category Rate limit category
     * @param config Category-specific configuration
     */
    setCategoryConfig(category: string, config: RateLimitConfig): void;
    /**
     * Check if request is within rate limits
     * @param key Rate limit key (usually IP or user ID)
     * @param category Request category
     * @returns Rate limit check result
     */
    checkLimit(key: string, category?: string): RateLimitResult;
    /**
     * Reset rate limits for a specific key
     * @param key Rate limit key to reset
     */
    resetLimits(key: string): void;
    /**
     * Reset all rate limits
     */
    resetAllLimits(): void;
    /**
     * Get rate limiter statistics
     * @returns Current statistics
     */
    getStats(): RateLimitStats;
    /**
     * Get current entries count
     * @returns Number of active rate limit entries
     */
    getActiveEntries(): number;
    /**
     * Check if a key is currently rate limited
     * @param key Rate limit key
     * @param category Request category
     * @returns Whether the key is rate limited
     */
    isRateLimited(key: string, category?: string): boolean;
    /**
     * Get remaining requests for a key
     * @param key Rate limit key
     * @param category Request category
     * @returns Number of remaining requests
     */
    getRemainingRequests(key: string, category?: string): number;
    /**
     * Start cleanup interval to remove expired entries
     */
    private startCleanup;
    /**
     * Stop cleanup interval
     */
    stopCleanup(): void;
    /**
     * Remove expired rate limit entries
     */
    private cleanup;
}
/**
 * Resource Limiter Class
 * Manages system resource limits
 */
export declare class ResourceLimiter {
    private config;
    private activeBrowsers;
    constructor(config: ResourceLimitConfig);
    /**
     * Check if browser instance can be created
     * @returns Whether browser creation is allowed
     */
    canCreateBrowser(): boolean;
    /**
     * Register a new browser instance
     */
    registerBrowser(): void;
    /**
     * Unregister a browser instance
     */
    unregisterBrowser(): void;
    /**
     * Get current browser count
     */
    getActiveBrowserCount(): number;
    /**
     * Check current memory usage
     * @returns Whether memory usage is within limits
     */
    checkMemoryUsage(): boolean;
    /**
     * Get current memory usage percentage
     * @returns Memory usage as percentage of limit
     */
    getMemoryUsagePercent(): number;
}
