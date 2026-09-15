/**
 * SSE Event Types Enumeration
 */
export var SSEEventType;
(function (SSEEventType) {
    SSEEventType["BROWSER_LAUNCHED"] = "browser.launched";
    SSEEventType["BROWSER_CLOSED"] = "browser.closed";
    SSEEventType["NAVIGATION_START"] = "navigation.start";
    SSEEventType["NAVIGATION_COMPLETE"] = "navigation.complete";
    SSEEventType["TOOL_EXECUTION_START"] = "tool.execution.start";
    SSEEventType["TOOL_EXECUTION_COMPLETE"] = "tool.execution.complete";
    SSEEventType["ERROR_OCCURRED"] = "error.occurred";
    SSEEventType["SYSTEM_STATUS"] = "system.status";
    SSEEventType["RATE_LIMIT_EXCEEDED"] = "rate_limit.exceeded";
})(SSEEventType || (SSEEventType = {}));
