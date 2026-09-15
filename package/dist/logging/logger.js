import * as fs from 'fs';
import * as path from 'path';
/**
 * Structured Logger Class
 * Provides comprehensive logging with multiple levels and outputs
 */
export class Logger {
    constructor(config) {
        this.config = config;
        this.ensureLogDirectory();
    }
    /**
     * Get singleton logger instance
     * @param config Logger configuration (only used on first call)
     * @returns Logger instance
     */
    static getInstance(config) {
        if (!Logger.instance) {
            if (!config) {
                throw new Error('Logger configuration required for first initialization');
            }
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }
    /**
     * Create default logger configuration
     * @returns Default configuration
     */
    static createDefaultConfig() {
        return {
            level: process.env.LOG_LEVEL || 'info',
            format: process.env.LOG_FORMAT || 'json',
            outputs: process.env.LOG_OUTPUTS ? process.env.LOG_OUTPUTS.split(',') : ['console'],
            filePath: process.env.LOG_FILE_PATH || './logs/mcp-server.log',
            maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
            maxFiles: parseInt(process.env.LOG_MAX_FILES || '5')
        };
    }
    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (this.config.outputs.includes('file') && this.config.filePath) {
            const logDir = path.dirname(this.config.filePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }
    /**
     * Set request ID for request tracing
     * @param requestId Request identifier
     */
    setRequestId(requestId) {
        this.requestId = requestId;
    }
    /**
     * Clear request ID
     */
    clearRequestId() {
        this.requestId = undefined;
    }
    /**
     * Log debug message
     * @param message Log message
     * @param context Additional context
     */
    debug(message, context) {
        this.log('debug', message, context);
    }
    /**
     * Log info message
     * @param message Log message
     * @param context Additional context
     */
    info(message, context) {
        this.log('info', message, context);
    }
    /**
     * Log warning message
     * @param message Log message
     * @param context Additional context
     */
    warn(message, context) {
        this.log('warn', message, context);
    }
    /**
     * Log error message
     * @param message Log message
     * @param error Optional error object
     * @param context Additional context
     */
    error(message, error, context) {
        const errorContext = {
            ...context,
            ...(error && {
                errorName: error.name,
                errorMessage: error.message,
                stack: error.stack
            })
        };
        this.log('error', message, errorContext);
    }
    /**
     * Log request details
     * @param message Log message
     * @param requestContext Request context
     */
    logRequest(message, requestContext) {
        this.info(message, requestContext);
    }
    /**
     * Log error with detailed context
     * @param message Error message
     * @param error Error object
     * @param errorContext Error context
     */
    logError(message, error, errorContext) {
        const context = {
            ...errorContext,
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack
        };
        this.log('error', message, context);
    }
    /**
     * Core logging method
     * @param level Log level
     * @param message Log message
     * @param context Additional context
     */
    log(level, message, context) {
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            requestId: this.requestId
        };
        const formattedMessage = this.formatLogEntry(entry);
        // Output to configured destinations
        this.config.outputs.forEach(output => {
            switch (output) {
                case 'console':
                    this.writeToConsole(level, formattedMessage);
                    break;
                case 'file':
                    this.writeToFile(formattedMessage);
                    break;
            }
        });
    }
    /**
     * Format log entry based on configuration
     * @param entry Log entry
     * @returns Formatted string
     */
    formatLogEntry(entry) {
        if (this.config.format === 'json') {
            return JSON.stringify(entry);
        }
        else {
            // Text format: [timestamp] [level] message [context]
            const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
            const requestIdStr = entry.requestId ? ` [req:${entry.requestId}]` : '';
            return `[${entry.timestamp}] [${entry.level.toUpperCase()}]${requestIdStr} ${entry.message}${contextStr}`;
        }
    }
    /**
     * Write to console with appropriate method
     * @param level Log level
     * @param message Formatted message
     */
    writeToConsole(level, message) {
        switch (level) {
            case 'debug':
                console.debug(message);
                break;
            case 'info':
                console.info(message);
                break;
            case 'warn':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
        }
    }
    /**
     * Write to file with rotation support
     * @param message Formatted message
     */
    writeToFile(message) {
        if (!this.config.filePath) {
            return;
        }
        try {
            // Check if file rotation is needed
            if (this.shouldRotateFile()) {
                this.rotateLogFile();
            }
            // Append to log file
            fs.appendFileSync(this.config.filePath, message + '\n', 'utf8');
        }
        catch (error) {
            // Fallback to console if file writing fails
            console.error('Failed to write to log file:', error);
            console.log(message);
        }
    }
    /**
     * Check if log file should be rotated
     * @returns Whether rotation is needed
     */
    shouldRotateFile() {
        if (!this.config.filePath || !this.config.maxFileSize) {
            return false;
        }
        try {
            const stats = fs.statSync(this.config.filePath);
            return stats.size >= this.config.maxFileSize;
        }
        catch {
            return false;
        }
    }
    /**
     * Rotate log file
     */
    rotateLogFile() {
        if (!this.config.filePath || !this.config.maxFiles) {
            return;
        }
        try {
            const logDir = path.dirname(this.config.filePath);
            const logName = path.basename(this.config.filePath, path.extname(this.config.filePath));
            const logExt = path.extname(this.config.filePath);
            // Rotate existing files
            for (let i = this.config.maxFiles - 1; i >= 1; i--) {
                const oldFile = path.join(logDir, `${logName}.${i}${logExt}`);
                const newFile = path.join(logDir, `${logName}.${i + 1}${logExt}`);
                if (fs.existsSync(oldFile)) {
                    if (i === this.config.maxFiles - 1) {
                        fs.unlinkSync(oldFile); // Delete oldest file
                    }
                    else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }
            // Move current file to .1
            const rotatedFile = path.join(logDir, `${logName}.1${logExt}`);
            if (fs.existsSync(this.config.filePath)) {
                fs.renameSync(this.config.filePath, rotatedFile);
            }
        }
        catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }
    /**
     * Check if message should be logged based on configured level
     * @param level Message level
     * @returns Whether to log the message
     */
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const configLevel = levels.indexOf(this.config.level);
        const messageLevel = levels.indexOf(level);
        return messageLevel >= configLevel;
    }
}
