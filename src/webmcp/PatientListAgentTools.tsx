/**
 * List-scoped WebMCP tools — what the agent can do while the physician is on
 * the patient list. Opening a chart unmounts these and mounts the
 * chart-scoped set: the toolset follows the UI context (`toolchange`).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { listMyPatients } from '../services/ehrService';
import type { WebMcpTool } from './modelContext';
import { useWebMcpTools } from './useWebMcpTools';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function PatientListAgentTools() {
  const navigate = useNavigate();

  const tools = React.useMemo<WebMcpTool[]>(
    () => [
      {
        name: 'list_patients',
        description:
          "Lists the physician's patients (id, full name, age, sex). Use it to find a patient before opening their chart with open_patient_chart.",
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => {
          const patients = await listMyPatients();
          return patients.map((p) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            age: p.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth as string), 'year') : null,
            sex: p.gender ?? null,
          }));
        },
      },
      {
        name: 'open_patient_chart',
        description:
          'Opens a patient chart on the physician’s screen by patient id or (partial) name. Opening the chart REPLACES these tools with chart-scoped tools (get_chart_summary, plot_lab_trend, draft_note).',
        inputSchema: {
          type: 'object',
          properties: {
            patient: { type: 'string', description: 'Patient id (e.g. "pat-001") or full/partial name' },
          },
          required: ['patient'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async (params) => {
          const query = String(params.patient ?? '').trim();
          if (!query) return { error: 'patient is required' };
          const patients = await listMyPatients();
          const q = norm(query);
          const matches = patients.filter(
            (p) => p.id === query || norm(`${p.firstName} ${p.lastName}`).includes(q),
          );
          if (!matches.length) {
            return { opened: false, error: `No patient matches "${query}".` };
          }
          if (matches.length > 1) {
            return {
              opened: false,
              error: 'Ambiguous name — more than one patient matches.',
              candidates: matches.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })),
            };
          }
          const p = matches[0];
          navigate(`/pacientes/${p.id}`, { state: p });
          return {
            opened: true,
            patientId: p.id,
            name: `${p.firstName} ${p.lastName}`,
            note: 'Chart is opening on screen; chart-scoped tools are replacing the list tools.',
          };
        },
      },
    ],
    [navigate],
  );

  useWebMcpTools(tools);
  return null;
}
