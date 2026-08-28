/**
 * vitalMetrics — umbrales de constantes vitales y serie histórica para graficar.
 *
 * Única fuente de verdad de los rangos: VitalSignsSection los usa para colorear
 * (severidad) y el modal de evolución los usa para derivar dirección alto/bajo.
 * Si viven en dos sitios acaban divergiendo y el gráfico miente.
 */

import type { LabResultHistory, LabResultStatus, PatientVitalRec } from '../../services/ehrService';

export type VitalStatus = 'normal' | 'warning' | 'critical';

/** Fuera de [critLow, critHigh] = crítico; fuera de [warnLow, warnHigh] = precaución. */
export interface VitalRange {
  critLow?: number;
  warnLow?: number;
  warnHigh?: number;
  critHigh?: number;
}

/** Mismos números que tenía classifyVital; no cambiar sin criterio clínico. */
export const VITAL_RANGES: Record<string, VitalRange> = {
  // Sin banda de precaución baja: por debajo de 90 ya es crítico.
  systole: { critLow: 90, warnLow: 90, warnHigh: 140, critHigh: 180 },
  diastole: { critLow: 60, warnLow: 60, warnHigh: 90, critHigh: 110 },
  heartRate: { critLow: 40, warnLow: 60, warnHigh: 100, critHigh: 120 },
  temperature: { critLow: 35, warnLow: 36, warnHigh: 37.5, critHigh: 39 },
  respRate: { critLow: 10, warnLow: 12, warnHigh: 20, critHigh: 30 },
  // La saturación no tiene techo clínico: solo se juzga por abajo.
  oxygenSaturation: { critLow: 90, warnLow: 95 },
  bmi: { critLow: 16, warnLow: 18.5, warnHigh: 25, critHigh: 35 },
};

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(n) ? null : n;
};

/** Severidad de una constante. Sin rango definido → 'normal' (no se tiñe). */
export function classifyVitalValue(
  vital: string,
  value: string | number | null | undefined,
): VitalStatus {
  const n = toNumber(value);
  if (n === null) return 'normal';
  const r = VITAL_RANGES[vital];
  if (!r) return 'normal';
  if ((r.critLow != null && n < r.critLow) || (r.critHigh != null && n > r.critHigh))
    return 'critical';
  if ((r.warnLow != null && n < r.warnLow) || (r.warnHigh != null && n > r.warnHigh))
    return 'warning';
  return 'normal';
}

/** Dirección de la alteración; null si la métrica no tiene umbrales que la definan. */
export function vitalDirection(
  vital: string,
  value: string | number | null | undefined,
): 'high' | 'low' | null {
  const n = toNumber(value);
  if (n === null) return null;
  const r = VITAL_RANGES[vital];
  if (!r) return null;
  if ((r.critLow != null && n < r.critLow) || (r.warnLow != null && n < r.warnLow)) return 'low';
  if ((r.critHigh != null && n > r.critHigh) || (r.warnHigh != null && n > r.warnHigh))
    return 'high';
  return null;
}

/** Campos numéricos de PatientVitalRec que pueden graficarse. */
export type VitalMetricKey =
  | 'heightM'
  | 'weightKg'
  | 'bmi'
  | 'temperatureC'
  | 'respRate'
  | 'systole'
  | 'diastole'
  | 'heartRate'
  | 'bodyFatPct'
  | 'leanBodyMassPct'
  | 'headCircumferenceCm'
  | 'oxygenSaturationPct';

/** Campo del histórico → clave de umbrales; null = métrica sin rango de referencia. */
export const VITAL_METRIC_RULE: Record<VitalMetricKey, string | null> = {
  heightM: null,
  weightKg: null,
  bmi: 'bmi',
  temperatureC: 'temperature',
  respRate: 'respRate',
  systole: 'systole',
  diastole: 'diastole',
  heartRate: 'heartRate',
  bodyFatPct: null,
  leanBodyMassPct: null,
  headCircumferenceCm: null,
  oxygenSaturationPct: 'oxygenSaturation',
};

// Mapeo: normal→'normal'; alterado→'low'/'high' según el umbral cruzado; sin umbrales→'unknown' (nunca un 'high' inventado, sería una alarma falsa).
function vitalPointStatus(rule: string | null, n: number): LabResultStatus {
  if (!rule) return 'unknown';
  if (classifyVitalValue(rule, n) === 'normal') return 'normal';
  return vitalDirection(rule, n) ?? 'unknown';
}

/**
 * Convierte el histórico de vitales en la forma que ya consume <AnalyteGraph>.
 * Descarta tomas sin esa métrica y ordena por fecha ascendente.
 */
export function buildVitalSeries(
  records: PatientVitalRec[],
  metric: VitalMetricKey,
  displayName: string,
  unit?: string,
): LabResultHistory {
  const rule = VITAL_METRIC_RULE[metric];
  const range = rule ? VITAL_RANGES[rule] : undefined;

  const dataPoints = records
    .map((rec) => {
      const n = toNumber(rec[metric] as number | null | undefined);
      // recordedAt es nullable en registros antiguos: cae a createdAt.
      const date = rec.recordedAt ?? rec.createdAt;
      if (n === null || !date) return null;
      return {
        date,
        value: n,
        status: vitalPointStatus(rule, n),
        // La banda verde del gráfico = rango sin precaución de esa constante.
        ...(range?.warnLow != null ? { refLow: range.warnLow } : {}),
        ...(range?.warnHigh != null ? { refHigh: range.warnHigh } : {}),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { analyteNormalized: `vital:${metric}`, analyteName: displayName, unit, dataPoints };
}
