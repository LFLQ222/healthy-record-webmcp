/**
 * useWebMcpTools — registers a set of WebMCP tools for as long as the calling
 * component is mounted.
 *
 * This is the load-bearing idea of the demo: tools are scoped to UI context.
 * The patient-list page exposes list/open tools; opening a chart swaps them
 * for chart-scoped tools; closing the chart aborts the controller and they
 * disappear (the browser fires `toolchange` for the agent). Registration is
 * per-mount via one AbortController, exactly as the imperative API intends.
 *
 * Progressive enhancement: with no `document.modelContext` the hook is a
 * no-op and the app behaves identically.
 */
import React from 'react';
import { getModelContext, type WebMcpTool } from './modelContext';

// Small external store so the header chip (and DEV console harness) can see
// which tools are currently live without prop-drilling.
const liveTools = new Map<string, WebMcpTool>();
const listeners = new Set<() => void>();
let snapshot: string[] = [];

function emit() {
  snapshot = [...liveTools.keys()];
  listeners.forEach((l) => l());
  if (import.meta.env.DEV) {
    // Manual harness for development: lets us exercise tool handlers without
    // an agent attached (the Model Context Tool Inspector covers the real
    // path). Not present in production builds.
    (window as unknown as Record<string, unknown>).__hrAgentTools = {
      names: snapshot,
      call: (name: string, params: Record<string, unknown> = {}) => {
        const tool = liveTools.get(name);
        if (!tool) throw new Error(`No live tool named ${name}. Live: ${snapshot.join(', ')}`);
        return tool.execute(params, {});
      },
    };
  }
}

export function subscribeAgentTools(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAgentToolNames(): string[] {
  return snapshot;
}

export function useWebMcpTools(tools: WebMcpTool[]): { supported: boolean; toolNames: string[] } {
  const supported = React.useMemo(() => !!getModelContext(), []);
  const toolNames = React.useSyncExternalStore(subscribeAgentTools, getAgentToolNames);

  React.useEffect(() => {
    if (!tools.length) return;
    const ctx = getModelContext();
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      for (const tool of tools) {
        if (cancelled) return;
        try {
          // Registration is what makes the tool visible to the agent; the
          // local map only powers the status chip / DEV harness.
          if (ctx) await ctx.registerTool(tool, { signal: controller.signal });
          liveTools.set(tool.name, tool);
        } catch (e) {
          console.warn('[webmcp] could not register tool', tool.name, e);
        }
      }
      emit();
    })();

    return () => {
      cancelled = true;
      controller.abort(); // unregisters every tool of this scope
      for (const tool of tools) liveTools.delete(tool.name);
      emit();
    };
  }, [tools]);

  return { supported, toolNames };
}
