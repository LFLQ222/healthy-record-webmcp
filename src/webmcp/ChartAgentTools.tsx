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
  getEvolutionNote,
  getPatientLabResults,
  listEvolutionNotes,
  listPatientVitals,
  normalizeAnalyte,
  type CreateEvolutionNoteInput,
  type LabResult,
} from '../services/ehrService';
import type { VitalMetricKey } from '../components/patient/vitalMetrics';
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

const normalizeText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Friendly names (English and Spanish) → the vital-history metric to plot.
const VITAL_ALIASES: Array<{ match: string[]; key: VitalMetricKey; label: string; unit?: string }> = [
  { match: ['weight', 'peso'], key: 'weightKg', label: 'Peso', unit: 'kg' },
  { match: ['bmi', 'imc', 'masa corporal'], key: 'bmi', label: 'IMC' },
  { match: ['diastol'], key: 'diastole', label: 'TA diastólica', unit: 'mmHg' },
  { match: ['blood pressure', 'presion', 'systol', 'sistol', 'ta '], key: 'systole', label: 'TA sistólica', unit: 'mmHg' },
  { match: ['heart', 'cardiaca', 'pulse', 'pulso', 'fc'], key: 'heartRate', label: 'Frecuencia cardiaca', unit: 'lpm' },
  { match: ['temp'], key: 'temperatureC', label: 'Temperatura', unit: '°C' },
  { match: ['oxygen', 'spo2', 'satur', 'sato2'], key: 'oxygenSaturationPct', label: 'SatO₂', unit: '%' },
  { match: ['respirator', 'respiratoria', 'fr'], key: 'respRate', label: 'Frecuencia respiratoria', unit: 'rpm' },
];

export function ChartAgentTools({ patientId, patientName, onNavigateSection }: Props) {
  const { openAnalyteGraph, openVitalGraph } = useAnalyteGraph();
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
        name: 'read_notes',
        description:
          `Reads the clinical evolution notes (SOAP) of the open chart, newest first, including their status (DRAFT/SIGNED/AMENDED) — and navigates the Notes section into view. Use it to know what the physician has written and when (e.g. when a finding was first mentioned). Note bodies are free-text clinical Spanish. Optionally pass a noteId for one note, or a limit.${forPatient}`,
        inputSchema: {
          type: 'object',
          properties: {
            noteId: { type: 'string', description: 'Read a single note by id' },
            limit: { type: 'number', description: 'How many recent notes to return (default 6, max 20)' },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (params) => {
          onNavigateSection('notes');
          const pickFields = (n: Awaited<ReturnType<typeof getEvolutionNote>>) => ({
            id: n.id,
            title: n.title,
            status: n.status,
            date: n.createdAt.slice(0, 10),
            signedAt: n.signedAt ? n.signedAt.slice(0, 10) : null,
            subjective: n.subjective,
            objective: n.objective,
            assessment: n.assessment,
            plan: n.plan,
            diagnoses: n.diagnoses ?? [],
          });
          if (typeof params.noteId === 'string' && params.noteId) {
            return pickFields(await getEvolutionNote(params.noteId));
          }
          const list = await listEvolutionNotes(patientId);
          const limit =
            typeof params.limit === 'number' && params.limit > 0 ? Math.min(Math.floor(params.limit), 20) : 6;
          const full = await Promise.all(list.slice(0, limit).map((n) => getEvolutionNote(n.id)));
          return { totalNotes: list.length, returned: full.length, notes: full.map(pickFields) };
        },
      },
      {
        name: 'plot_lab_trend',
        description:
          `Plots the historical trend of one LABORATORY analyte (blood/urine chemistry) ON SCREEN in the open patient chart — the physician sees the chart navigate to the Laboratory section and the trend dialog open with the series and its normal-range band. Also returns the series data. Accepts Spanish or English analyte names (e.g. "creatinina", "creatinine", "glucosa", "HbA1c", "urea"). For VITAL SIGNS (blood pressure, weight, heart rate) use plot_vital_trend instead.${forPatient}`,
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
        name: 'plot_vital_trend',
        description:
          `Plots the historical trend of one VITAL SIGN on screen in the open patient chart — navigates to the Vital signs section and opens the trend dialog. Metrics: weight, BMI, blood pressure (systolic/diastolic), heart rate, temperature, oxygen saturation, respiratory rate (English or Spanish). For LABORATORY analytes (creatinine, glucose, HbA1c…) use plot_lab_trend instead.${forPatient}`,
        inputSchema: {
          type: 'object',
          properties: {
            metric: {
              type: 'string',
              description: 'Vital sign to plot, e.g. "blood pressure", "weight", "peso", "heart rate", "SpO2"',
            },
          },
          required: ['metric'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async (params) => {
          const q = normalizeText(String(params.metric ?? ''));
          const alias = VITAL_ALIASES.find((a) => a.match.some((m) => q.includes(m) || m.includes(q)));
          if (!q || !alias) {
            return {
              plotted: false,
              error: `Unknown vital sign "${params.metric}".`,
              availableMetrics: VITAL_ALIASES.map((a) => a.label),
            };
          }
          onNavigateSection('vitals');
          await wait(350);
          await openVitalGraph(alias.key, alias.label, alias.unit);
          const vitals = await listPatientVitals(patientId, {});
          const points = vitals
            .map((v) => ({
              date: ((v.recordedAt ?? v.createdAt) as string).slice(0, 10),
              value: (v as unknown as Record<string, number | null>)[alias.key],
            }))
            .filter((p) => p.value != null)
            .reverse();
          return {
            plotted: true,
            metric: alias.label,
            unit: alias.unit,
            points,
            note: 'The vital-sign trend dialog is now open on the physician’s screen.',
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
  }, [patientId, patientName, onNavigateSection, openAnalyteGraph, openVitalGraph, queryClient]);

  useWebMcpTools(tools);
  return null;
}
