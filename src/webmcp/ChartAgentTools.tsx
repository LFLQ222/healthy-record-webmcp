/**
 * Chart-scoped WebMCP tools. Mounted INSIDE the open chart's
 * AnalyteGraphProvider, so tools exist exactly while a chart is open and can
 * drive the same UI mechanisms the physician uses:
 *
 *   - get_chart_summary  → structured deltas since the previous visit
 *   - plot_lab_trend     → jumps to Labs and opens the trend dialog on screen
 *   - draft_note         → creates a DRAFT the physician must sign in the UI
 *
 * Headless component: renders nothing.
 */
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAnalyteGraph } from '../components/patient/AnalyteGraphProvider';
import {
  createDraftNote,
  getAnalyteHistory,
  getPatientLabResults,
  normalizeAnalyte,
  type CreateEvolutionNoteInput,
  type LabResult,
} from '../services/ehrService';
import { setAgentHighlights } from './agentHighlights';
import { buildChartDelta } from './chartSummary';
import type { WebMcpTool } from './modelContext';
import { useWebMcpTools } from './useWebMcpTools';

interface Props {
  patientId: string;
  patientName: string | null;
  onNavigateSection: (section: string) => void;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ChartAgentTools({ patientId, patientName, onNavigateSection }: Props) {
  const { openAnalyteGraph } = useAnalyteGraph();
  const queryClient = useQueryClient();

  const tools = React.useMemo<WebMcpTool[]>(() => {
    const forPatient = patientName ? ` The open chart belongs to ${patientName}.` : '';
    return [
      {
        name: 'get_chart_summary',
        description:
          `Structured summary of the OPEN patient chart focused on what changed since the previous visit: new lab results with prior values and deltas, values that crossed out of their reference range, vital-sign changes, medication changes, active problems (ICD-10) and alerts. Call this first to understand the chart. Returns data, not prose.${forPatient}`,
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => buildChartDelta(patientId),
      },
      {
        name: 'plot_lab_trend',
        description:
          `Plots the historical trend of one lab analyte ON SCREEN in the open patient chart — the physician sees the chart navigate to the Laboratory section and the trend dialog open with the series and its normal-range band. Also returns the series data. Accepts Spanish or English analyte names (e.g. "creatinina", "creatinine", "glucosa", "HbA1c", "urea").${forPatient}`,
        inputSchema: {
          type: 'object',
          properties: {
            analyte: {
              type: 'string',
              description: 'Analyte to plot, e.g. "creatinina" / "creatinine" / "HbA1c" / "glucosa"',
            },
          },
          required: ['analyte'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async (params) => {
          const analyte = String(params.analyte ?? '').trim();
          if (!analyte) return { error: 'analyte is required' };
          // Move the physician's screen first: this tool is about showing.
          onNavigateSection('labs');
          const history = await getAnalyteHistory(patientId, analyte);
          if (!history) {
            const rows = await getPatientLabResults(patientId);
            return {
              plotted: false,
              error: `No measurements found for "${analyte}" in this chart.`,
              availableAnalytes: [...new Set(rows.map((r) => r.analyteName))],
            };
          }
          await wait(350); // let the section render before the dialog opens over it
          openAnalyteGraph(history.analyteNormalized, history.analyteName);
          const outOfRange = history.dataPoints.filter((p) => p.status === 'high' || p.status === 'low');
          return {
            plotted: true,
            analyte: history.analyteName,
            unit: history.unit,
            points: history.dataPoints.map((p) => ({
              date: p.date.slice(0, 10),
              value: p.value,
              status: p.status,
              refLow: p.refLow,
              refHigh: p.refHigh,
            })),
            outOfRangeCount: outOfRange.length,
            note: 'The trend dialog is now open on the physician’s screen.',
          };
        },
      },
      {
        name: 'highlight_findings',
        description:
          `Visually highlights lab values in the open chart's Laboratory section — the marked analyte cards pulse on the physician's screen for ~15 seconds. With no arguments it highlights every analyte whose LATEST value is out of range; optionally pass specific analyte names (Spanish or English). Purely visual, changes nothing.${forPatient}`,
        inputSchema: {
          type: 'object',
          properties: {
            analytes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: specific analytes to highlight, e.g. ["creatinina", "urea"]. Omit to highlight everything currently out of range.',
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async (params) => {
          onNavigateSection('labs');
          const rows = await getPatientLabResults(patientId);
          // Latest measurement per analyte — the value the grid is showing.
          const latest = new Map<string, LabResult>();
          for (const r of [...rows].sort((a, b) => (a.studyDate ?? '').localeCompare(b.studyDate ?? ''))) {
            latest.set(r.analyteNormalized, r);
          }
          let keys: string[];
          if (Array.isArray(params.analytes) && params.analytes.length) {
            const wanted = params.analytes.map((a) => normalizeAnalyte(String(a)));
            keys = [...latest.keys()].filter((k) => wanted.some((w) => k === w || k.includes(w)));
          } else {
            keys = [...latest.entries()]
              .filter(([, r]) => r.status === 'high' || r.status === 'low' || r.status === 'positive')
              .map(([k]) => k);
          }
          await wait(350);
          setAgentHighlights(keys);
          const names = keys.map((k) => latest.get(k)?.analyteName ?? k);
          return {
            highlighted: names,
            count: names.length,
            note: 'The marked analyte cards are pulsing on the physician’s screen for about 15 seconds.',
          };
        },
      },
      {
        name: 'draft_note',
        description:
          `Creates a DRAFT SOAP evolution note in the open chart and shows it at the top of the Notes section, where the physician reviews it and presses "Sign" to make it part of the record. The draft is NOT part of the legal record until the physician signs it; this tool can never sign. Write the clinical content in Spanish (the chart's language).${forPatient}`,
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short note title, e.g. "Tendencia de creatinina — revisión"' },
            subjective: { type: 'string', description: 'S — what the patient reports / context' },
            objective: { type: 'string', description: 'O — findings and data (labs, vitals) supporting the note' },
            assessment: { type: 'string', description: 'A — clinical interpretation' },
            plan: { type: 'string', description: 'P — proposed plan for the physician to review' },
            diagnoses: { type: 'array', items: { type: 'string' }, description: 'Related diagnoses, e.g. "E11.9 — DM2"' },
            medications: { type: 'array', items: { type: 'string' } },
          },
          required: ['subjective', 'objective', 'assessment', 'plan'],
          additionalProperties: false,
        },
        execute: async (params) => {
          const input: CreateEvolutionNoteInput = {
            title: typeof params.title === 'string' ? params.title : undefined,
            subjective: String(params.subjective ?? ''),
            objective: String(params.objective ?? ''),
            assessment: String(params.assessment ?? ''),
            plan: String(params.plan ?? ''),
            diagnoses: Array.isArray(params.diagnoses) ? params.diagnoses.map(String) : undefined,
            medications: Array.isArray(params.medications) ? params.medications.map(String) : undefined,
          };
          const draft = await createDraftNote(patientId, input);
          onNavigateSection('notes');
          await queryClient.invalidateQueries({ queryKey: ['evolutionNotes', patientId] });
          return {
            draftCreated: true,
            noteId: draft.id,
            status: draft.status,
            requiresPhysicianSignature: true,
            message:
              'Draft created and visible at the top of the Notes section. The physician must review it and press "Sign" to add it to the record.',
          };
        },
      },
    ];
  }, [patientId, patientName, onNavigateSection, openAnalyteGraph, queryClient]);

  useWebMcpTools(tools);
  return null;
}
