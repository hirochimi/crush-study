import express from 'express';
/**
 * System Monitoring Class
 * Tracks performance metrics and system health
 */
export class MonitoringSystem {
    constructor(config) {
        this.requestHistory = [];
        this.config = config;
        this.startTime = Date.now();
        this.metrics = {
            requestCount: 0,
            errorCount: 0,
            averageResponseTime: 0,
            activeBrowsers: 0,
            memoryUsage: 0,
            uptime: 0,
            activeConnections: 0,
            rateLimitViolations: 0
        };
    }
    /**
     * Record a request for metrics tracking
     * @param duration Request duration in milliseconds
     * @param success Whether the request was successful
     * @param category Optional request category
     */
    recordRequest(duration, success, category) {
        const requestMetric = {
            duration,
            success,
            timestamp: Date.now(),
            category
        };
        this.requestHistory.push(requestMetric);
        this.metrics.requestCount++;
        if (!success) {
            this.metrics.errorCount++;
        }
        // Keep only recent requests for average calculation (last 1000)
        if (this.requestHistory.length > 1000) {
            this.requestHistory = this.requestHistory.slice(-1000);
        }
        this.updateAverageResponseTime();
    }
    /**
     * Record a rate limit violation
     */
    recordRateLimitViolation() {
        this.metrics.rateLimitViolations++;
    }
    /**
     * Update active browser count
     * @param count Current number of active browsers
     */
    updateActiveBrowsers(count) {
        this.metrics.activeBrowsers = count;
    }
    /**
     * Update active connections count
     * @param count Current number of active SSE connections
     */
    updateActiveConnections(count) {
        this.metrics.activeConnections = count;
    }
    /**
     * Get current system metrics
     * @returns Current metrics snapshot
     */
    getMetrics() {
        this.updateSystemMetrics();
        return { ...this.metrics };
    }
    /**
     * Get system health status
     * @returns Current health status
     */
    getHealthStatus() {
        const checks = {};
        // Memory check
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        checks.memory = {
            status: memoryUsagePercent > this.config.memoryThreshold ? 'warn' : 'pass',
            description: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
            data: { memoryUsage, threshold: this.config.memoryThreshold }
        };
        // Response time check
        const avgResponseTime = this.metrics.averageResponseTime;
        checks.responseTime = {
            status: avgResponseTime > this.config.responseTimeThreshold ? 'warn' : 'pass',
            description: `Average response time: ${avgResponseTime.toFixed(2)}ms`,
            data: { averageResponseTime: avgResponseTime, threshold: this.config.responseTimeThreshold }
        };
        // Error rate check
        const errorRate = this.metrics.requestCount > 0 ? (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0;
        checks.errorRate = {
            status: errorRate > 10 ? 'warn' : errorRate > 5 ? 'warn' : 'pass',
            description: `Error rate: ${errorRate.toFixed(2)}%`,
            data: { errorRate, errorCount: this.metrics.errorCount, requestCount: this.metrics.requestCount }
        };
        // Overall status
        const hasFailures = Object.values(checks).some(check => check.status === 'fail');
        const hasWarnings = Object.values(checks).some(check => check.status === 'warn');
        const status = hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';
        return {
            status,
            checks,
            timestamp: Date.now(),
            version: process.env.npm_package_version
        };
    }
    /**
     * Start metrics collection and HTTP server for health checks
     * @param port Optional port for HTTP server (default: 3001)
     */
    async startMetricsCollection(port = 3001) {
        if (!this.config.enabled)
            return;
        this.metricsInterval = setInterval(() => {
            this.updateSystemMetrics();
        }, this.config.metricsInterval);
        this.healthCheckInterval = setInterval(() => {
            // Health checks are performed on-demand via getHealthStatus()
            // This interval can be used for proactive health monitoring
        }, this.config.healthCheckInterval);
        // Start HTTP server for health check endpoints
        await this.startHttpServer(port);
    }
    /**
     * Start HTTP server for health check endpoints
     * @param port Port to listen on
     */
    async startHttpServer(port) {
        this.app = express();
        this.app.use(express.json());
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const healthStatus = this.getHealthStatus();
            const statusCode = healthStatus.status === 'healthy' ? 200 :
                healthStatus.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(healthStatus);
        });
        // Metrics endpoint
        this.app.get('/metrics', (req, res) => {
            const metrics = this.getMetrics();
            res.json(metrics);
        });
        // Ready endpoint (simple health check)
        this.app.get('/ready', (req, res) => {
            res.json({ status: 'ready', timestamp: Date.now() });
        });
        return new Promise((resolve, reject) => {
            this.httpServer = this.app.listen(port, () => {
                // Get the actual port assigned (important when using port 0 for dynamic allocation)
                const address = this.httpServer.address();
                this.actualPort = typeof address === 'object' && address !== null ? address.port : port;
                console.log(`Monitoring HTTP server listening on port ${this.actualPort}`);
                console.log(`Health check: http://localhost:${this.actualPort}/health`);
                console.log(`Metrics: http://localhost:${this.actualPort}/metrics`);
                resolve();
            });
            this.httpServer.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Stop metrics collection and HTTP server
     */
    async stopMetricsCollection() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = undefined;
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
        if (this.httpServer) {
            return new Promise((resolve) => {
                this.httpServer.close(() => {
                    console.log('Monitoring HTTP server stopped');
                    resolve();
                });
            });
        }
    }
    /**
     * Update system-level metrics
     */
    updateSystemMetrics() {
        this.metrics.uptime = Date.now() - this.startTime;
        this.metrics.memoryUsage = process.memoryUsage().heapUsed;
    }
    /**
     * Update average response time based on recent requests
     */
    updateAverageResponseTime() {
        if (this.requestHistory.length === 0) {
            this.metrics.averageResponseTime = 0;
            return;
        }
        const totalTime = this.requestHistory.reduce((sum, req) => sum + req.duration, 0);
        this.metrics.averageResponseTime = totalTime / this.requestHistory.length;
    }
    /**
     * Get the actual port the monitoring server is listening on
     * @returns The port number, or undefined if server not started
     */
    getMonitoringPort() {
        return this.actualPort;
    }
}
