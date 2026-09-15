import { MonitoringConfig, Metrics, HealthStatus } from './types';
/**
 * System Monitoring Class
 * Tracks performance metrics and system health
 */
export declare class MonitoringSystem {
    private config;
    private metrics;
    private requestHistory;
    private startTime;
    private metricsInterval?;
    private healthCheckInterval?;
    private httpServer?;
    private app?;
    private actualPort?;
    constructor(config: MonitoringConfig);
    /**
     * Record a request for metrics tracking
     * @param duration Request duration in milliseconds
     * @param success Whether the request was successful
     * @param category Optional request category
     */
    recordRequest(duration: number, success: boolean, category?: string): void;
    /**
     * Record a rate limit violation
     */
    recordRateLimitViolation(): void;
    /**
     * Update active browser count
     * @param count Current number of active browsers
     */
    updateActiveBrowsers(count: number): void;
    /**
     * Update active connections count
     * @param count Current number of active SSE connections
     */
    updateActiveConnections(count: number): void;
    /**
     * Get current system metrics
     * @returns Current metrics snapshot
     */
    getMetrics(): Metrics;
    /**
     * Get system health status
     * @returns Current health status
     */
    getHealthStatus(): HealthStatus;
    /**
     * Start metrics collection and HTTP server for health checks
     * @param port Optional port for HTTP server (default: 3001)
     */
    startMetricsCollection(port?: number): Promise<void>;
    /**
     * Start HTTP server for health check endpoints
     * @param port Port to listen on
     */
    private startHttpServer;
    /**
     * Stop metrics collection and HTTP server
     */
    stopMetricsCollection(): Promise<void>;
    /**
     * Update system-level metrics
     */
    private updateSystemMetrics;
    /**
     * Update average response time based on recent requests
     */
    private updateAverageResponseTime;
    /**
     * Get the actual port the monitoring server is listening on
     * @returns The port number, or undefined if server not started
     */
    getMonitoringPort(): number | undefined;
}
