import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { MonitoringSystem } from "./monitoring/index.js";
export declare function setupRequestHandlers(server: Server, tools: Tool[], monitoringSystem?: MonitoringSystem): void;
