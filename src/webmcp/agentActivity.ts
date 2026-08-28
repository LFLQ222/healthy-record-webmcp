/**
 * Tiny store for the on-screen "agent is acting" pill. Every WebMCP tool
 * invocation publishes here (see useWebMcpTools), so viewers can always tell
 * WHO is driving the interface — attribution of agency is part of the trust
 * model, not decoration.
 */

export interface AgentActivity {
  id: number;
  message: string;
}

let current: AgentActivity | null = null;
let seq = 0;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function publishAgentActivity(message: string, ttlMs = 3800): void {
  current = { id: ++seq, message };
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    current = null;
    emit();
  }, ttlMs);
  emit();
}

export function subscribeAgentActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAgentActivity(): AgentActivity | null {
  return current;
}

/** Human-readable line for each tool invocation, shown in the pill. */
export function describeToolCall(toolName: string, params: Record<string, unknown>): string {
  switch (toolName) {
    case 'list_patients':
      return 'Agent: reading the patient list…';
    case 'open_patient_chart':
      return `Agent: opening ${typeof params.patient === 'string' ? `the chart for "${params.patient}"` : 'a patient chart'}…`;
    case 'get_chart_summary':
      return 'Agent: reviewing what changed since the last visit…';
    case 'plot_lab_trend':
      return `Agent: plotting the ${typeof params.analyte === 'string' ? params.analyte : 'lab'} trend…`;
    case 'highlight_findings':
      return 'Agent: highlighting out-of-range values…';
    case 'draft_note':
      return 'Agent: drafting a note for your review…';
    default:
      return `Agent: running ${toolName}…`;
  }
}
