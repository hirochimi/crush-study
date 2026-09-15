import { SSEServerConfig, SSEEvent } from './types';
/**
 * Server-Sent Events Server Class
 * Handles real-time event streaming to connected clients
 */
export declare class SSEServer {
    private config;
    private clients;
    private server;
    private actualPort?;
    constructor(config: SSEServerConfig);
    /**
     * Start the SSE server
     * @param config Server configuration
     * @returns Promise resolving to the actual port number used
     */
    start(config: SSEServerConfig): Promise<number>;
    /**
     * Broadcast an event to all connected clients
     * @param event Event to broadcast
     */
    broadcast(event: SSEEvent): void;
    /**
     * Send an event to a specific client
     * @param clientId Target client ID
     * @param event Event to send
     */
    sendToClient(clientId: string, event: SSEEvent): void;
    /**
     * Get list of connected client IDs
     * @returns Array of client IDs
     */
    getConnectedClients(): string[];
    /**
     * Stop the SSE server and cleanup resources
     */
    stop(): Promise<void>;
    /**
     * Get the actual port the server is running on
     */
    getPort(): number | undefined;
    /**
     * Get connected clients count
     */
    getClientCount(): number;
}
