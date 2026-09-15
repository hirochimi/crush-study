/**
 * Server-Sent Events Server Class
 * Handles real-time event streaming to connected clients
 */
export class SSEServer {
    constructor(config) {
        this.clients = new Map();
        this.config = config;
    }
    /**
     * Start the SSE server
     * @param config Server configuration
     * @returns Promise resolving to the actual port number used
     */
    async start(config) {
        this.config = { ...this.config, ...config };
        // Implementation will be added in later tasks
        throw new Error('SSEServer.start() implementation pending');
    }
    /**
     * Broadcast an event to all connected clients
     * @param event Event to broadcast
     */
    broadcast(event) {
        // Implementation will be added in later tasks
        throw new Error('SSEServer.broadcast() implementation pending');
    }
    /**
     * Send an event to a specific client
     * @param clientId Target client ID
     * @param event Event to send
     */
    sendToClient(clientId, event) {
        // Implementation will be added in later tasks
        throw new Error('SSEServer.sendToClient() implementation pending');
    }
    /**
     * Get list of connected client IDs
     * @returns Array of client IDs
     */
    getConnectedClients() {
        return Array.from(this.clients.keys());
    }
    /**
     * Stop the SSE server and cleanup resources
     */
    async stop() {
        // Implementation will be added in later tasks
        throw new Error('SSEServer.stop() implementation pending');
    }
    /**
     * Get the actual port the server is running on
     */
    getPort() {
        return this.actualPort;
    }
    /**
     * Get connected clients count
     */
    getClientCount() {
        return this.clients.size;
    }
}
