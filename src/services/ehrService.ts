/**
 * Demo ehrService — the production service's exact types and function
 * contracts, implemented against an in-memory synthetic dataset instead of
 * the real API.
 *
 * The type shapes below are copied verbatim from the production frontend
 * (which mirrors the backend's TypeORM entities and serializers), so the
 * extracted chart components run unmodified and the WebMCP tools speak the
 * same schema the real product does. A small artificial latency keeps
 * loading states visible — the agent-driven UI choreography should read as a
 * sequence of real steps, not an instant repaint.
 */
import { jsPDF } from 'jspdf';
import {
  CLINICAL_HISTORIES,
  DOCTOR_MIN,
  DOCUMENTS,
  LAB_EXPERT,
  LAB_RESULTS,
  NOTES,
  OVERVIEWS,
  PATIENTS,
  VITALS,
} from '../mock/db';

// ---------------------------------------------------------------------------
// Types (production-faithful)
// ---------------------------------------------------------------------------

export interface UserBasic {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string | Date;
  accessRestricted?: boolean;
  gender?: 'male' | 'female';
  bloodType?: string;
  height?: number;
  weight?: number;
  maritalStatus?: string;
  occupation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  professionalLicense?: string;
  specialty?: string;
  clinic?: { id: string; name: string } | null;
  isActive?: boolean;
  disabledReason?: string | null;
  profileImageUrl?: string | null;
}

export interface EhrDocument {
  id: string;
  ownerId: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  s3Key?: string;
  documentCategory?: 'imagenologia' | 'laboratorios' | 'paraclinicos' | 'legales';
  summary?: string | null;
  status: 'pending' | 'ready' | 'failed';
  createdAt: string;
  updatedAt: string;
  createdBy?: UserBasic | null;
}

export interface ImagingStudy {
  studyUUID: string;
  fileCount: number;
  brokenCount?: number;
  totalSize: number;
  firstUploadDate: string;
  lastUploadDate: string;
  files: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    s3Key?: string;
    createdAt: string;
    status: string;
    summary?: string | null;
  }[];
  id?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  status?: string;
}

export interface Finding {
  id: string;
  ownerId: string;
  documentId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  document?: EhrDocument;
}

export interface Medication {
  id: string;
  ownerId: string;
  name: string;
  activeIngredient?: string | null;
  brand?: string | null;
  dose?: string;
  frequency?: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserBasic | null;
  updatedBy?: UserBasic | null;
}

export interface HealthMetrics {
  citasProximas: number;
  resultadosNuevos: number;
  medicamentos: number;
  alertas: number;
  hallazgos: number;
}

export type DiagnosisStatus = 'ongoing' | 'resolved' | 'worsened';

export interface Diagnosis {
  id: string;
  ownerId: string;
  code: string;
  description?: string | null;
  status: DiagnosisStatus;
  onsetDate?: string | null;
  resolvedDate?: string | null;
  notes?: string | null;
  codeSystem?: 'icd10' | 'icd11';
  icd10Code?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserBasic | null;
}

export type SymptomStatus = 'ongoing' | 'resolved' | 'worsened';

export interface Symptom {
  id: string;
  ownerId: string;
  description: string;
  severity?: string | null;
  status: SymptomStatus;
  onsetDate?: string | null;
  resolvedDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserBasic | null;
  updatedBy?: UserBasic | null;
}

export interface PatientVitalRec {
  id: string;
  heightM?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  temperatureC?: number | null;
  respRate?: number | null;
  systole?: number | null;
  diastole?: number | null;
  heartRate?: number | null;
  bodyFatPct?: number | null;
  leanBodyMassPct?: number | null;
  headCircumferenceCm?: number | null;
  oxygenSaturationPct?: number | null;
  recordedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserBasic | null;
}

export interface CreateVitalDto {
  heightM?: number;
  weightKg?: number;
  bmi?: number;
  temperatureC?: number;
  respRate?: number;
  systole?: number;
  diastole?: number;
  heartRate?: number;
  bodyFatPct?: number;
  leanBodyMassPct?: number;
  headCircumferenceCm?: number;
  oxygenSaturationPct?: number;
  recordedAt?: string;
}

export interface PatientAllergyRec {
  id: string;
  name: string;
  isOther: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserBasic | null;
}

export interface PatientVaccineRec {
  id: string;
  name: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserBasic | null;
}

export interface PathologicalHistoryRec {
  hospitalizations: boolean; hospitalizationsDetails?: string | null;
  surgeries: boolean; surgeriesDetails?: string | null;
  diabetes: boolean; diabetesDetails?: string | null;
  thyroid: boolean; thyroidDetails?: string | null;
  hypertension: boolean; hypertensionDetails?: string | null;
  heartDisease: boolean; heartDiseaseDetails?: string | null;
  injuries: boolean; injuriesDetails?: string | null;
  cancer: boolean; cancerDetails?: string | null;
  tuberculosis: boolean; tuberculosisDetails?: string | null;
  transfusions: boolean; transfusionsDetails?: string | null;
  respiratory: boolean; respiratoryDetails?: string | null;
  gastrointestinal: boolean; gastrointestinalDetails?: string | null;
  std: boolean; stdDetails?: string | null;
  ckd: boolean; ckdDetails?: string | null;
  other: boolean; otherNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: UserBasic | null;
}

export interface NonPathologicalHistoryRec {
  physicalActivity: boolean; physicalActivityDetails?: string | null;
  smoking: boolean; smokingDetails?: string | null;
  alcohol: boolean; alcoholDetails?: string | null;
  drugs: boolean; drugsDetails?: string | null;
  recentImmunization: boolean;
  other: boolean; otherNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: UserBasic | null;
}

export interface FamilyHistoryRec {
  diabetes: boolean; diabetesDetails?: string | null;
  heartDisease: boolean; heartDiseaseDetails?: string | null;
  hypertension: boolean; hypertensionDetails?: string | null;
  thyroid: boolean; thyroidDetails?: string | null;
  ckd: boolean; ckdDetails?: string | null;
  other: boolean; otherNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: UserBasic | null;
}

export interface PatientOverview {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    dateOfBirth?: string | Date;
    gender?: 'male' | 'female';
    bloodType?: string;
    height?: number;
    weight?: number;
    maritalStatus?: string;
    occupation?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
  };
  metrics: HealthMetrics;
  trafficLight: 'verde' | 'amarillo' | 'rojo';
  summary: string;
  documents: Array<{ id: string; originalName: string; summary?: string | null; createdAt: string }>;
  medications: Medication[];
  findings: Finding[];
  diagnoses: Diagnosis[];
  symptoms: Symptom[];
  vitals?: PatientVitalRec[];
  allergies?: PatientAllergyRec[];
  vaccines?: PatientVaccineRec[];
  pathological?: PathologicalHistoryRec | null;
  nonPathological?: NonPathologicalHistoryRec | null;
  family?: FamilyHistoryRec | null;
}

export interface ClinicalHistory {
  id: string;
  patient: UserBasic;
  createdBy?: UserBasic | null;
  surgicalHistory?: string | null;
  currentMedications?: string | null;
  familyHistory?: string | null;
  pastIllnesses?: string | null;
  allergies?: string | null;
  immunizations?: string | null;
  gynecObstetricHistory?: string | null;
  socialHistory?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpsertClinicalHistoryInput = Partial<
  Omit<ClinicalHistory, 'id' | 'patient' | 'createdBy' | 'createdAt' | 'updatedAt'>
>;

// ===== Evolution notes =====

export interface CreateEvolutionNoteInput {
  title?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnoses?: string[];
  medications?: string[];
  procedures?: string;
  indications?: string;
}

export interface EvolutionNoteMinimal {
  id: string;
  status: 'DRAFT' | 'SIGNED' | 'AMENDED';
  title?: string | null;
  pdfSha256?: string | null;
  createdAt: string;
  signedAt?: string | null;
  revision?: number;
  amendedAt?: string | null;
  amendmentReason?: string | null;
  updatedBy?: { id: string; firstName: string; lastName: string } | null;
  author?: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface EvolutionNoteFull extends EvolutionNoteMinimal {
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  content?: string | null;
  procedures?: string | null;
  indications?: string | null;
  diagnoses?: string[] | null;
  medications?: { items?: string[] } | null;
}

export interface UpdateEvolutionNoteInput {
  title?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  content?: string;
  procedures?: string;
  indications?: string;
  diagnoses?: string[];
  medications?: string[];
  amendmentReason?: string;
  expectedRevision: number;
}

export interface NoteHistoryEntry {
  revision: number;
  changedAt: string;
  reason?: string | null;
  changedBy?: { id: string; firstName: string; lastName: string } | null;
  changes: Record<string, { from: unknown; to: unknown }>;
}

export interface NoteHistory {
  noteId: string;
  revision: number;
  createdAt: string;
  signedAt?: string | null;
  author?: { id: string; firstName: string; lastName: string } | null;
  entries: NoteHistoryEntry[];
}

// ===== Lab results =====

export type LabResultStatus = 'normal' | 'high' | 'low' | 'positive' | 'negative' | 'unknown';

export interface LabResult {
  id: string;
  patientId: string;
  documentId?: string;
  analyteName: string;
  analyteNormalized: string;
  studyType?: string;
  valueNumeric?: number;
  valueText?: string;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  refText?: string;
  status: LabResultStatus;
  studyDate?: string;
  rawText?: string;
  pageNumber?: number;
  createdAt: string;
  document?: { id: string; originalName: string };
}

export interface LabResultHistory {
  analyteNormalized: string;
  analyteName: string;
  unit?: string;
  dataPoints: Array<{
    date: string;
    value: number;
    status: LabResultStatus;
    refLow?: number;
    refHigh?: number;
  }>;
}

export interface LabResultSummary {
  totalResults: number;
  normalCount: number;
  abnormalCount: number;
  lastStudyDate?: string;
  uniqueAnalytes: number;
}

export interface LabExpertProbableDiagnosis {
  name: string;
  confidence: 'alta' | 'moderada' | 'baja';
  evidence: string[];
  icd10?: string;
}

export interface LabExpertSuggestedFollowUp {
  test: string;
  rationale: string;
  priority: 'alta' | 'media' | 'baja';
}

export interface LabExpertReport {
  id: string;
  patientId: string;
  narrative: string;
  probableDiagnoses: LabExpertProbableDiagnosis[];
  suggestedFollowUps: LabExpertSuggestedFollowUp[];
  redFlags: string[];
  analytesConsidered: number;
  measurementsConsidered: number;
  inputHash: string;
  createdAt: string;
  updatedAt: string;
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deliberate latency so agent-driven navigation reads as visible steps. */
const delay = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const nowIso = () => new Date().toISOString();

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status, data: { message } } });

/** Accent-insensitive lowercase + the synonym map the production normalizer uses. */
export function normalizeAnalyte(raw: string): string {
  const base = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  const SYNONYMS: Record<string, string> = {
    creatinina: 'creatinina suero',
    'creatinina en suero': 'creatinina suero',
    creatinine: 'creatinina suero',
    'serum creatinine': 'creatinina suero',
    'hemoglobina glucosilada': 'hba1c',
    'hemoglobina glicosilada': 'hba1c',
    a1c: 'hba1c',
    glucose: 'glucosa',
    urea: 'urea',
    cholesterol: 'colesterol total',
    triglycerides: 'trigliceridos',
  };
  return SYNONYMS[base] ?? base;
}

function buildPdf(title: string, blocks: Array<{ heading?: string; body: string }>): Blob {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 56;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(title, margin, y);
  y += 14;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text('Healthy Record — demo pública con datos 100 % sintéticos (OpenAI WebMCP Challenge)', margin, y);
  pdf.setTextColor(0);
  y += 24;
  for (const block of blocks) {
    if (block.heading) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      if (y > 720) { pdf.addPage(); y = margin; }
      pdf.text(block.heading, margin, y);
      y += 16;
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(block.body, width) as string[];
    for (const line of lines) {
      if (y > 740) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += 14;
    }
    y += 8;
  }
  return pdf.output('blob');
}

function documentPdfBlob(documentId: string): Blob {
  const d = DOCUMENTS.find((x) => x.id === documentId);
  if (!d) throw httpError(404, 'Documento no encontrado');
  const rows = LAB_RESULTS.filter((r) => r.documentId === documentId);
  const blocks: Array<{ heading?: string; body: string }> = [];
  if (rows.length) {
    const byStudy = new Map<string, LabResult[]>();
    for (const r of rows) {
      const k = r.studyType ?? 'Resultados';
      byStudy.set(k, [...(byStudy.get(k) ?? []), r]);
    }
    for (const [study, list] of byStudy) {
      blocks.push({
        heading: study,
        body: list
          .map((r) => {
            const val = r.valueNumeric != null ? `${r.valueNumeric} ${r.unit ?? ''}`.trim() : r.valueText ?? '—';
            const ref = r.refLow != null || r.refHigh != null ? ` [ref: ${r.refLow ?? ''}-${r.refHigh ?? ''}]` : r.refText ? ` [ref: ${r.refText}]` : '';
            const flag = r.status === 'high' ? '  (ALTO)' : r.status === 'low' ? '  (BAJO)' : r.status === 'positive' ? '  (POSITIVO)' : '';
            return `${r.analyteName}: ${val}${ref}${flag}`;
          })
          .join('\n'),
      });
    }
  } else {
    blocks.push({ body: d.summary ?? 'Documento de demostración sin contenido estructurado.' });
  }
  return buildPdf(d.originalName, blocks);
}

function notePdfBlob(note: EvolutionNoteFull): Blob {
  return buildPdf(`Nota de evolución — ${note.title ?? note.id}`, [
    { heading: 'Subjetivo', body: note.subjective ?? '—' },
    { heading: 'Objetivo', body: note.objective ?? '—' },
    { heading: 'Análisis', body: note.assessment ?? '—' },
    { heading: 'Plan', body: note.plan ?? '—' },
    ...(note.diagnoses?.length ? [{ heading: 'Diagnósticos', body: note.diagnoses.join('\n') }] : []),
    ...(note.medications?.items?.length ? [{ heading: 'Medicamentos', body: note.medications.items.join('\n') }] : []),
    { heading: 'Estado', body: `${note.status} · Revisión ${note.revision ?? 1} · Dr. ${DOCTOR_MIN.firstName} ${DOCTOR_MIN.lastName} · Céd. Prof. 10203040` },
  ]);
}

// ---------------------------------------------------------------------------
// Patients / overview / clinical history
// ---------------------------------------------------------------------------

export async function listMyPatients(): Promise<UserBasic[]> {
  await delay(300);
  return [...PATIENTS];
}

export async function listClinicPatients(): Promise<UserBasic[]> {
  return listMyPatients();
}

export async function getPatientOverview(
  patientId: string,
  _noSummary = false,
  _importFromHistory = false,
): Promise<PatientOverview> {
  await delay(420);
  const o = OVERVIEWS[patientId];
  if (!o) throw httpError(404, 'Paciente no encontrado');
  return structuredClone(o);
}

export async function getClinicalHistory(patientId: string): Promise<ClinicalHistory | null> {
  await delay(200);
  return CLINICAL_HISTORIES[patientId] ?? null;
}

export async function upsertClinicalHistory(
  patientId: string,
  input: UpsertClinicalHistoryInput,
): Promise<ClinicalHistory> {
  await delay(200);
  const existing = CLINICAL_HISTORIES[patientId];
  if (!existing) throw httpError(404, 'Paciente no encontrado');
  Object.assign(existing, input, { updatedAt: nowIso() });
  return existing;
}

// ---------------------------------------------------------------------------
// Vitals
// ---------------------------------------------------------------------------

export const listPatientVitals = async (
  patientId: string,
  opts?: { from?: string; to?: string; limit?: number },
): Promise<PatientVitalRec[]> => {
  await delay(240);
  let rows = [...(VITALS[patientId] ?? [])];
  if (opts?.from) rows = rows.filter((r) => (r.recordedAt ?? r.createdAt) >= opts.from!);
  if (opts?.to) rows = rows.filter((r) => (r.recordedAt ?? r.createdAt) <= opts.to!);
  rows.sort((a, b) => (b.recordedAt ?? b.createdAt).localeCompare(a.recordedAt ?? a.createdAt));
  if (opts?.limit) rows = rows.slice(0, opts.limit);
  return rows;
};

export async function createPatientVital(patientId: string, dto: CreateVitalDto): Promise<PatientVitalRec> {
  await delay(220);
  const list = (VITALS[patientId] ??= []);
  const heightM = dto.heightM ?? list.find((v) => v.heightM)?.heightM ?? null;
  const bmi =
    dto.bmi ?? (dto.weightKg && heightM ? Number((dto.weightKg / (heightM * heightM)).toFixed(1)) : null);
  const rec: PatientVitalRec = {
    id: `vit-${Math.random().toString(36).slice(2, 9)}`,
    ...dto,
    heightM,
    bmi,
    recordedAt: dto.recordedAt ?? nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    createdBy: { ...DOCTOR_MIN } as UserBasic,
  };
  list.unshift(rec);
  return rec;
}

export async function deletePatientVital(patientId: string, vitalId: string): Promise<void> {
  await delay(180);
  const list = VITALS[patientId] ?? [];
  const i = list.findIndex((v) => v.id === vitalId);
  if (i >= 0) list.splice(i, 1);
}

// ---------------------------------------------------------------------------
// Evolution notes
// ---------------------------------------------------------------------------

let noteSeq = 100;

export async function listEvolutionNotes(_patientId: string): Promise<EvolutionNoteMinimal[]> {
  await delay(280);
  return NOTES.map(({ subjective, objective, assessment, plan, content, procedures, indications, diagnoses, medications, ...minimal }) => ({
    ...minimal,
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEvolutionNote(noteId: string): Promise<EvolutionNoteFull> {
  await delay(200);
  const n = NOTES.find((x) => x.id === noteId);
  if (!n) throw httpError(404, 'Nota no encontrada');
  return structuredClone(n);
}

export async function signEvolutionNote(
  _patientId: string,
  input: CreateEvolutionNoteInput,
  _signingPassword?: string,
): Promise<EvolutionNoteMinimal> {
  await delay(350);
  const created: EvolutionNoteFull = {
    id: `note-${++noteSeq}`,
    status: 'SIGNED',
    title: input.title ?? 'Nota de evolución',
    createdAt: nowIso(),
    signedAt: nowIso(),
    revision: 1,
    author: DOCTOR_MIN,
    subjective: input.subjective,
    objective: input.objective,
    assessment: input.assessment,
    plan: input.plan,
    procedures: input.procedures ?? null,
    indications: input.indications ?? null,
    diagnoses: input.diagnoses ?? [],
    medications: { items: input.medications ?? [] },
  };
  NOTES.unshift(created);
  return created;
}

/**
 * Demo-only entry point used by the WebMCP `draft_note` tool: creates a DRAFT
 * the physician must review and sign in the UI. Write tools never commit
 * clinical content on their own.
 */
export async function createDraftNote(
  _patientId: string,
  input: CreateEvolutionNoteInput,
): Promise<EvolutionNoteFull> {
  await delay(300);
  const draft: EvolutionNoteFull = {
    id: `note-${++noteSeq}`,
    status: 'DRAFT',
    title: input.title ?? 'Borrador de nota',
    createdAt: nowIso(),
    signedAt: null,
    revision: 1,
    author: DOCTOR_MIN,
    subjective: input.subjective,
    objective: input.objective,
    assessment: input.assessment,
    plan: input.plan,
    diagnoses: input.diagnoses ?? [],
    medications: { items: input.medications ?? [] },
  };
  NOTES.unshift(draft);
  return draft;
}

/**
 * Demo-only: the physician approves an agent-drafted note from the Notes
 * section. The agent can create DRAFTs; only this human action signs them.
 */
export async function signDraftNote(noteId: string): Promise<EvolutionNoteMinimal> {
  await delay(300);
  const n = NOTES.find((x) => x.id === noteId);
  if (!n) throw httpError(404, 'Nota no encontrada');
  if (n.status === 'DRAFT') {
    n.status = 'SIGNED';
    n.signedAt = nowIso();
  }
  return structuredClone(n);
}

export async function updateEvolutionNote(
  noteId: string,
  input: UpdateEvolutionNoteInput,
): Promise<EvolutionNoteFull> {
  await delay(300);
  const n = NOTES.find((x) => x.id === noteId);
  if (!n) throw httpError(404, 'Nota no encontrada');
  const currentRevision = n.revision ?? 1;
  if (input.expectedRevision !== currentRevision) {
    throw httpError(409, 'La nota fue modificada por alguien más. Recarga e intenta de nuevo.');
  }
  const { expectedRevision, amendmentReason, medications, ...fields } = input;
  const changes: NoteHistoryEntry['changes'] = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && (n as unknown as Record<string, unknown>)[k] !== v) {
      changes[k] = { from: (n as unknown as Record<string, unknown>)[k], to: v };
      (n as unknown as Record<string, unknown>)[k] = v;
    }
  }
  if (medications) n.medications = { items: medications };
  n.revision = currentRevision + 1;
  n.updatedBy = { id: DOCTOR_MIN.id, firstName: DOCTOR_MIN.firstName, lastName: DOCTOR_MIN.lastName };
  if (n.status === 'SIGNED') {
    n.status = 'AMENDED';
    n.amendedAt = nowIso();
    n.amendmentReason = amendmentReason ?? null;
  }
  noteHistoryEntries(noteId).push({
    revision: n.revision,
    changedAt: nowIso(),
    reason: amendmentReason ?? null,
    changedBy: { id: DOCTOR_MIN.id, firstName: DOCTOR_MIN.firstName, lastName: DOCTOR_MIN.lastName },
    changes,
  });
  return structuredClone(n);
}

const NOTE_HISTORY = new Map<string, NoteHistoryEntry[]>();
function noteHistoryEntries(noteId: string): NoteHistoryEntry[] {
  if (!NOTE_HISTORY.has(noteId)) NOTE_HISTORY.set(noteId, []);
  return NOTE_HISTORY.get(noteId)!;
}

export async function getNoteHistory(noteId: string): Promise<NoteHistory> {
  await delay(220);
  const n = NOTES.find((x) => x.id === noteId);
  if (!n) throw httpError(404, 'Nota no encontrada');
  return {
    noteId,
    revision: n.revision ?? 1,
    createdAt: n.createdAt,
    signedAt: n.signedAt,
    author: n.author ? { id: n.author.id, firstName: n.author.firstName, lastName: n.author.lastName } : null,
    entries: [...noteHistoryEntries(noteId)].reverse(),
  };
}

export async function fetchEvolutionPdfObjectUrl(noteId: string): Promise<string> {
  await delay(260);
  const n = NOTES.find((x) => x.id === noteId);
  if (!n) throw httpError(404, 'Nota no encontrada');
  return URL.createObjectURL(notePdfBlob(n));
}

export async function openEvolutionPdf(noteId: string): Promise<void> {
  const url = await fetchEvolutionPdfObjectUrl(noteId);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function deleteEvolutionNote(noteId: string): Promise<void> {
  await delay(220);
  const i = NOTES.findIndex((x) => x.id === noteId);
  if (i >= 0) NOTES.splice(i, 1);
}

// ---------------------------------------------------------------------------
// Documents / imaging
// ---------------------------------------------------------------------------

export async function listDocumentsForPatientAsDoctor(
  patientId: string,
  _signal?: AbortSignal,
): Promise<EhrDocument[]> {
  await delay(260);
  return DOCUMENTS.filter((d) => d.ownerId === patientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listImagingStudiesForPatient(_patientId: string): Promise<ImagingStudy[]> {
  await delay(200);
  return [];
}

// Documents that exist as pre-rendered static assets (e.g. the "scanned"
// April 2025 report, generated by scripts/generate-scanned-pdf.mjs).
const STATIC_DOCUMENT_PDFS: Record<string, string> = {
  'doc-lab-3': '/documents/doc-lab-3.pdf',
};

async function getDocumentBlob(documentId: string): Promise<Blob> {
  const staticPath = STATIC_DOCUMENT_PDFS[documentId];
  if (staticPath) {
    try {
      const res = await fetch(staticPath);
      if (res.ok) return await res.blob();
    } catch {
      /* fall through to the generated PDF */
    }
  }
  return documentPdfBlob(documentId);
}

export async function fetchDocumentBlobUrl(id: string): Promise<{ url: string; contentType: string }> {
  await delay(300);
  return { url: URL.createObjectURL(await getDocumentBlob(id)), contentType: 'application/pdf' };
}

export async function fetchDoctorPatientDocumentBlob(
  _patientId: string,
  documentId: string,
  _signal?: AbortSignal,
): Promise<{ blob: Blob; contentType: string }> {
  await delay(300);
  return { blob: await getDocumentBlob(documentId), contentType: 'application/pdf' };
}

export async function deleteDocument(id: string): Promise<void> {
  await delay(200);
  const i = DOCUMENTS.findIndex((d) => d.id === id);
  if (i >= 0) DOCUMENTS.splice(i, 1);
}

export async function deleteDocumentForPatient(_patientId: string, documentId: string): Promise<void> {
  return deleteDocument(documentId);
}

export async function reprocessLabDocument(documentId: string): Promise<{ extracted: number; message?: string }> {
  await delay(600);
  return { extracted: LAB_RESULTS.filter((r) => r.documentId === documentId).length, message: 'Demo: resultados ya extraídos.' };
}

export async function reprocessLabDocumentForPatient(
  _patientId: string,
  documentId: string,
): Promise<{ extracted: number; message?: string }> {
  return reprocessLabDocument(documentId);
}

// ---------------------------------------------------------------------------
// Lab results
// ---------------------------------------------------------------------------

export async function getPatientLabResults(
  patientId: string,
  opts?: { documentId?: string; status?: LabResultStatus; limit?: number; startDate?: string; endDate?: string },
): Promise<LabResult[]> {
  await delay(320);
  let rows = LAB_RESULTS.filter((r) => r.patientId === patientId);
  if (opts?.documentId) rows = rows.filter((r) => r.documentId === opts.documentId);
  if (opts?.status) rows = rows.filter((r) => r.status === opts.status);
  if (opts?.startDate) rows = rows.filter((r) => (r.studyDate ?? '') >= opts.startDate!);
  if (opts?.endDate) rows = rows.filter((r) => (r.studyDate ?? '') <= opts.endDate!);
  rows = [...rows].sort(
    (a, b) => (b.studyDate ?? '').localeCompare(a.studyDate ?? '') || a.analyteName.localeCompare(b.analyteName),
  );
  if (opts?.limit) rows = rows.slice(0, opts.limit);
  return rows;
}

export async function getPatientLabSummary(patientId: string): Promise<LabResultSummary> {
  await delay(240);
  const rows = LAB_RESULTS.filter((r) => r.patientId === patientId);
  const abnormal = rows.filter((r) => r.status === 'high' || r.status === 'low' || r.status === 'positive');
  return {
    totalResults: rows.length,
    normalCount: rows.filter((r) => r.status === 'normal' || r.status === 'negative').length,
    abnormalCount: abnormal.length,
    lastStudyDate: rows.map((r) => r.studyDate ?? '').sort().at(-1) || undefined,
    uniqueAnalytes: new Set(rows.map((r) => r.analyteNormalized)).size,
  };
}

export async function getAnalyteHistory(
  patientId: string,
  analyteNormalized: string,
  limit?: number,
): Promise<LabResultHistory | null> {
  await delay(360);
  const wanted = normalizeAnalyte(analyteNormalized);
  let rows = LAB_RESULTS.filter(
    (r) => r.patientId === patientId && r.analyteNormalized === wanted && r.valueNumeric != null && r.studyDate,
  );
  if (!rows.length) {
    // Raw / partial fallback, like the production endpoint: accept the stored
    // key verbatim or a distinctive substring of it (agents ask in many ways).
    rows = LAB_RESULTS.filter(
      (r) =>
        r.patientId === patientId &&
        r.valueNumeric != null &&
        r.studyDate &&
        (r.analyteNormalized === analyteNormalized || r.analyteNormalized.includes(wanted)),
    );
  }
  if (!rows.length) return null;
  rows.sort((a, b) => (a.studyDate ?? '').localeCompare(b.studyDate ?? ''));
  const byDay = new Map<string, LabResult>();
  for (const r of rows) byDay.set((r.studyDate ?? '').slice(0, 10), r); // keep last per calendar day
  let points = [...byDay.values()];
  if (limit) points = points.slice(-limit);
  const last = points[points.length - 1];
  return {
    analyteNormalized: last.analyteNormalized,
    analyteName: last.analyteName,
    unit: last.unit,
    dataPoints: points.map((r) => ({
      date: r.studyDate as string,
      value: r.valueNumeric as number,
      status: r.status,
      refLow: r.refLow,
      refHigh: r.refHigh,
    })),
  };
}

export async function getLabExpertAnalysis(patientId: string): Promise<LabExpertReport | null> {
  await delay(500);
  return LAB_EXPERT[patientId] ? structuredClone(LAB_EXPERT[patientId]) : null;
}

export async function regenerateLabExpertAnalysis(patientId: string): Promise<LabExpertReport | null> {
  await delay(900);
  return getLabExpertAnalysis(patientId);
}
