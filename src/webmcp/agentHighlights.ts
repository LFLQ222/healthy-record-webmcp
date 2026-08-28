/**
 * Store behind the `highlight_findings` tool: the set of analytes (by
 * normalized key) currently pulsing in the Laboratory grid. Highlights
 * auto-expire so the chart never stays decorated after the moment passes.
 */
import React from 'react';

let highlighted: ReadonlySet<string> = new Set();
let clearTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setAgentHighlights(analyteNormalizedKeys: string[], ttlMs = 15000): void {
  highlighted = new Set(analyteNormalizedKeys);
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    highlighted = new Set();
    emit();
  }, ttlMs);
  emit();
}

export function clearAgentHighlights(): void {
  highlighted = new Set();
  if (clearTimer) clearTimeout(clearTimer);
  emit();
}

export function subscribeAgentHighlights(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAgentHighlights(): ReadonlySet<string> {
  return highlighted;
}

export function useAgentHighlights(): ReadonlySet<string> {
  return React.useSyncExternalStore(subscribeAgentHighlights, getAgentHighlights);
}
