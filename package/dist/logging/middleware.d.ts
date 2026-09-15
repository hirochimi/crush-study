import { Logger } from './logger';
/**
 * Request/Response Logging Middleware
 * Provides comprehensive logging for all MCP requests and responses
 */
export declare class RequestLoggingMiddleware {
    private logger;
    constructor(logger: Logger);
    /**
     * Generate unique request ID for tracing
     * @returns Unique request identifier
     */
    generateRequestId(): string;
    /**
     * Wrap a request handler with logging middleware
     * @param handlerName Name of the handler for logging
     * @param handler Original handler function
     * @returns Wrapped handler with logging
     */
    wrapHandler<T, R>(handlerName: string, handler: (request: T) => Promise<R>): (request: T) => Promise<R>;
    /**
     * Wrap tool call handler with enhanced logging
     * @param handler Original tool call handler
     * @returns Wrapped handler with tool-specific logging
     */
    wrapToolHandler(handler: (name: string, args: any, server: any) => Promise<any>): (name: string, args: any, server: any) => Promise<any>;
    /**
     * Sanitize request body for logging (remove sensitive data)
     * @param request Request object
     * @returns Sanitized request data
     */
    private sanitizeRequestBody;
    /**
     * Sanitize tool arguments for logging
     * @param toolName Tool name
     * @param args Tool arguments
     * @returns Sanitized arguments
     */
    private sanitizeToolArgs;
    /**
     * Extract client information from request
     * @param request Request object
     * @returns Client IP or identifier
     */
    private extractClientInfo;
    /**
     * Categorize errors for better logging
     * @param error Error object
     * @returns Error category
     */
    private categorizeError;
    /**
     * Categorize tool-specific errors
     * @param toolName Tool name
     * @param error Error object
     * @returns Error category
     */
    private categorizeToolError;
    /**
     * Capture enhanced error context
     * @param error Error object
     * @param toolName Optional tool name
     * @param args Optional tool arguments
     * @returns Enhanced error context
     */
    captureErrorContext(error: Error, toolName?: string, args?: any): Record<string, any>;
    /**
     * Capture browser-specific error context
     * @param error Error object
     * @returns Browser context information
     */
    private captureBrowserContext;
    /**
     * Log system startup information
     * @param serverInfo Server information
     */
    logServerStartup(serverInfo: {
        name: string;
        version: string;
        capabilities: any;
    }): void;
    /**
     * Log system shutdown information
     */
    logServerShutdown(): void;
}
