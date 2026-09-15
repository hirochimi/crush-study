import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse } from '../common/types.js';
/**
 * Tool for resizing the browser viewport with device preset support
 */
export declare class ResizeTool extends BrowserToolBase {
    /**
     * Execute the resize tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
