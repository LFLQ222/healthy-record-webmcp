import i18n from '../i18n';

/** Campos usados en auditoría de registros clínicos (nombre + rol + cédula / clínica). */
export type CreatedByAuditUser = {
  firstName?: string;
  lastName?: string;
  role?: string | null;
  specialty?: string | null;
  professionalLicense?: string | null;
  clinic?: { id: string; name: string } | null;
} | null | undefined;

export interface CreatedByAuditLines {
  primary: string;
  secondary: string | null;
}

export function formatCreatedByForAudit(user: CreatedByAuditUser): CreatedByAuditLines {
  if (!user?.firstName && !user?.lastName) {
    return { primary: i18n.t('createdByDisplay:system'), secondary: null };
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const role = (user.role || '').toLowerCase();

  // El paciente que se autorregistra NO es personal clínico: nunca debe
  // mostrarse como "Dr." ni con cédula/clínica del consultorio.
  if (role === 'patient') {
    return { primary: name, secondary: i18n.t('createdByDisplay:patient') };
  }

  // Solo el médico lleva el prefijo "Dr." (con cédula/clínica si las tiene).
  // Enfermería, recepción, admin, etc. se muestran con su nombre tal cual.
  const isDoctor = role === 'doctor';
  const primary = isDoctor ? i18n.t('createdByDisplay:doctorName', { name }) : name;

  const bits: string[] = [];
  if (user.professionalLicense?.trim()) bits.push(i18n.t('createdByDisplay:license', { license: user.professionalLicense.trim() }));
  if (user.clinic?.name?.trim()) bits.push(i18n.t('createdByDisplay:clinic', { clinic: user.clinic.name.trim() }));
  return { primary, secondary: bits.length ? bits.join(' · ') : null };
}
