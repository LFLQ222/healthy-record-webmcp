/**
 * The guided tour as a WebMCP tool — the onboarding itself is agent-native.
 * Registered in BOTH scopes (patient list and open chart), so "give me a
 * tour" works anywhere; the checklist then verifies each step as the agent
 * actually performs it.
 */
import type { WebMcpTool } from '../webmcp/modelContext';
import { setTourMode } from './tourState';

export function makeTourTool(): WebMcpTool {
  return {
    name: 'start_guided_tour',
    description:
      "Starts (or restarts) this demo's guided tour: a floating on-screen checklist that walks the user through the whole scenario — opening the index chart, asking about changes, plotting the buried creatinine trend, highlighting out-of-range values, drafting a note and having the physician sign it. The checklist verifies itself against real events, including this agent's own tool calls. Use whenever the user asks for a tour, tutorial, onboarding, or how to use this demo.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => {
      setTourMode('tutorial');
      return {
        started: true,
        steps: 7,
        note: 'The guided-tour panel is now on screen (bottom right). It will check steps off as they actually happen — including the tool calls you make. Tell the user to follow it.',
      };
    },
  };
}
