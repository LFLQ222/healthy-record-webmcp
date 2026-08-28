/**
 * buildChartDelta — the payload behind the `get_chart_summary` tool.
 *
 * Structured data, not prose (the agent writes the prose): what changed since
 * the previous visit — new labs with their prior value and whether they
 * crossed out of range, vital-sign deltas, medication changes — plus the
 * standing problem list and alerts.
 */
import dayjs from 'dayjs';
import {
  getPatientLabResults,
  getPatientOverview,
  listEvolutionNotes,
  listPatientVitals,
  type LabResult,
} from '../services/ehrService';

interface LabDelta {
  analyte: string;
  studyDate: string;
  value: number | string;
  unit?: string;
  status: string;
  referenceRange?: string;
  previousValue?: number | string;
  previousDate?: string;
  changeVsPrevious?: string;
  crossedOutOfRange: boolean;
}

const val = (r: LabResult) => r.valueNumeric ?? r.valueText ?? '—';
const day = (iso?: string) => (iso ?? '').slice(0, 10);
const range = (r: LabResult) =>
  r.refLow != null || r.refHigh != null ? `${r.refLow ?? ''}–${r.refHigh ?? ''} ${r.unit ?? ''}`.trim() : r.refText ?? undefined;

export async function buildChartDelta(patientId: string) {
  const [overview, labs, vitals, notes] = await Promise.all([
    getPatientOverview(patientId),
    getPatientLabResults(patientId),
    listPatientVitals(patientId, { limit: 10 }),
    listEvolutionNotes(patientId),
  ]);

  // Visits = evolution-note dates. "Since the last visit" means everything
  // newer than the PREVIOUS visit, seen from the latest one.
  const visitDates = [...new Set(notes.map((n) => day(n.createdAt)))].sort().reverse();
  const currentVisit = visitDates[0] ?? null;
  const previousVisit = visitDates[1] ?? null;

  // Lab deltas: latest measurement per analyte if it is newer than the
  // previous visit, compared against the most recent measurement before it.
  const byAnalyte = new Map<string, LabResult[]>();
  for (const r of labs) {
    if (!r.studyDate) continue;
    byAnalyte.set(r.analyteNormalized, [...(byAnalyte.get(r.analyteNormalized) ?? []), r]);
  }
  const labChanges: LabDelta[] = [];
  for (const rows of byAnalyte.values()) {
    rows.sort((a, b) => (a.studyDate ?? '').localeCompare(b.studyDate ?? ''));
    const latest = rows[rows.length - 1];
    if (!previousVisit || day(latest.studyDate) <= previousVisit) continue;
    const prior = rows.length > 1 ? rows[rows.length - 2] : undefined;
    const numericDelta =
      latest.valueNumeric != null && prior?.valueNumeric != null
        ? latest.valueNumeric - prior.valueNumeric
        : null;
    const wasInRange = prior ? prior.status === 'normal' || prior.status === 'negative' : true;
    const isOutOfRange = latest.status === 'high' || latest.status === 'low' || latest.status === 'positive';
    labChanges.push({
      analyte: latest.analyteName,
      studyDate: day(latest.studyDate),
      value: val(latest),
      unit: latest.unit,
      status: latest.status,
      referenceRange: range(latest),
      previousValue: prior ? val(prior) : undefined,
      previousDate: prior ? day(prior.studyDate) : undefined,
      changeVsPrevious:
        numericDelta != null ? `${numericDelta > 0 ? '+' : ''}${Number(numericDelta.toFixed(2))}` : undefined,
      crossedOutOfRange: isOutOfRange && wasInRange,
    });
  }
  labChanges.sort((a, b) => Number(b.crossedOutOfRange) - Number(a.crossedOutOfRange));

  // Full series for anything that crossed out of range — the buried-trend
  // case is exactly why a single delta is not enough.
  const trendsWorthPlotting = labChanges
    .filter((c) => c.crossedOutOfRange || c.status === 'high' || c.status === 'low')
    .map((c) => c.analyte);

  const [latestVitals, previousVitals] = vitals;
  const vitalsDelta =
    latestVitals && previousVitals
      ? {
          date: day(latestVitals.recordedAt ?? latestVitals.createdAt),
          previousDate: day(previousVitals.recordedAt ?? previousVitals.createdAt),
          bloodPressure: `${latestVitals.systole}/${latestVitals.diastole} (prev ${previousVitals.systole}/${previousVitals.diastole})`,
          weightKg: `${latestVitals.weightKg} (prev ${previousVitals.weightKg})`,
          heartRate: latestVitals.heartRate,
        }
      : null;

  const p = overview.patient;
  return {
    patient: {
      name: `${p.firstName} ${p.lastName}`,
      age: p.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth as string), 'year') : null,
      sex: p.gender,
    },
    currentVisit,
    previousVisit,
    trafficLight: overview.trafficLight,
    changesSinceLastVisit: {
      labs: labChanges,
      valuesThatCrossedOutOfRange: labChanges.filter((c) => c.crossedOutOfRange).map((c) => c.analyte),
      vitals: vitalsDelta,
      medicationsAdded: overview.medications
        .filter((m) => previousVisit && m.startDate && day(m.startDate) > previousVisit)
        .map((m) => `${m.name} ${m.dose ?? ''} ${m.frequency ?? ''}`.trim()),
    },
    activeProblems: overview.diagnoses
      .filter((d) => d.status === 'ongoing')
      .map((d) => `${d.code} — ${d.description ?? ''}`.trim()),
    alerts: overview.findings.map((f) => f.text),
    allergies: overview.allergies?.length ? overview.allergies.map((a) => a.name) : 'not recorded in the chart',
    suggestion: trendsWorthPlotting.length
      ? `Consider plotting the trend for: ${[...new Set(trendsWorthPlotting)].join(', ')} (use plot_lab_trend).`
      : undefined,
  };
}
