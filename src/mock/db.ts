/**
 * Synthetic in-memory EHR dataset — the demo's "database".
 *
 * DESIGNED, NOT RANDOM. Every patient here is fictitious; no real patient data
 * exists anywhere in this repository. The index patient (Ernesto Ramírez
 * Ibarra) carries a deliberately buried signal: serum creatinine drifting
 * 0.94 → 1.12 → 1.31 → 1.52 mg/dL across four chemistry panels spread over 22
 * months. Each isolated value looks near-normal next to ten other analytes;
 * the TREND is the finding a physician plausibly misses in a 15-minute visit
 * — and the thing the WebMCP agent is built to surface.
 *
 * Clinical content is intentionally in Spanish with real-world messiness
 * (abbreviations, terse SOAP notes, a scanned PDF, fields nobody filled in):
 * spotless charts read as fake to any clinician.
 */
import type {
  ClinicalHistory,
  EhrDocument,
  EvolutionNoteFull,
  LabExpertReport,
  LabResult,
  LabResultStatus,
  PatientOverview,
  PatientVitalRec,
  UserBasic,
} from '../services/ehrService';

export const DOCTOR_MIN = {
  id: 'doc-demo-1',
  firstName: 'Andrés',
  lastName: 'Herrera Cantú',
  email: 'dr.herrera@demo.invalid',
};

/** Notes are stored with their owner so charts never leak into each other. */
export type StoredNote = EvolutionNoteFull & { patientId: string };

const doctorRef = { ...DOCTOR_MIN, role: 'doctor', professionalLicense: '10203040' } as UserBasic & {
  role: string;
  professionalLicense: string;
};

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export const INDEX_PATIENT_ID = 'pat-001';

export const PATIENTS: UserBasic[] = [
  {
    id: INDEX_PATIENT_ID,
    firstName: 'Ernesto',
    lastName: 'Ramírez Ibarra',
    email: 'e.ramirez.demo@example.com',
    phoneNumber: '662-000-0001',
    dateOfBirth: '1964-05-12',
    gender: 'male',
    bloodType: 'O+',
    height: 171,
    weight: 86.3,
    maritalStatus: 'Casado',
    occupation: 'Contador',
    emergencyContactName: 'Lucía Ibarra Peralta',
    emergencyContactPhone: '662-000-0002',
    emergencyContactRelationship: 'Esposa',
  },
  { id: 'pat-002', firstName: 'María Fernanda', lastName: 'Salcido Ochoa', email: 'mf.salcido.demo@example.com', dateOfBirth: '1989-11-03', gender: 'female', bloodType: 'A+' },
  { id: 'pat-003', firstName: 'Jorge', lastName: 'Valenzuela Ríos', email: 'j.valenzuela.demo@example.com', dateOfBirth: '1957-02-19', gender: 'male' },
  { id: 'pat-004', firstName: 'Alejandra', lastName: 'Bustamante Leyva', email: 'a.bustamante.demo@example.com', dateOfBirth: '1996-07-28', gender: 'female', bloodType: 'B+' },
  { id: 'pat-005', firstName: 'Ramón', lastName: 'Quijada Espinoza', email: 'r.quijada.demo@example.com', dateOfBirth: '1971-09-15', gender: 'male', occupation: 'Transportista' },
  { id: 'pat-006', firstName: 'Guadalupe', lastName: 'Moreno Duarte', email: 'g.moreno.demo@example.com', dateOfBirth: '1948-01-06', gender: 'female' },
  { id: 'pat-007', firstName: 'Iván', lastName: 'Córdova Peñuñuri', email: 'i.cordova.demo@example.com', dateOfBirth: '2001-04-22', gender: 'male' },
  { id: 'pat-008', firstName: 'Rosario', lastName: 'Gastélum Félix', email: 'r.gastelum.demo@example.com', dateOfBirth: '1983-12-30', gender: 'female', occupation: 'Docente' },
  { id: 'pat-009', firstName: 'Héctor Manuel', lastName: 'Araiza Coronado', email: 'hm.araiza.demo@example.com', dateOfBirth: '1966-06-09', gender: 'male' },
  { id: 'pat-010', firstName: 'Silvia', lastName: 'Encinas Robles', email: 's.encinas.demo@example.com', dateOfBirth: '1992-03-17', gender: 'female' },
];

// ---------------------------------------------------------------------------
// Documents (lab PDFs referenced by lab_results rows)
// ---------------------------------------------------------------------------

const doc = (
  id: string,
  originalName: string,
  createdAt: string,
  summary: string | null,
  documentCategory: EhrDocument['documentCategory'] = 'laboratorios',
): EhrDocument => ({
  id,
  ownerId: INDEX_PATIENT_ID,
  originalName,
  mimeType: 'application/pdf',
  size: 184_320,
  storagePath: `demo/${id}.pdf`,
  documentCategory,
  summary,
  status: 'ready',
  createdAt,
  updatedAt: createdAt,
  createdBy: doctorRef,
});

export const DOCUMENTS: EhrDocument[] = [
  doc(
    'doc-lab-1',
    'QS27_RAMIREZ_MARZO24.pdf',
    '2024-03-15T16:20:00Z',
    'Química sanguínea de 27 elementos. Alterados:\n- Glucosa: 142 mg/dL (alto) [ref: 70-100]\n- Hemoglobina glucosilada: 7.8 % (alto) [ref: 4-5.6]\n- Colesterol total: 212 mg/dL (alto) [ref: <200]\n- Triglicéridos: 198 mg/dL (alto) [ref: <150]\n- HDL: 38 mg/dL (bajo) [ref: >40]',
  ),
  doc(
    'doc-lab-2',
    'quimica sanguinea oct 2024.pdf',
    '2024-10-09T15:05:00Z',
    'Química sanguínea. Alterados:\n- Glucosa: 128 mg/dL (alto) [ref: 70-100]\n- Hemoglobina glucosilada: 7.1 % (alto) [ref: 4-5.6]\n- Triglicéridos: 172 mg/dL (alto) [ref: <150]\n- LDL: 121 mg/dL (alto) [ref: <100]',
  ),
  doc(
    'doc-lab-3',
    'LAB_ABR2025_scan.pdf',
    '2025-04-22T18:40:00Z',
    'Documento escaneado (OCR). Química sanguínea + biometría hemática + EGO. Alterados:\n- Glucosa: 135 mg/dL (alto) [ref: 70-100]\n- Creatinina: 1.31 mg/dL (alto) [ref: 0.6-1.2]\n- Urea: 48 mg/dL (alto) [ref: 17-43]\n- Proteínas en orina: Indicios',
  ),
  doc(
    'doc-lab-4',
    'QS_ENE2026.pdf',
    '2026-01-14T15:55:00Z',
    'Química sanguínea + microalbuminuria. Alterados:\n- Glucosa: 151 mg/dL (alto) [ref: 70-100]\n- Hemoglobina glucosilada: 8.0 % (alto) [ref: 4-5.6]\n- Creatinina: 1.52 mg/dL (alto) [ref: 0.6-1.2]\n- Urea: 54 mg/dL (alto) [ref: 17-43]\n- Microalbuminuria: 46 mg/g (alto) [ref: <30]',
  ),
  // Realistic noise: a consent form scan whose metadata nobody filled in.
  doc('doc-cons-1', 'IMG_20240315_0001.pdf', '2024-03-15T16:22:00Z', null, 'legales'),
];

// ---------------------------------------------------------------------------
// Lab results — one row per analyte per study, exactly like the production
// `lab_results` table. `analyteNormalized` is the grouping key of the trend.
// ---------------------------------------------------------------------------

let labSeq = 0;

const lab = (
  documentId: string | undefined,
  studyDate: string,
  studyType: string,
  analyteName: string,
  analyteNormalized: string,
  value: number | string,
  unit: string | undefined,
  refLow: number | undefined,
  refHigh: number | undefined,
  status: LabResultStatus,
  refText?: string,
): LabResult => ({
  id: `lab-${++labSeq}`,
  patientId: INDEX_PATIENT_ID,
  documentId,
  analyteName,
  analyteNormalized,
  studyType,
  valueNumeric: typeof value === 'number' ? value : undefined,
  valueText: typeof value === 'string' ? value : undefined,
  unit,
  refLow,
  refHigh,
  refText,
  status,
  studyDate: `${studyDate}T12:00:00Z`,
  createdAt: `${studyDate}T16:30:00Z`,
  document: DOCUMENTS.find((d) => d.id === documentId)
    ? { id: documentId as string, originalName: DOCUMENTS.find((d) => d.id === documentId)!.originalName }
    : undefined,
});

const QS = 'Química Sanguínea';
const BH = 'Biometría Hemática';
const EGO = 'Examen General de Orina';
const PT = 'Perfil Tiroideo';

// Filler-patient rows: same shape, explicit patient, no source PDF.
const labP = (
  patientId: string,
  studyDate: string,
  studyType: string,
  analyteName: string,
  analyteNormalized: string,
  value: number | string,
  unit: string | undefined,
  refLow: number | undefined,
  refHigh: number | undefined,
  status: LabResultStatus,
): LabResult => ({
  ...lab(undefined, studyDate, studyType, analyteName, analyteNormalized, value, unit, refLow, refHigh, status),
  id: `lab-${patientId}-${++labSeq}`,
  patientId,
});

export const LAB_RESULTS: LabResult[] = [
  // ── Study 1 · 2024-03-15 · QS 27 elementos ────────────────────────────────
  lab('doc-lab-1', '2024-03-15', QS, 'Glucosa', 'glucosa', 142, 'mg/dL', 70, 100, 'high'),
  lab('doc-lab-1', '2024-03-15', QS, 'Hemoglobina glucosilada', 'hba1c', 7.8, '%', 4, 5.6, 'high'),
  lab('doc-lab-1', '2024-03-15', QS, 'Creatinina', 'creatinina suero', 0.94, 'mg/dL', 0.6, 1.2, 'normal'),
  lab('doc-lab-1', '2024-03-15', QS, 'Urea', 'urea', 38, 'mg/dL', 17, 43, 'normal'),
  lab('doc-lab-1', '2024-03-15', QS, 'BUN', 'bun', 17.7, 'mg/dL', 7, 20, 'normal'),
  lab('doc-lab-1', '2024-03-15', QS, 'Ácido úrico', 'acido urico', 6.9, 'mg/dL', 3.5, 7.2, 'normal'),
  lab('doc-lab-1', '2024-03-15', QS, 'Colesterol total', 'colesterol total', 212, 'mg/dL', undefined, 200, 'high', '< 200'),
  lab('doc-lab-1', '2024-03-15', QS, 'Triglicéridos', 'trigliceridos', 198, 'mg/dL', undefined, 150, 'high', '< 150'),
  lab('doc-lab-1', '2024-03-15', QS, 'Colesterol HDL', 'hdl', 38, 'mg/dL', 40, undefined, 'low', '> 40'),
  lab('doc-lab-1', '2024-03-15', QS, 'Colesterol LDL', 'ldl', 134, 'mg/dL', undefined, 100, 'high', '< 100'),
  lab('doc-lab-1', '2024-03-15', QS, 'ALT (TGP)', 'alt', 42, 'U/L', 7, 56, 'normal'),
  lab('doc-lab-1', '2024-03-15', QS, 'AST (TGO)', 'ast', 31, 'U/L', 5, 40, 'normal'),
  lab('doc-lab-1', '2024-03-15', QS, 'Sodio', 'sodio', 139, 'mEq/L', 135, 145, 'normal'),
  lab('doc-lab-1', '2024-03-15', QS, 'Potasio', 'potasio', 4.4, 'mEq/L', 3.5, 5.1, 'normal'),
  lab('doc-lab-1', '2024-03-15', QS, 'Cloro', 'cloro', 102, 'mEq/L', 98, 107, 'normal'),

  // ── Study 2 · 2024-10-09 · QS ─────────────────────────────────────────────
  lab('doc-lab-2', '2024-10-09', QS, 'Glucosa', 'glucosa', 128, 'mg/dL', 70, 100, 'high'),
  lab('doc-lab-2', '2024-10-09', QS, 'Hemoglobina glucosilada', 'hba1c', 7.1, '%', 4, 5.6, 'high'),
  lab('doc-lab-2', '2024-10-09', QS, 'Creatinina', 'creatinina suero', 1.12, 'mg/dL', 0.6, 1.2, 'normal'),
  lab('doc-lab-2', '2024-10-09', QS, 'Urea', 'urea', 42, 'mg/dL', 17, 43, 'normal'),
  lab('doc-lab-2', '2024-10-09', QS, 'BUN', 'bun', 19.6, 'mg/dL', 7, 20, 'normal'),
  lab('doc-lab-2', '2024-10-09', QS, 'Colesterol total', 'colesterol total', 198, 'mg/dL', undefined, 200, 'normal', '< 200'),
  lab('doc-lab-2', '2024-10-09', QS, 'Triglicéridos', 'trigliceridos', 172, 'mg/dL', undefined, 150, 'high', '< 150'),
  lab('doc-lab-2', '2024-10-09', QS, 'Colesterol HDL', 'hdl', 41, 'mg/dL', 40, undefined, 'normal', '> 40'),
  lab('doc-lab-2', '2024-10-09', QS, 'Colesterol LDL', 'ldl', 121, 'mg/dL', undefined, 100, 'high', '< 100'),

  // ── Study 3 · 2025-04-22 · QS + BH + EGO (scanned, OCR) ───────────────────
  lab('doc-lab-3', '2025-04-22', QS, 'Glucosa', 'glucosa', 135, 'mg/dL', 70, 100, 'high'),
  lab('doc-lab-3', '2025-04-22', QS, 'Hemoglobina glucosilada', 'hba1c', 7.4, '%', 4, 5.6, 'high'),
  lab('doc-lab-3', '2025-04-22', QS, 'Creatinina', 'creatinina suero', 1.31, 'mg/dL', 0.6, 1.2, 'high'),
  lab('doc-lab-3', '2025-04-22', QS, 'Urea', 'urea', 48, 'mg/dL', 17, 43, 'high'),
  lab('doc-lab-3', '2025-04-22', QS, 'BUN', 'bun', 22.4, 'mg/dL', 7, 20, 'high'),
  lab('doc-lab-3', '2025-04-22', BH, 'Hemoglobina', 'hemoglobina', 13.8, 'g/dL', 13.5, 17.5, 'normal'),
  lab('doc-lab-3', '2025-04-22', BH, 'Leucocitos', 'leucocitos', 7.2, '10³/µL', 4.5, 11, 'normal'),
  lab('doc-lab-3', '2025-04-22', BH, 'Plaquetas', 'plaquetas', 265, '10³/µL', 150, 450, 'normal'),
  lab('doc-lab-3', '2025-04-22', EGO, 'Proteínas en orina', 'proteinas orina', 'Indicios', undefined, undefined, undefined, 'positive', 'Negativo'),
  lab('doc-lab-3', '2025-04-22', EGO, 'Glucosa en orina', 'glucosa orina', 'Negativo', undefined, undefined, undefined, 'negative', 'Negativo'),

  // ── Study 4 · 2026-01-14 · QS + microalbuminuria ──────────────────────────
  lab('doc-lab-4', '2026-01-14', QS, 'Glucosa', 'glucosa', 151, 'mg/dL', 70, 100, 'high'),
  lab('doc-lab-4', '2026-01-14', QS, 'Hemoglobina glucosilada', 'hba1c', 8.0, '%', 4, 5.6, 'high'),
  lab('doc-lab-4', '2026-01-14', QS, 'Creatinina', 'creatinina suero', 1.52, 'mg/dL', 0.6, 1.2, 'high'),
  lab('doc-lab-4', '2026-01-14', QS, 'Urea', 'urea', 54, 'mg/dL', 17, 43, 'high'),
  lab('doc-lab-4', '2026-01-14', QS, 'BUN', 'bun', 25.2, 'mg/dL', 7, 20, 'high'),
  lab('doc-lab-4', '2026-01-14', QS, 'Potasio', 'potasio', 4.9, 'mEq/L', 3.5, 5.1, 'normal'),
  lab('doc-lab-4', '2026-01-14', QS, 'Colesterol total', 'colesterol total', 205, 'mg/dL', undefined, 200, 'high', '< 200'),
  lab('doc-lab-4', '2026-01-14', QS, 'Triglicéridos', 'trigliceridos', 189, 'mg/dL', undefined, 150, 'high', '< 150'),
  lab('doc-lab-4', '2026-01-14', QS, 'Colesterol HDL', 'hdl', 37, 'mg/dL', 40, undefined, 'low', '> 40'),
  lab('doc-lab-4', '2026-01-14', QS, 'Microalbuminuria', 'microalbuminuria', 46, 'mg/g', undefined, 30, 'high', '< 30'),

  // ── Filler charts: enough real content that opening another patient
  //    doesn't break the illusion; no buried signal here on purpose. ─────────
  labP('pat-003', '2025-11-18', QS, 'Glucosa', 'glucosa', 96, 'mg/dL', 70, 100, 'normal'),
  labP('pat-003', '2025-11-18', QS, 'Creatinina', 'creatinina suero', 1.05, 'mg/dL', 0.6, 1.2, 'normal'),
  labP('pat-003', '2025-11-18', QS, 'Colesterol total', 'colesterol total', 228, 'mg/dL', undefined, 200, 'high'),
  labP('pat-003', '2025-11-18', QS, 'Colesterol LDL', 'ldl', 152, 'mg/dL', undefined, 100, 'high'),
  labP('pat-003', '2025-11-18', QS, 'Colesterol HDL', 'hdl', 42, 'mg/dL', 40, undefined, 'normal'),
  labP('pat-003', '2025-11-18', QS, 'Triglicéridos', 'trigliceridos', 163, 'mg/dL', undefined, 150, 'high'),
  labP('pat-003', '2025-11-18', QS, 'Ácido úrico', 'acido urico', 7.6, 'mg/dL', 3.5, 7.2, 'high'),

  labP('pat-006', '2025-10-02', PT, 'TSH', 'tsh', 6.8, 'µUI/mL', 0.4, 4.5, 'high'),
  labP('pat-006', '2025-10-02', PT, 'T4 libre', 't4 libre', 1.1, 'ng/dL', 0.8, 1.8, 'normal'),
  labP('pat-006', '2025-10-02', BH, 'Hemoglobina', 'hemoglobina', 12.9, 'g/dL', 12, 15.5, 'normal'),
  labP('pat-006', '2025-10-02', QS, 'Glucosa', 'glucosa', 88, 'mg/dL', 70, 100, 'normal'),
  labP('pat-006', '2026-02-10', PT, 'TSH', 'tsh', 4.1, 'µUI/mL', 0.4, 4.5, 'normal'),
  labP('pat-006', '2026-02-10', PT, 'T4 libre', 't4 libre', 1.3, 'ng/dL', 0.8, 1.8, 'normal'),
];

// ---------------------------------------------------------------------------
// Vitals
// ---------------------------------------------------------------------------

const vital = (
  id: string,
  recordedAt: string,
  v: Partial<PatientVitalRec>,
): PatientVitalRec => ({
  id,
  recordedAt: `${recordedAt}T16:30:00Z`,
  createdAt: `${recordedAt}T16:30:00Z`,
  updatedAt: `${recordedAt}T16:30:00Z`,
  createdBy: doctorRef,
  ...v,
});

export const VITALS: Record<string, PatientVitalRec[]> = {
  [INDEX_PATIENT_ID]: [
    vital('vit-4', '2026-01-14', { heightM: 1.71, weightKg: 86.3, bmi: 29.5, systole: 142, diastole: 90, heartRate: 82, temperatureC: 36.5, oxygenSaturationPct: 96, respRate: 17 }),
    vital('vit-3', '2025-04-22', { heightM: 1.71, weightKg: 85.9, bmi: 29.4, systole: 138, diastole: 88, heartRate: 76, temperatureC: 36.7, oxygenSaturationPct: 97 }),
    vital('vit-2', '2024-10-09', { heightM: 1.71, weightKg: 87.1, bmi: 29.8, systole: 132, diastole: 84, heartRate: 80, temperatureC: 36.4 }),
    vital('vit-1', '2024-03-15', { heightM: 1.71, weightKg: 88.4, bmi: 30.2, systole: 128, diastole: 82, heartRate: 78, temperatureC: 36.6, oxygenSaturationPct: 97, respRate: 16 }),
  ],
  'pat-003': [
    vital('vit-j1', '2025-11-18', { heightM: 1.68, weightKg: 79.2, bmi: 28.1, systole: 134, diastole: 82, heartRate: 71, temperatureC: 36.5 }),
  ],
  'pat-006': [
    vital('vit-g2', '2026-02-10', { heightM: 1.55, weightKg: 61.4, bmi: 25.6, systole: 126, diastole: 76, heartRate: 68, temperatureC: 36.3, oxygenSaturationPct: 95 }),
    vital('vit-g1', '2025-10-02', { heightM: 1.55, weightKg: 62.8, bmi: 26.1, systole: 130, diastole: 78, heartRate: 72, temperatureC: 36.4 }),
  ],
};

// ---------------------------------------------------------------------------
// Evolution notes — terse, abbreviated, imperfect. The creatinine appears in
// passing (n2, n3) and is MISSING from the latest note (n5): the physician's
// notes never connect the dots. That is the gap the agent closes.
// ---------------------------------------------------------------------------

const note = (
  patientId: string,
  id: string,
  createdAt: string,
  title: string,
  soap: { s: string; o: string; a: string; p: string },
  diagnoses: string[],
  medications: string[],
): StoredNote => ({
  patientId,
  id,
  status: 'SIGNED',
  title,
  createdAt: `${createdAt}T17:35:00Z`,
  signedAt: `${createdAt}T17:50:00Z`,
  revision: 1,
  author: DOCTOR_MIN,
  subjective: soap.s,
  objective: soap.o,
  assessment: soap.a,
  plan: soap.p,
  diagnoses,
  medications: { items: medications },
});

export const NOTES: StoredNote[] = [
  note(
    INDEX_PATIENT_ID,
    'note-5',
    '2026-01-14',
    'Control DM2 / HTA',
    {
      s: 'Acude a control c/ labs. Refiere apego regular a tx, suspendió atorvastatina x su cuenta 2 sem "porque se le acabó". Niega hipoglucemias. Polidipsia leve. Niega edema.',
      o: 'TA 142/90, FC 82, peso 86.3 kg. QS: glucosa 151, HbA1c 8.0. Perfil lipídico c/ CT 205, TG 189, HDL 37. Resto de la QS sin comentarios.',
      a: 'DM2 descontrolada. HTA en descontrol leve. Dislipidemia mixta c/ mal apego.',
      p: 'Se intensifica tx: se agrega glibenclamida 5 mg c/24 h. Reforzar apego a atorvastatina y losartán. Plan de alimentación. Cita en 3 meses c/ labs de control.',
    },
    ['E11.9 — Diabetes mellitus tipo 2', 'I10 — Hipertensión esencial', 'E78.5 — Dislipidemia'],
    ['Metformina 850 mg c/12 h', 'Glibenclamida 5 mg c/24 h', 'Atorvastatina 20 mg c/24 h', 'Losartán 50 mg c/24 h'],
  ),
  note(
    INDEX_PATIENT_ID,
    'note-4',
    '2025-09-02',
    'Consulta por IVRS',
    {
      s: 'Odinofagia y rinorrea hialina de 3 días. Niega fiebre.',
      o: 'Faringe hiperemica sin exudado. Afebril. CsPs limpios.',
      a: 'IVRS viral.',
      p: 'Tx sintomático. Datos de alarma explicados. No amerita labs.',
    },
    ['J06.9 — Infección aguda de vías respiratorias superiores'],
    ['Paracetamol 500 mg PRN'],
  ),
  note(
    INDEX_PATIENT_ID,
    'note-3',
    '2025-04-22',
    'Control DM2 c/ labs',
    {
      s: 'Refiere buen apego. Caminata 3x/sem. Niega sx urinarios.',
      o: 'TA 138/88, peso 85.9 kg. Labs (escaneado, lab externo): glucosa 135, HbA1c 7.4, cr 1.3, urea 48. EGO c/ indicios de proteínas. BH s/ alteraciones.',
      a: 'DM2 en control regular. Fx renal en límite — vigilar. Proteinuria en indicios, a correlacionar.',
      p: 'Continúa mismo esquema. Se solicita QS de control en próx visita. Se agrega losartán 50 mg c/24 h x TA limítrofe.',
    },
    ['E11.9 — Diabetes mellitus tipo 2', 'I10 — Hipertensión esencial'],
    ['Metformina 850 mg c/12 h', 'Atorvastatina 20 mg c/24 h', 'Losartán 50 mg c/24 h'],
  ),
  note(
    INDEX_PATIENT_ID,
    'note-2',
    '2024-10-09',
    'Control semestral DM2',
    {
      s: 'Sin quejas. Apego adecuado a metformina. Dieta c/ transgresiones ocasionales.',
      o: 'TA 132/84, peso 87.1 kg. QS: glucosa 128, HbA1c 7.1, cr 1.12, resto N.',
      a: 'DM2 c/ mejoría del control glucémico. Sobrepeso.',
      p: 'Mismo esquema. Se insiste en plan de alimentación. Control c/ labs en 6 meses.',
    },
    ['E11.9 — Diabetes mellitus tipo 2'],
    ['Metformina 850 mg c/12 h', 'Atorvastatina 20 mg c/24 h'],
  ),
  note(
    INDEX_PATIENT_ID,
    'note-1',
    '2024-03-15',
    'Primera consulta — control DM2',
    {
      s: 'Paciente masculino 59a c/ DM2 dx 2019, previamente en control en IMSS. Refiere poliuria nocturna ocasional. Niega hipoglucemias.',
      o: 'TA 128/82, FC 78, peso 88.4 kg, IMC 30.2. QS27: glucosa 142, HbA1c 7.8, perfil lipídico alterado (CT 212, TG 198, HDL 38, LDL 134). Resto dentro de parámetros.',
      a: 'DM2 descontrolada leve. Obesidad GI. Dislipidemia mixta de novo.',
      p: 'Se ajusta metformina a 850 mg c/12 h. Inicia atorvastatina 20 mg c/24 h. Plan de alimentación y actividad física. Cita en 6 meses c/ labs previos.',
    },
    ['E11.9 — Diabetes mellitus tipo 2', 'E66.0 — Obesidad', 'E78.5 — Dislipidemia'],
    ['Metformina 850 mg c/12 h', 'Atorvastatina 20 mg c/24 h'],
  ),

  // ── Filler charts ─────────────────────────────────────────────────────────
  note(
    'pat-003',
    'note-j1',
    '2025-11-18',
    'Control HTA / dislipidemia',
    {
      s: 'Asintomático. Buen apego a tx. Camina a diario.',
      o: 'TA 134/82, FC 71, peso 79.2 kg. QS: glucosa 96, cr 1.05. Perfil lipídico fuera de meta (LDL 152, TG 163). AU 7.6.',
      a: 'HTA en control aceptable. Dislipidemia fuera de meta. Hiperuricemia asintomática.',
      p: 'Se sube atorvastatina a 40 mg c/24 h. Dieta baja en purinas. Control c/ labs en 4 meses.',
    },
    ['I10 — Hipertensión esencial', 'E78.5 — Dislipidemia'],
    ['Losartán 100 mg c/24 h', 'Atorvastatina 40 mg c/24 h'],
  ),
  note(
    'pat-006',
    'note-g2',
    '2026-02-10',
    'Control hipotiroidismo — TSH normalizada',
    {
      s: 'Refiere mejoría de fatiga y caída de cabello. Sin palpitaciones.',
      o: 'TA 126/76, peso 61.4 kg. PT: TSH 4.1 (previa 6.8), T4L 1.3. Rodillas c/ crepitación bilateral, sin derrame.',
      a: 'Hipotiroidismo primario en control tras ajuste. Gonartrosis bilateral estable.',
      p: 'Continúa levotiroxina 75 µg c/24 h en ayuno. Paracetamol PRN. PT de control en 6 meses.',
    },
    ['E03.9 — Hipotiroidismo, no especificado', 'M17.0 — Gonartrosis primaria bilateral'],
    ['Levotiroxina 75 µg c/24 h', 'Paracetamol 500 mg PRN'],
  ),
  note(
    'pat-006',
    'note-g1',
    '2025-10-02',
    'Ajuste de levotiroxina',
    {
      s: 'Fatiga y estreñimiento de meses. Dosis previa 50 µg.',
      o: 'TA 130/78. PT: TSH 6.8 (alta), T4L 1.1. BH s/ alteraciones.',
      a: 'Hipotiroidismo subcompensado.',
      p: 'Se ajusta levotiroxina a 75 µg c/24 h. PT de control en 3-4 meses.',
    },
    ['E03.9 — Hipotiroidismo, no especificado'],
    ['Levotiroxina 75 µg c/24 h'],
  ),
];

// ---------------------------------------------------------------------------
// Patient overview (the /health overview endpoint shape)
// ---------------------------------------------------------------------------

const overviewPatientFields = (p: UserBasic) => ({
  id: p.id,
  firstName: p.firstName,
  lastName: p.lastName,
  email: p.email,
  phoneNumber: p.phoneNumber,
  dateOfBirth: p.dateOfBirth,
  gender: p.gender,
  bloodType: p.bloodType,
  height: p.height,
  weight: p.weight,
  maritalStatus: p.maritalStatus,
  occupation: p.occupation,
  emergencyContactName: p.emergencyContactName,
  emergencyContactPhone: p.emergencyContactPhone,
  emergencyContactRelationship: p.emergencyContactRelationship,
});

const emptyOverview = (p: UserBasic): PatientOverview => ({
  patient: overviewPatientFields(p),
  metrics: { citasProximas: 0, resultadosNuevos: 0, medicamentos: 0, alertas: 0, hallazgos: 0 },
  trafficLight: 'verde',
  summary: '',
  documents: [],
  medications: [],
  findings: [],
  diagnoses: [],
  symptoms: [],
  vitals: [],
  allergies: [],
  vaccines: [],
});

const indexOverview: PatientOverview = {
  patient: overviewPatientFields(PATIENTS[0]),
  metrics: { citasProximas: 1, resultadosNuevos: 3, medicamentos: 4, alertas: 1, hallazgos: 2 },
  trafficLight: 'amarillo',
  summary:
    'Masculino de 61 años con DM2 (dx 2019), HTA y dislipidemia mixta. Último control (14-ene-2026) con descontrol glucémico (glucosa 151 mg/dL, HbA1c 8.0 %) y TA 142/90; se intensificó el esquema hipoglucemiante. Mal apego reciente a estatina referido por el paciente. Antecedente familiar de DM2 (madre). Tendencia ponderal estable alrededor de 86-88 kg (IMC ~29.5). Estudios de laboratorio seriados disponibles de mar-2024 a ene-2026.',
  documents: DOCUMENTS.filter((d) => d.documentCategory === 'laboratorios').map((d) => ({
    id: d.id,
    originalName: d.originalName,
    summary: d.summary,
    createdAt: d.createdAt,
  })),
  medications: [
    { id: 'med-1', ownerId: INDEX_PATIENT_ID, name: 'Metformina', dose: '850 mg', frequency: 'c/12 h', startDate: '2024-03-15', createdAt: '2024-03-15T11:00:00Z', updatedAt: '2024-03-15T11:00:00Z' },
    { id: 'med-2', ownerId: INDEX_PATIENT_ID, name: 'Glibenclamida', dose: '5 mg', frequency: 'c/24 h', startDate: '2026-01-14', createdAt: '2026-01-14T11:00:00Z', updatedAt: '2026-01-14T11:00:00Z' },
    { id: 'med-3', ownerId: INDEX_PATIENT_ID, name: 'Atorvastatina', dose: '20 mg', frequency: 'c/24 h', startDate: '2024-03-15', createdAt: '2024-03-15T11:00:00Z', updatedAt: '2024-03-15T11:00:00Z' },
    { id: 'med-4', ownerId: INDEX_PATIENT_ID, name: 'Losartán', dose: '50 mg', frequency: 'c/24 h', startDate: '2025-04-22', createdAt: '2025-04-22T11:00:00Z', updatedAt: '2025-04-22T11:00:00Z' },
  ],
  findings: [
    {
      id: 'find-1',
      ownerId: INDEX_PATIENT_ID,
      documentId: 'doc-lab-3',
      text: 'EGO (22-abr-2025): proteínas en orina en indicios.',
      createdAt: '2025-04-22T18:45:00Z',
      updatedAt: '2025-04-22T18:45:00Z',
    },
    {
      id: 'find-2',
      ownerId: INDEX_PATIENT_ID,
      documentId: 'doc-lab-4',
      text: 'Microalbuminuria 46 mg/g (14-ene-2026), por arriba de referencia (<30).',
      createdAt: '2026-01-14T16:00:00Z',
      updatedAt: '2026-01-14T16:00:00Z',
    },
  ],
  diagnoses: [
    { id: 'dx-1', ownerId: INDEX_PATIENT_ID, code: 'E11.9', description: 'Diabetes mellitus tipo 2, sin complicaciones especificadas', status: 'ongoing', onsetDate: '2019-06-01', codeSystem: 'icd10', createdAt: '2024-03-15T11:00:00Z', updatedAt: '2024-03-15T11:00:00Z' },
    { id: 'dx-2', ownerId: INDEX_PATIENT_ID, code: 'I10', description: 'Hipertensión esencial (primaria)', status: 'ongoing', onsetDate: '2025-04-22', codeSystem: 'icd10', createdAt: '2025-04-22T11:00:00Z', updatedAt: '2025-04-22T11:00:00Z' },
    { id: 'dx-3', ownerId: INDEX_PATIENT_ID, code: 'E78.5', description: 'Hiperlipidemia, no especificada', status: 'ongoing', onsetDate: '2024-03-15', codeSystem: 'icd10', createdAt: '2024-03-15T11:00:00Z', updatedAt: '2024-03-15T11:00:00Z' },
  ],
  symptoms: [
    { id: 'sym-1', ownerId: INDEX_PATIENT_ID, description: 'Polidipsia leve', status: 'ongoing', onsetDate: '2025-12-01', createdAt: '2026-01-14T11:00:00Z', updatedAt: '2026-01-14T11:00:00Z' },
  ],
  vitals: VITALS[INDEX_PATIENT_ID],
  allergies: [], // nobody filled this in — realistic noise, and the agent should say "not recorded"
  vaccines: [],
  pathological: {
    hospitalizations: false,
    surgeries: true,
    surgeriesDetails: 'Apendicectomía en la juventud (aprox. 1985).',
    diabetes: true,
    diabetesDetails: 'DM2 dx 2019, inicialmente en control en IMSS.',
    thyroid: false,
    hypertension: true,
    hypertensionDetails: 'Dx abr-2025, en tx con losartán.',
    heartDisease: false,
    injuries: false,
    cancer: false,
    tuberculosis: false,
    transfusions: false,
    respiratory: false,
    gastrointestinal: false,
    std: false,
    ckd: false,
    other: false,
  },
  nonPathological: {
    physicalActivity: true,
    physicalActivityDetails: 'Caminata 3x/semana, 30 min.',
    smoking: false,
    smokingDetails: 'Negado.',
    alcohol: true,
    alcoholDetails: 'Social, ocasional.',
    drugs: false,
    recentImmunization: false,
    other: false,
  },
  family: {
    diabetes: true,
    diabetesDetails: 'Madre finada a los 71 años por complicaciones de DM2.',
    heartDisease: false,
    hypertension: true,
    hypertensionDetails: 'Padre hipertenso.',
    thyroid: false,
    ckd: false,
    other: false,
  },
};

const jorgeOverview: PatientOverview = {
  ...emptyOverview(PATIENTS[2]),
  metrics: { citasProximas: 0, resultadosNuevos: 1, medicamentos: 2, alertas: 0, hallazgos: 0 },
  trafficLight: 'verde',
  summary:
    'Masculino de 69 años con HTA de larga evolución y dislipidemia, en control aceptable. Última QS (nov-2025) con perfil lipídico fuera de meta (LDL 152) e hiperuricemia asintomática; glucemia y función renal normales. Se intensificó estatina.',
  diagnoses: [
    { id: 'dx-j1', ownerId: 'pat-003', code: 'I10', description: 'Hipertensión esencial (primaria)', status: 'ongoing', onsetDate: '2014-05-01', codeSystem: 'icd10', createdAt: '2025-11-18T17:00:00Z', updatedAt: '2025-11-18T17:00:00Z' },
    { id: 'dx-j2', ownerId: 'pat-003', code: 'E78.5', description: 'Hiperlipidemia, no especificada', status: 'ongoing', onsetDate: '2020-02-01', codeSystem: 'icd10', createdAt: '2025-11-18T17:00:00Z', updatedAt: '2025-11-18T17:00:00Z' },
  ],
  medications: [
    { id: 'med-j1', ownerId: 'pat-003', name: 'Losartán', dose: '100 mg', frequency: 'c/24 h', startDate: '2014-06-01', createdAt: '2025-11-18T17:00:00Z', updatedAt: '2025-11-18T17:00:00Z' },
    { id: 'med-j2', ownerId: 'pat-003', name: 'Atorvastatina', dose: '40 mg', frequency: 'c/24 h', startDate: '2025-11-18', createdAt: '2025-11-18T17:00:00Z', updatedAt: '2025-11-18T17:00:00Z' },
  ],
  vitals: VITALS['pat-003'],
};

const guadalupeOverview: PatientOverview = {
  ...emptyOverview(PATIENTS[5]),
  metrics: { citasProximas: 1, resultadosNuevos: 2, medicamentos: 2, alertas: 0, hallazgos: 0 },
  trafficLight: 'verde',
  summary:
    'Femenina de 78 años con hipotiroidismo primario, en control tras ajuste de levotiroxina (TSH 6.8 → 4.1 µUI/mL entre oct-2025 y feb-2026). Gonartrosis bilateral estable con manejo sintomático. Sin alertas activas.',
  diagnoses: [
    { id: 'dx-g1', ownerId: 'pat-006', code: 'E03.9', description: 'Hipotiroidismo, no especificado', status: 'ongoing', onsetDate: '2018-09-01', codeSystem: 'icd10', createdAt: '2026-02-10T17:00:00Z', updatedAt: '2026-02-10T17:00:00Z' },
    { id: 'dx-g2', ownerId: 'pat-006', code: 'M17.0', description: 'Gonartrosis primaria bilateral', status: 'ongoing', onsetDate: '2021-03-01', codeSystem: 'icd10', createdAt: '2026-02-10T17:00:00Z', updatedAt: '2026-02-10T17:00:00Z' },
  ],
  medications: [
    { id: 'med-g1', ownerId: 'pat-006', name: 'Levotiroxina', dose: '75 µg', frequency: 'c/24 h', startDate: '2025-10-02', createdAt: '2026-02-10T17:00:00Z', updatedAt: '2026-02-10T17:00:00Z' },
    { id: 'med-g2', ownerId: 'pat-006', name: 'Paracetamol', dose: '500 mg', frequency: 'PRN', startDate: '2021-03-01', createdAt: '2026-02-10T17:00:00Z', updatedAt: '2026-02-10T17:00:00Z' },
  ],
  vitals: VITALS['pat-006'],
};

const FILLER_OVERVIEWS: Record<string, PatientOverview> = {
  'pat-003': jorgeOverview,
  'pat-006': guadalupeOverview,
};

export const OVERVIEWS: Record<string, PatientOverview> = Object.fromEntries(
  PATIENTS.map((p) => [
    p.id,
    p.id === INDEX_PATIENT_ID ? indexOverview : FILLER_OVERVIEWS[p.id] ?? emptyOverview(p),
  ]),
);

// ---------------------------------------------------------------------------
// Clinical history (one row per patient, free-text NOM-004 style)
// ---------------------------------------------------------------------------

export const CLINICAL_HISTORIES: Record<string, ClinicalHistory> = Object.fromEntries(
  PATIENTS.map((p) => [
    p.id,
    {
      id: `ch-${p.id}`,
      patient: p,
      createdBy: doctorRef,
      surgicalHistory: p.id === INDEX_PATIENT_ID ? 'Apendicectomía (~1985).' : null,
      currentMedications:
        p.id === INDEX_PATIENT_ID
          ? 'Metformina 850 mg c/12 h · Glibenclamida 5 mg c/24 h · Atorvastatina 20 mg c/24 h · Losartán 50 mg c/24 h'
          : null,
      familyHistory: p.id === INDEX_PATIENT_ID ? 'Madre c/ DM2 (finada). Padre hipertenso.' : null,
      pastIllnesses: null,
      allergies: null, // never captured — realistic gap
      immunizations: null,
      gynecObstetricHistory: null,
      socialHistory: p.id === INDEX_PATIENT_ID ? 'Contador. Tabaquismo negado. Alcohol social.' : null,
      notes: null,
      createdAt: '2024-03-15T10:00:00Z',
      updatedAt: '2026-01-14T11:00:00Z',
    } satisfies ClinicalHistory,
  ]),
);

// ---------------------------------------------------------------------------
// Cached AI lab-expert report (the production shape, canned content)
// ---------------------------------------------------------------------------

export const LAB_EXPERT: Record<string, LabExpertReport> = {
  [INDEX_PATIENT_ID]: {
    id: 'lex-1',
    patientId: INDEX_PATIENT_ID,
    narrative:
      'El hallazgo dominante del expediente no está en ningún valor aislado sino en la serie: la creatinina sérica asciende de 0.94 a 1.52 mg/dL entre marzo-2024 y enero-2026 (+62 %), cruzando el límite de referencia a partir de abril-2025. El ascenso es concordante con urea/BUN en aumento, proteínas en orina en indicios (abr-2025) y microalbuminuria de 46 mg/g (ene-2026), en un paciente con DM2 de ~7 años de evolución con control glucémico subóptimo (HbA1c 7.1–8.0 %) e hipertensión reciente. El conjunto sugiere nefropatía diabética incipiente con progresión activa.',
    probableDiagnoses: [
      {
        name: 'Enfermedad renal crónica incipiente, probable nefropatía diabética',
        confidence: 'moderada',
        evidence: [
          'Creatinina 0.94 → 1.12 → 1.31 → 1.52 mg/dL (mar-2024 a ene-2026)',
          'Urea 38 → 54 mg/dL y BUN 17.7 → 25.2 mg/dL en el mismo periodo',
          'Proteínas en orina en indicios (EGO, abr-2025) y microalbuminuria 46 mg/g (ene-2026)',
          'DM2 con HbA1c persistentemente ≥ 7.1 % e HTA concomitante',
        ],
        icd10: 'E11.2',
      },
    ],
    suggestedFollowUps: [
      { test: 'TFG estimada (CKD-EPI) y relación albúmina/creatinina en orina', rationale: 'Estadificar el daño renal y confirmar albuminuria persistente en dos determinaciones.', priority: 'alta' },
      { test: 'Revaloración del esquema: considerar iSGLT2 y ajuste de metformina según TFG', rationale: 'Nefroprotección y seguridad del hipoglucemiante con función renal en descenso.', priority: 'alta' },
      { test: 'Referencia a nefrología si TFG < 60 o albuminuria sostenida', rationale: 'Progresión documentada en 22 meses amerita valoración especializada.', priority: 'media' },
    ],
    redFlags: ['Creatinina con ascenso sostenido de +62 % en 22 meses, ya fuera de referencia en las últimas dos determinaciones.'],
    analytesConsidered: 12,
    measurementsConsidered: LAB_RESULTS.length,
    inputHash: 'demo-fixed',
    createdAt: '2026-01-14T16:05:00Z',
    updatedAt: '2026-01-14T16:05:00Z',
    cached: true,
  },
};
