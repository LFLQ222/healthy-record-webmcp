/**
 * Minimal typings for the WebMCP imperative API (verified 2026-08-27 against
 * developer.chrome.com/docs/ai/webmcp/imperative-api and
 * learn.chatgpt.com/docs/webmcp):
 *
 *   await document.modelContext.registerTool(toolDefinition, { signal });
 *   controller.abort();               // unregisters the tool
 *   execute(params, { signal })       // called by the agent
 *
 * We declare the surface by hand instead of depending on the `webmcp-types`
 * package: the standard is a week old and this keeps the demo's contract
 * pinned to what we verified.
 */

export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: WebMcpToolAnnotations;
  execute: (
    params: Record<string, unknown>,
    context: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown;
}

export interface ModelContext {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener?(type: 'toolchange', listener: (event: Event) => void): void;
  removeEventListener?(type: 'toolchange', listener: (event: Event) => void): void;
}

declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
}

/** Feature detection — the site must behave identically without WebMCP. */
export function getModelContext(): ModelContext | null {
  return typeof document !== 'undefined' && typeof document.modelContext?.registerTool === 'function'
    ? document.modelContext
    : null;
}
