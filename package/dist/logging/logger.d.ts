import { LoggerConfig, RequestLogContext, ErrorLogContext } from './types';
/**
 * Structured Logger Class
 * Provides comprehensive logging with multiple levels and outputs
 */
export declare class Logger {
    private config;
    private requestId?;
    private static instance;
    constructor(config: LoggerConfig);
    /**
     * Get singleton logger instance
     * @param config Logger configuration (only used on first call)
     * @returns Logger instance
     */
    static getInstance(config?: LoggerConfig): Logger;
    /**
     * Create default logger configuration
     * @returns Default configuration
     */
    static createDefaultConfig(): LoggerConfig;
    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory;
    /**
     * Set request ID for request tracing
     * @param requestId Request identifier
     */
    setRequestId(requestId: string): void;
    /**
     * Clear request ID
     */
    clearRequestId(): void;
    /**
     * Log debug message
     * @param message Log message
     * @param context Additional context
     */
    debug(message: string, context?: Record<string, any>): void;
    /**
     * Log info message
     * @param message Log message
     * @param context Additional context
     */
    info(message: string, context?: Record<string, any>): void;
    /**
     * Log warning message
     * @param message Log message
     * @param context Additional context
     */
    warn(message: string, context?: Record<string, any>): void;
    /**
     * Log error message
     * @param message Log message
     * @param error Optional error object
     * @param context Additional context
     */
    error(message: string, error?: Error, context?: Record<string, any>): void;
    /**
     * Log request details
     * @param message Log message
     * @param requestContext Request context
     */
    logRequest(message: string, requestContext: RequestLogContext): void;
    /**
     * Log error with detailed context
     * @param message Error message
     * @param error Error object
     * @param errorContext Error context
     */
    logError(message: string, error: Error, errorContext?: ErrorLogContext): void;
    /**
     * Core logging method
     * @param level Log level
     * @param message Log message
     * @param context Additional context
     */
    private log;
    /**
     * Format log entry based on configuration
     * @param entry Log entry
     * @returns Formatted string
     */
    private formatLogEntry;
    /**
     * Write to console with appropriate method
     * @param level Log level
     * @param message Formatted message
     */
    private writeToConsole;
    /**
     * Write to file with rotation support
     * @param message Formatted message
     */
    private writeToFile;
    /**
     * Check if log file should be rotated
     * @returns Whether rotation is needed
     */
    private shouldRotateFile;
    /**
     * Rotate log file
     */
    private rotateLogFile;
    /**
     * Check if message should be logged based on configured level
     * @param level Message level
     * @returns Whether to log the message
     */
    private shouldLog;
}
