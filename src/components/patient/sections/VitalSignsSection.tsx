/**
 * VitalSignsSection — constantes vitales + histórico cronológico.
 *
 * Comparte expediente con HealthSummarySection, así que comparte su sistema:
 * cuatro pasos de tipografía, dos pesos, el color sólo en el texto (nunca en
 * una barra al margen ni en un panel teñido) y hairline como único separador.
 *
 * Vista: una sola superficie con 12 celdas separadas por hairline; la cifra de
 * una constante fuera de rango sube al paso 1 y se tiñe, con punto + palabra
 * como codificación redundante para daltonismo.
 *
 * Histórico: cabeceras al paso 4, celdas al paso 3, tabular-nums sólo en las
 * columnas numéricas. Sin tinte de fila.
 */

import { dateLocale } from '../../../utils/dateLocale';
import React from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  Skeleton,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  useTheme,
  useMediaQuery,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  BRAND,
  RADIUS,
  glassSx,
  elevations,
  primaryButtonSx,
  secondaryButtonSx,
} from '../../common/designTokens';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HeightIcon from '@mui/icons-material/Height';
import WeightIcon from '@mui/icons-material/FitnessCenter';
import TempIcon from '@mui/icons-material/Thermostat';
import RespIcon from '@mui/icons-material/Air';
import HeartIcon from '@mui/icons-material/Favorite';
import BloodPressureIcon from '@mui/icons-material/BloodtypeRounded';
import PercentIcon from '@mui/icons-material/PercentRounded';
import ChildIcon from '@mui/icons-material/ChildCare';
import OxygenIcon from '@mui/icons-material/Bloodtype';
import EditIcon from '@mui/icons-material/EditOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  listPatientVitals,
  type PatientVitalRec,
  getClinicalHistory,
  type ClinicalHistory,
  upsertClinicalHistory,
  deletePatientVital,
  createPatientVital,
  type CreateVitalDto,
} from '../../../services/ehrService';
import { useNotify } from '../../../context/NotificationContext';
import { formatCreatedByForAudit } from '../../../utils/createdByDisplay';
import { useAnalyteGraph } from '../AnalyteGraphProvider';
import { classifyVitalValue as classifyVital, VITAL_METRIC_RULE } from '../vitalMetrics';
import type { VitalMetricKey, VitalStatus } from '../vitalMetrics';

interface VitalSignsSectionProps {
  patientId: string;
  onDataChange?: () => void;
}

interface VitalsState {
  heightM: string;
  weightKg: string;
  temperatureC: string;
  respRate: string;
  systole: string;
  diastole: string;
  heartRate: string;
  bodyFatPct: string;
  leanBodyMassPct: string;
  headCircumferenceCm: string;
  oxygenSaturationPct: string;
}

/** Los umbrales viven en vitalMetrics para que la gráfica derive de ellos alto/bajo. */
type Status = VitalStatus;

/**
 * Escala tipográfica — los mismos cuatro pasos que HealthSummarySection. Si algo
 * debe destacar se sube de paso; no se pone en negrita.
 */
const T_VALUE = '1.75rem'; // paso 1 — sólo la cifra de una constante fuera de rango
const T_TITLE = '1.125rem'; // paso 2 — títulos de sección y cifras de constante
const T_BODY = '0.9375rem'; // paso 3 — cuerpo
const T_META = '0.75rem'; // paso 4 — satélites

/** Ritmo vertical: dentro de bloque · entre bloques de una capa · entre capas. */
const GAP_IN = 1;
const GAP_BLOCK = 2;
const GAP_LAYER = 4;

/** Separador primario de la sección; el borde glass queda como decoración. */
const hairline = (isDark: boolean) => alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.08 : 0.06);

/** Tope del histórico que pide el backend; el conteo lo delata en pantalla. */
const HISTORY_LIMIT = 20;

const listStagger = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { when: 'beforeChildren', staggerChildren: 0.03 },
  },
} as const;

const itemFade = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as any },
  },
} as const;

const statusColor: Record<Status, string> = {
  normal: BRAND.success,
  warning: BRAND.warning,
  critical: BRAND.danger,
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const nowTimeLocal = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

interface VitalCellProps {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  status: Status;
  statusLabel: string;
  /** Ausente = celda inerte (métrica sin histórico graficable). */
  onOpenGraph?: () => void;
  graphAriaLabel?: string;
}

/**
 * Celda de la banda de constantes: sin superficie propia, sin bucket.
 * Con dato es pulsable y abre la evolución; la única afordancia es el subrayado
 * de la etiqueta en hover, sin fondo teñido.
 * Declarada fuera del componente para que React no la remonte en cada render.
 */
const VitalCell = ({
  icon: Icon,
  label,
  value,
  unit,
  status,
  statusLabel,
  onOpenGraph,
  graphAriaLabel,
}: VitalCellProps) => {
  const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
  const abnormal = hasValue && status !== 'normal';
  const sc = statusColor[status];
  const clickable = hasValue && !!onOpenGraph;
  // El nombre accesible de un role=button sustituye a su contenido: si sólo
  // dijera "ver evolución", un lector de pantalla perdería la cifra.
  const cellAriaLabel = `${label}: ${value} ${unit}${abnormal ? `, ${statusLabel}` : ''}. ${graphAriaLabel ?? ''}`.trim();

  return (
    <Box
      component={motion.div as any}
      variants={itemFade}
      {...(clickable
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': cellAriaLabel,
            onClick: onOpenGraph,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenGraph?.();
              }
            },
          }
        : {})}
      sx={{
        px: 1.5,
        py: 1.25,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        ...(clickable && {
          cursor: 'pointer',
          '&:hover .vital-cell-label': {
            textDecoration: 'underline',
            textDecorationColor: alpha(BRAND.primary, 0.6),
            textUnderlineOffset: '3px',
          },
          '&:focus-visible': {
            outline: `2px solid ${alpha(BRAND.primary, 0.6)}`,
            outlineOffset: '-2px',
          },
        }),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        <Icon sx={{ fontSize: 12, color: 'text.secondary', flexShrink: 0 }} />
        <Typography
          className="vital-cell-label"
          sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary', lineHeight: 1.3 }}
        >
          {label}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            // Único uso del paso 1 en la sección: la cifra alterada.
            fontSize: abnormal ? T_VALUE : T_TITLE,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: abnormal ? '-0.02em' : undefined,
            color: !hasValue ? 'text.secondary' : abnormal ? sc : 'text.primary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {hasValue ? value : '—'}
        </Typography>
        <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
          {unit}
        </Typography>
      </Stack>
      {abnormal && (
        <Stack direction="row" alignItems="center" spacing={0.4}>
          {/* Punto + palabra: el color no viaja solo, por daltonismo. */}
          <Box aria-hidden sx={{ width: 5, height: 5, borderRadius: '50%', background: sc }} />
          <Typography sx={{ fontSize: T_META, fontWeight: 400, color: sc }}>
            {statusLabel}
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

export function VitalSignsSection({ patientId, onDataChange }: VitalSignsSectionProps) {
  const { t } = useTranslation('vitalSignsSection');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();
  const { openVitalGraph } = useAnalyteGraph();

  const statusLabel: Record<Status, string> = {
    normal: t('status.normal'),
    warning: t('status.warning'),
    critical: t('status.critical'),
  };

  const { data: vitalsHistory, isLoading: vhLoading, refetch: refetchVitals } = useQuery<
    PatientVitalRec[]
  >({
    queryKey: ['patientVitals', patientId],
    queryFn: () => listPatientVitals(patientId, { limit: HISTORY_LIMIT }),
    enabled: !!patientId,
  });

  const { data: ch, refetch: refetchCh } = useQuery<ClinicalHistory | null>({
    queryKey: ['clinicalHistoryByPatient', patientId],
    queryFn: () => getClinicalHistory(patientId),
    enabled: !!patientId,
  });

  const parseExtended = React.useCallback((): any => {
    try {
      const obj = ch?.notes ? JSON.parse(ch.notes) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  }, [ch?.notes]);

  const extInit = parseExtended();
  const [editVitals, setEditVitals] = React.useState(false);
  const [confirmVitalsOpen, setConfirmVitalsOpen] = React.useState(false);
  const [confirmDeleteVitalId, setConfirmDeleteVitalId] = React.useState<string | null>(null);
  const [savingSection, setSavingSection] = React.useState<string | null>(null);
  const [deletingVital, setDeletingVital] = React.useState(false);
  const [auditVital, setAuditVital] = React.useState<PatientVitalRec | null>(null);
  const [recordedDate, setRecordedDate] = React.useState<string>(todayLocal());
  const [recordedTime, setRecordedTime] = React.useState<string>(nowTimeLocal());

  React.useEffect(() => {
    if (editVitals) {
      setRecordedDate(todayLocal());
      setRecordedTime(nowTimeLocal());
    }
  }, [editVitals]);

  const recordedAtDate = React.useMemo(() => {
    if (!recordedDate) return null;
    const dt = new Date(`${recordedDate}T${recordedTime || '12:00'}`);
    return isNaN(dt.getTime()) ? null : dt;
  }, [recordedDate, recordedTime]);

  const [vitals, setVitals] = React.useState<VitalsState>(() => ({
    heightM: extInit?.vitals?.heightM ?? '',
    weightKg: extInit?.vitals?.weightKg ?? '',
    temperatureC: extInit?.vitals?.temperatureC ?? '',
    respRate: extInit?.vitals?.respRate ?? '',
    systole: extInit?.vitals?.systole ?? '',
    diastole: extInit?.vitals?.diastole ?? '',
    heartRate: extInit?.vitals?.heartRate ?? '',
    bodyFatPct: extInit?.vitals?.bodyFatPct ?? '',
    leanBodyMassPct: extInit?.vitals?.leanBodyMassPct ?? '',
    headCircumferenceCm: extInit?.vitals?.headCircumferenceCm ?? '',
    oxygenSaturationPct: extInit?.vitals?.oxygenSaturationPct ?? '',
  }));

  React.useEffect(() => {
    const ext = parseExtended();
    setVitals({
      heightM: ext?.vitals?.heightM ?? '',
      weightKg: ext?.vitals?.weightKg ?? '',
      temperatureC: ext?.vitals?.temperatureC ?? '',
      respRate: ext?.vitals?.respRate ?? '',
      systole: ext?.vitals?.systole ?? '',
      diastole: ext?.vitals?.diastole ?? '',
      heartRate: ext?.vitals?.heartRate ?? '',
      bodyFatPct: ext?.vitals?.bodyFatPct ?? '',
      leanBodyMassPct: ext?.vitals?.leanBodyMassPct ?? '',
      headCircumferenceCm: ext?.vitals?.headCircumferenceCm ?? '',
      oxygenSaturationPct: ext?.vitals?.oxygenSaturationPct ?? '',
    });
  }, [ch?.id, ch?.notes]);

  const bmi = React.useMemo(() => {
    const h = parseFloat(String(vitals.heightM || ''));
    const w = parseFloat(String(vitals.weightKg || ''));
    if (!h || !w) return '';
    const v = w / (h * h);
    return v ? v.toFixed(2) : '';
  }, [vitals.heightM, vitals.weightKg]);

  // `metric` = campo del histórico (PatientVitalRec) que grafica esa celda; la TA
  // se abre como dos series independientes, nunca como promedio.
  const vitalConfig: {
    key: string;
    label: string;
    icon: React.ElementType;
    value: string;
    unit: string;
    vital: string;
    metric: VitalMetricKey;
  }[] = [
    { key: 'heightM', label: t('metrics.height'), icon: HeightIcon, value: vitals.heightM, unit: 'm', vital: 'height', metric: 'heightM' },
    { key: 'weightKg', label: t('metrics.weight'), icon: WeightIcon, value: vitals.weightKg, unit: 'kg', vital: 'weight', metric: 'weightKg' },
    { key: 'bmi', label: t('metrics.bmi'), icon: PercentIcon, value: bmi, unit: 'kg/m²', vital: 'bmi', metric: 'bmi' },
    { key: 'temperatureC', label: t('metrics.temperature'), icon: TempIcon, value: vitals.temperatureC, unit: '°C', vital: 'temperature', metric: 'temperatureC' },
    { key: 'respRate', label: t('metrics.respRate'), icon: RespIcon, value: vitals.respRate, unit: 'rpm', vital: 'respRate', metric: 'respRate' },
    { key: 'systole', label: t('metrics.systole'), icon: BloodPressureIcon, value: vitals.systole, unit: 'mmHg', vital: 'systole', metric: 'systole' },
    { key: 'diastole', label: t('metrics.diastole'), icon: BloodPressureIcon, value: vitals.diastole, unit: 'mmHg', vital: 'diastole', metric: 'diastole' },
    { key: 'heartRate', label: t('metrics.heartRate'), icon: HeartIcon, value: vitals.heartRate, unit: 'bpm', vital: 'heartRate', metric: 'heartRate' },
    { key: 'oxygenSaturationPct', label: t('metrics.oxygenSaturation'), icon: OxygenIcon, value: vitals.oxygenSaturationPct, unit: '%', vital: 'oxygenSaturation', metric: 'oxygenSaturationPct' },
    { key: 'bodyFatPct', label: t('metrics.bodyFat'), icon: PercentIcon, value: vitals.bodyFatPct, unit: '%', vital: 'bodyFat', metric: 'bodyFatPct' },
    { key: 'leanBodyMassPct', label: t('metrics.leanMass'), icon: WeightIcon, value: vitals.leanBodyMassPct, unit: '%', vital: 'leanMass', metric: 'leanBodyMassPct' },
    { key: 'headCircumferenceCm', label: t('metrics.headCircumference'), icon: ChildIcon, value: vitals.headCircumferenceCm, unit: 'cm', vital: 'head', metric: 'headCircumferenceCm' },
  ];

  // Sólo es pulsable la métrica que existe en el histórico: un click que sólo
  // puede terminar en "sin datos" no es afordancia, es ruido.
  const metricsWithHistory = React.useMemo(() => {
    const keys = Object.keys(VITAL_METRIC_RULE) as VitalMetricKey[];
    const present = new Set<VitalMetricKey>();
    (vitalsHistory ?? []).forEach((rec) => {
      keys.forEach((m) => {
        if (rec[m] !== null && rec[m] !== undefined) present.add(m);
      });
    });
    return present;
  }, [vitalsHistory]);

  const handleSaveVitals = async () => {
    setSavingSection('vitals');
    try {
      const vitalDto: CreateVitalDto = {
        heightM: vitals.heightM ? parseFloat(vitals.heightM) : undefined,
        weightKg: vitals.weightKg ? parseFloat(vitals.weightKg) : undefined,
        bmi: bmi ? parseFloat(bmi) : undefined,
        temperatureC: vitals.temperatureC ? parseFloat(vitals.temperatureC) : undefined,
        respRate: vitals.respRate ? parseFloat(vitals.respRate) : undefined,
        systole: vitals.systole ? parseFloat(vitals.systole) : undefined,
        diastole: vitals.diastole ? parseFloat(vitals.diastole) : undefined,
        heartRate: vitals.heartRate ? parseFloat(vitals.heartRate) : undefined,
        bodyFatPct: vitals.bodyFatPct ? parseFloat(vitals.bodyFatPct) : undefined,
        leanBodyMassPct: vitals.leanBodyMassPct ? parseFloat(vitals.leanBodyMassPct) : undefined,
        headCircumferenceCm: vitals.headCircumferenceCm ? parseFloat(vitals.headCircumferenceCm) : undefined,
        oxygenSaturationPct: vitals.oxygenSaturationPct ? parseFloat(vitals.oxygenSaturationPct) : undefined,
        recordedAt: recordedAtDate ? recordedAtDate.toISOString() : undefined,
      };
      await createPatientVital(patientId, vitalDto);
      await refetchVitals();

      // El snapshot en la historia clínica (PUT /clinical-history) es solo-doctor:
      // si quien guarda es enfermera, toleramos el 403 para no abortar el flujo —
      // el signo vital ya quedó registrado, que es lo esencial y sí le está permitido.
      try {
        const ext = parseExtended();
        const next = { ...ext, vitals };
        await upsertClinicalHistory(patientId, { notes: JSON.stringify(next) });
        await refetchCh();
      } catch (chErr: any) {
        if (chErr?.response?.status !== 403) throw chErr;
      }

      setEditVitals(false);
      setConfirmVitalsOpen(false);
      onDataChange?.();
      notify({ message: t('notify.saveSuccess'), severity: 'success' });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('notify.saveError');
      notify({ message: Array.isArray(msg) ? msg.join('\n') : String(msg), severity: 'error' });
    } finally {
      setSavingSection(null);
    }
  };

  const handleDeleteVital = async (vitalId: string) => {
    try {
      setDeletingVital(true);
      await deletePatientVital(patientId, vitalId);
      await refetchVitals();
      setConfirmDeleteVitalId(null);
      onDataChange?.();
      notify({ message: t('notify.deleteSuccess'), severity: 'success' });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('notify.deleteError');
      notify({ message: String(msg), severity: 'error' });
    } finally {
      setDeletingVital(false);
    }
  };

  const line = hairline(isDark);
  /** Superficie única de la sección: borde + blur, sin sombra encima. */
  const panel = {
    ...glassSx(isDark, 'panel', { blur: 18, radius: RADIUS.lg }),
    // Mismo plano que Resumen de salud: sin esto la sección quedaba
    // a elevación 0 junto a vecinas a 1.
    boxShadow: elevations[1] as string,
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      ...glassSx(isDark, 'row', { blur: 14, radius: RADIUS.sm }),
      border: `1px solid ${line}`,
      fontSize: T_BODY,
      '& fieldset': { border: 'none' },
      '&:hover': { border: `1px solid ${alpha(BRAND.primary, isDark ? 0.3 : 0.22)}` },
      '&.Mui-focused': { border: `1px solid ${BRAND.primary}` },
    },
    '& .MuiInputLabel-root': { fontSize: T_BODY },
  } as const;

  /** Rejilla de constantes: hairline entre celdas, sin cajas ni tintes. */
  const cellGridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: 'repeat(2, 1fr)',
      sm: 'repeat(3, 1fr)',
      md: 'repeat(4, 1fr)',
      lg: 'repeat(6, 1fr)',
    },
    // El desplazamiento de 1px deja que el panel recorte el filo exterior y
    // evita el juego de nth-of-type por breakpoint.
    mt: '-1px',
    ml: '-1px',
    width: 'calc(100% + 1px)',
    '& > *': { borderLeft: `1px solid ${line}`, borderTop: `1px solid ${line}` },
  } as const;

  const numericCellSx = { fontVariantNumeric: 'tabular-nums' } as const;

  const pendingDeleteVital = confirmDeleteVitalId
    ? vitalsHistory?.find((v) => v.id === confirmDeleteVitalId)
    : undefined;

  const historyCount = vitalsHistory?.length ?? 0;
  // El backend recorta a HISTORY_LIMIT: el conteo lo dice en vez de callarlo.
  const historyCountLabel = `${historyCount}${historyCount >= HISTORY_LIMIT ? '+' : ''}`;

  const dialogPaperSx = {
    ...glassSx(isDark, 'floating', { blur: 28, radius: isMobile ? 0 : RADIUS.xl }),
    boxShadow: elevations[4] as string,
    overflow: 'hidden',
    border: `1px solid ${line}`,
  } as const;

  return (
    <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* 1 · Línea de encabezado — sin panel, sin icono, sin subtítulo */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: GAP_BLOCK }}>
        <Typography
          sx={{ fontSize: T_TITLE, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em' }}
        >
          {t('header.title')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          startIcon={editVitals ? <CloseIcon sx={{ fontSize: 17 }} /> : <EditIcon sx={{ fontSize: 17 }} />}
          onClick={() => setEditVitals(!editVitals)}
          aria-label={editVitals ? t('actions.cancel') : t('actions.register')}
          sx={editVitals ? secondaryButtonSx(isDark) : { ...primaryButtonSx(isDark), minWidth: 0 }}
        >
          {!isMobile && (editVitals ? t('actions.cancel') : t('actions.register'))}
        </Button>
      </Stack>

      {!editVitals ? (
        <>
          {/* 2 · Constantes — una sola superficie, celdas separadas por hairline */}
          <Box
            component={motion.div as any}
            variants={listStagger}
            initial="hidden"
            animate="visible"
            sx={{ ...panel, overflow: 'hidden' }}
          >
            <Box sx={cellGridSx}>
              {vitalConfig.map((config) => (
                <VitalCell
                  key={config.key}
                  icon={config.icon}
                  label={config.label}
                  value={config.value}
                  unit={config.unit}
                  status={classifyVital(config.vital, config.value)}
                  statusLabel={statusLabel[classifyVital(config.vital, config.value)]}
                  onOpenGraph={
                    metricsWithHistory.has(config.metric)
                      ? () => openVitalGraph(config.metric, config.label, config.unit)
                      : undefined
                  }
                  graphAriaLabel={t('graph.openAria', { metric: config.label })}
                />
              ))}
            </Box>
          </Box>

          {/* 3 · Histórico cronológico */}
          <Box sx={{ mt: GAP_LAYER }}>
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: GAP_IN }}>
              <Typography
                sx={{
                  fontSize: T_TITLE,
                  fontWeight: 600,
                  color: 'text.primary',
                  letterSpacing: '-0.01em',
                }}
              >
                {t('history.title')}
              </Typography>
              {historyCount > 0 && (
                <Typography
                  sx={{
                    fontSize: T_META,
                    fontWeight: 400,
                    color: 'text.secondary',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {historyCountLabel}
                </Typography>
              )}
            </Stack>

            {vhLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: `${RADIUS.lg}px` }} />
            ) : vitalsHistory && vitalsHistory.length > 0 ? (
              <Box sx={{ ...panel, overflow: 'hidden' }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {[
                          t('history.columns.date'),
                          t('history.columns.height'),
                          t('history.columns.weight'),
                          t('history.columns.bmi'),
                          t('history.columns.temp'),
                          t('history.columns.respRate'),
                          t('history.columns.bloodPressure'),
                          t('history.columns.heartRate'),
                          t('history.columns.oxygen'),
                          t('history.columns.recordedBy'),
                          '',
                        ].map((h, i) => (
                          <TableCell
                            key={h || `col-${i}`}
                            align={i === 0 ? 'left' : 'center'}
                            sx={{
                              fontSize: T_META,
                              fontWeight: 600,
                              color: 'text.secondary',
                              whiteSpace: 'nowrap',
                              borderBottom: `1px solid ${line}`,
                              py: 1,
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vitalsHistory.map((rec) => {
                        const colorOf = (s: Status) =>
                          s === 'critical'
                            ? BRAND.danger
                            : s === 'warning'
                              ? BRAND.warning
                              : 'text.primary';
                        // Fuera de rango también sube de peso: el color solo no
                        // llega a un médico con daltonismo. Misma excepción que
                        // la palabra de estado en HealthSummarySection.
                        const statusSx = (s: Status) => ({
                          ...numericCellSx,
                          color: colorOf(s),
                          fontWeight: s === 'normal' ? 400 : 600,
                        });
                        const cellSx = (v: string, val: any) => statusSx(classifyVital(v, val));
                        // La TA se juzga por la peor de sus dos cifras: una
                        // diastólica aislada alterada (120/115) se pintaba en negro.
                        const bpStatus: Status = (() => {
                          const s = classifyVital('systole', rec.systole);
                          const d = classifyVital('diastole', rec.diastole);
                          if (s === 'critical' || d === 'critical') return 'critical';
                          if (s === 'warning' || d === 'warning') return 'warning';
                          return 'normal';
                        })();

                        return (
                          <TableRow
                            key={rec.id}
                            sx={{
                              transition: 'background-color 160ms cubic-bezier(0.4,0,0.2,1)',
                              '&:hover': {
                                background: alpha(
                                  isDark ? '#ffffff' : '#000000',
                                  isDark ? 0.04 : 0.03,
                                ),
                              },
                              // Sin fontWeight aquí: `.fila td` gana por
                              // especificidad al sx de la celda y aplastaría el
                              // peso 600 de un valor fuera de rango. El 400 lo
                              // pone el tema.
                              '& td': {
                                borderBottom: `1px solid ${line}`,
                                fontSize: T_BODY,
                              },
                            }}
                          >
                            <TableCell sx={{ py: 1.25 }}>
                              <Typography
                                sx={{
                                  fontSize: T_BODY,
                                  fontWeight: 400,
                                  color: 'text.primary',
                                  ...numericCellSx,
                                }}
                              >
                                {new Date(rec.recordedAt ?? rec.createdAt).toLocaleDateString(dateLocale(), {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: T_META,
                                  fontWeight: 400,
                                  color: 'text.secondary',
                                  ...numericCellSx,
                                }}
                              >
                                {new Date(rec.recordedAt ?? rec.createdAt).toLocaleTimeString(dateLocale(), {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={numericCellSx}>
                              {rec.heightM ? `${rec.heightM} m` : '—'}
                            </TableCell>
                            <TableCell align="center" sx={numericCellSx}>
                              {rec.weightKg ? `${rec.weightKg} kg` : '—'}
                            </TableCell>
                            <TableCell align="center" sx={cellSx('bmi', rec.bmi)}>
                              {rec.bmi ? rec.bmi.toFixed(1) : '—'}
                            </TableCell>
                            <TableCell align="center" sx={cellSx('temperature', rec.temperatureC)}>
                              {rec.temperatureC ? `${rec.temperatureC} °C` : '—'}
                            </TableCell>
                            <TableCell align="center" sx={cellSx('respRate', rec.respRate)}>
                              {rec.respRate ?? '—'}
                            </TableCell>
                            <TableCell align="center" sx={statusSx(bpStatus)}>
                              {rec.systole || rec.diastole
                                ? `${rec.systole ?? '—'}/${rec.diastole ?? '—'}`
                                : '—'}
                            </TableCell>
                            <TableCell align="center" sx={cellSx('heartRate', rec.heartRate)}>
                              {rec.heartRate ?? '—'}
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={cellSx('oxygenSaturation', rec.oxygenSaturationPct)}
                            >
                              {rec.oxygenSaturationPct ? `${rec.oxygenSaturationPct}%` : '—'}
                            </TableCell>
                            <TableCell align="center">
                              {rec.createdBy ? (
                                <Tooltip
                                  title={(() => {
                                    const a = formatCreatedByForAudit(rec.createdBy);
                                    return a.secondary ? `${a.primary}\n${a.secondary}` : a.primary;
                                  })()}
                                >
                                  <Box
                                    component="span"
                                    sx={{
                                      fontSize: T_META,
                                      fontWeight: 400,
                                      color: 'text.secondary',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {rec.createdBy.firstName?.[0] ?? ''}
                                    {rec.createdBy.lastName?.[0] ?? ''}
                                  </Box>
                                </Tooltip>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.25} justifyContent="center">
                                <Tooltip title={t('history.viewDetail')}>
                                  <IconButton
                                    size="small"
                                    onClick={() => setAuditVital(rec)}
                                    sx={{ color: 'text.secondary', width: 28, height: 28 }}
                                    aria-label={t('history.viewDetail')}
                                  >
                                    <InfoOutlinedIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('actions.delete')}>
                                  <IconButton
                                    size="small"
                                    onClick={() => setConfirmDeleteVitalId(rec.id)}
                                    sx={{
                                      color: 'text.secondary',
                                      width: 28,
                                      height: 28,
                                      '&:hover': { color: BRAND.danger },
                                    }}
                                    aria-label={t('history.deleteRecord')}
                                  >
                                    <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              // Estado vacío sin superficie propia ni icono gigante: es una
              // ausencia, no una tarjeta.
              <Box sx={{ py: 3 }}>
                <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary' }}>
                  {t('history.empty.title')}
                </Typography>
                <Typography
                  sx={{
                    fontSize: T_META,
                    fontWeight: 400,
                    color: 'text.secondary',
                    mt: 0.5,
                    maxWidth: '60ch',
                    lineHeight: 1.5,
                  }}
                >
                  {t('history.empty.description')}
                </Typography>
              </Box>
            )}
          </Box>
        </>
      ) : (
        /* Panel de captura */
        <Box sx={{ ...panel, p: 3 }}>
          <Stack spacing={GAP_BLOCK}>
            <Box>
              <Typography
                sx={{ fontSize: T_TITLE, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em' }}
              >
                {t('edit.title')}
              </Typography>
              <Typography
                sx={{
                  fontSize: T_BODY,
                  fontWeight: 400,
                  color: 'text.secondary',
                  mt: 0.5,
                  maxWidth: '68ch',
                  lineHeight: 1.5,
                }}
              >
                {t('edit.description')}
              </Typography>
            </Box>

            <Box>
              <Typography
                sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mb: GAP_IN }}
              >
                {t('edit.dateLabel')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ maxWidth: { sm: 420 } }}>
                <TextField
                  label={t('edit.fieldDate')}
                  type="date"
                  size="small"
                  value={recordedDate}
                  onChange={(e) => setRecordedDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: todayLocal() }}
                  sx={fieldSx}
                />
                <TextField
                  label={t('edit.fieldTime')}
                  type="time"
                  size="small"
                  value={recordedTime}
                  onChange={(e) => setRecordedTime(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={fieldSx}
                />
              </Stack>
            </Box>

            <Grid container spacing={2.5}>
              {/* Antropometría */}
              <Grid item xs={12} md={4}>
                <Typography
                  sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mb: GAP_IN }}
                >
                  {t('edit.anthropometry')}
                </Typography>
                <Stack spacing={1.5}>
                  <TextField
                    label={t('edit.fieldHeight')}
                    size="small"
                    value={vitals.heightM}
                    onChange={(e) => setVitals((v) => ({ ...v, heightM: e.target.value }))}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">m</InputAdornment>,
                    }}
                    sx={fieldSx}
                  />
                  <TextField
                    label={t('edit.fieldWeight')}
                    size="small"
                    value={vitals.weightKg}
                    onChange={(e) => setVitals((v) => ({ ...v, weightKg: e.target.value }))}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                    }}
                    sx={fieldSx}
                  />
                  <TextField
                    label={t('edit.fieldBmi')}
                    size="small"
                    value={bmi}
                    disabled
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kg/m²</InputAdornment>,
                      sx: { fontVariantNumeric: 'tabular-nums' },
                    }}
                    sx={fieldSx}
                  />
                </Stack>
              </Grid>

              {/* Constantes */}
              <Grid item xs={12} md={4}>
                <Typography
                  sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mb: GAP_IN }}
                >
                  {t('edit.vitalConstants')}
                </Typography>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      label={t('edit.fieldSystolic')}
                      size="small"
                      value={vitals.systole}
                      onChange={(e) => setVitals((v) => ({ ...v, systole: e.target.value }))}
                      fullWidth
                      InputProps={{
                        endAdornment: <InputAdornment position="end">mm</InputAdornment>,
                      }}
                      sx={fieldSx}
                    />
                    <TextField
                      label={t('edit.fieldDiastolic')}
                      size="small"
                      value={vitals.diastole}
                      onChange={(e) => setVitals((v) => ({ ...v, diastole: e.target.value }))}
                      fullWidth
                      InputProps={{
                        endAdornment: <InputAdornment position="end">Hg</InputAdornment>,
                      }}
                      sx={fieldSx}
                    />
                  </Stack>
                  <TextField
                    label={t('edit.fieldHeartRate')}
                    size="small"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals((v) => ({ ...v, heartRate: e.target.value }))}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">bpm</InputAdornment>,
                    }}
                    sx={fieldSx}
                  />
                  <TextField
                    label={t('edit.fieldTemperature')}
                    size="small"
                    value={vitals.temperatureC}
                    onChange={(e) => setVitals((v) => ({ ...v, temperatureC: e.target.value }))}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                    }}
                    sx={fieldSx}
                  />
                </Stack>
              </Grid>

              {/* Otros */}
              <Grid item xs={12} md={4}>
                <Typography
                  sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mb: GAP_IN }}
                >
                  {t('edit.otherIndicators')}
                </Typography>
                <Stack spacing={1.5}>
                  <TextField
                    label={t('edit.fieldOxygen')}
                    size="small"
                    value={vitals.oxygenSaturationPct}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, oxygenSaturationPct: e.target.value }))
                    }
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    sx={fieldSx}
                  />
                  <TextField
                    label={t('edit.fieldRespRate')}
                    size="small"
                    value={vitals.respRate}
                    onChange={(e) => setVitals((v) => ({ ...v, respRate: e.target.value }))}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">rpm</InputAdornment>,
                    }}
                    sx={fieldSx}
                  />
                  <TextField
                    label={t('edit.fieldBodyFat')}
                    size="small"
                    value={vitals.bodyFatPct}
                    onChange={(e) => setVitals((v) => ({ ...v, bodyFatPct: e.target.value }))}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    sx={fieldSx}
                  />
                </Stack>
              </Grid>
            </Grid>

            <Stack
              direction={{ xs: 'column-reverse', sm: 'row' }}
              spacing={1}
              justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
            >
              <Button
                onClick={() => setEditVitals(false)}
                sx={secondaryButtonSx(isDark)}
                fullWidth={isMobile}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                disabled={savingSection === 'vitals'}
                onClick={() => {
                  if (recordedDate && !recordedAtDate) {
                    notify({ message: t('notify.invalidDate'), severity: 'error' });
                    return;
                  }
                  if (recordedAtDate && recordedAtDate.getTime() > Date.now()) {
                    notify({ message: t('notify.futureDate'), severity: 'error' });
                    return;
                  }
                  setConfirmVitalsOpen(true);
                }}
                startIcon={<SaveIcon sx={{ fontSize: 17 }} />}
                sx={primaryButtonSx(isDark)}
                fullWidth={isMobile}
              >
                {savingSection === 'vitals' ? t('actions.saving') : t('actions.save')}
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Confirmar guardado */}
      <Dialog
        open={confirmVitalsOpen}
        onClose={() => !savingSection && setConfirmVitalsOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="baseline">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{ fontSize: T_TITLE, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em' }}
              >
                {t('confirmSave.title')}
              </Typography>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
                {t('confirmSave.subtitle')}
              </Typography>
            </Box>
            {isMobile && (
              <IconButton
                size="small"
                onClick={() => !savingSection && setConfirmVitalsOpen(false)}
                aria-label={t('actions.close')}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>
        </Box>
        <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
          <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary', lineHeight: 1.5 }}>
            {t('confirmSave.body')}
          </Typography>
          <Typography
            sx={{
              fontSize: T_META,
              fontWeight: 400,
              color: 'text.secondary',
              mt: GAP_IN,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t('confirmSave.recordedDateLabel')}{' '}
            {recordedAtDate
              ? recordedAtDate.toLocaleString(dateLocale(), { dateStyle: 'long', timeStyle: 'short' })
              : t('confirmSave.now')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
          <Button
            onClick={() => setConfirmVitalsOpen(false)}
            disabled={!!savingSection}
            sx={secondaryButtonSx(isDark)}
          >
            {t('actions.review')}
          </Button>
          <Button
            onClick={handleSaveVitals}
            disabled={!!savingSection}
            startIcon={
              savingSection === 'vitals' ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon sx={{ fontSize: 17 }} />
              )
            }
            sx={primaryButtonSx(isDark)}
          >
            {savingSection === 'vitals' ? t('actions.saving') : t('actions.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Eliminar registro */}
      <Dialog
        open={!!confirmDeleteVitalId}
        onClose={() => !deletingVital && setConfirmDeleteVitalId(null)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            {/* El icono va suelto y en rojo: codificación redundante del peligro
                para daltonismo, sin bucket teñido. */}
            <WarningAmberIcon sx={{ fontSize: 20, color: BRAND.danger, mt: 0.25 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{ fontSize: T_TITLE, fontWeight: 600, color: BRAND.danger, letterSpacing: '-0.01em' }}
              >
                {t('confirmDelete.title')}
              </Typography>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
                {t('confirmDelete.subtitle')}
              </Typography>
            </Box>
            {isMobile && (
              <IconButton
                size="small"
                onClick={() => !deletingVital && setConfirmDeleteVitalId(null)}
                disabled={deletingVital}
                aria-label={t('actions.close')}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>
        </Box>
        <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
          <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary', lineHeight: 1.5 }}>
            {t('confirmDelete.body')}
          </Typography>
          {pendingDeleteVital && (
            <>
              <Divider sx={{ borderColor: line, my: GAP_IN }} />
              <Typography
                sx={{
                  fontSize: T_BODY,
                  fontWeight: 400,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {new Date(pendingDeleteVital.recordedAt ?? pendingDeleteVital.createdAt).toLocaleString(
                  dateLocale(),
                  { dateStyle: 'long', timeStyle: 'short' },
                )}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
          <Button
            onClick={() => setConfirmDeleteVitalId(null)}
            disabled={deletingVital}
            sx={secondaryButtonSx(isDark)}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={() => confirmDeleteVitalId && handleDeleteVital(confirmDeleteVitalId)}
            disabled={deletingVital}
            startIcon={
              deletingVital ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteOutlineIcon sx={{ fontSize: 17 }} />
              )
            }
            sx={{
              ...primaryButtonSx(isDark),
              // Plano y sólido, como el CTA de marca: el peligro lo dice el color.
              background: BRAND.danger,
              '&:hover': { background: '#B91C1C', boxShadow: 'none' },
              '&:active': { background: '#991B1B' },
            }}
          >
            {deletingVital ? t('actions.deleting') : t('actions.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detalle de auditoría */}
      <Dialog
        open={!!auditVital}
        onClose={() => setAuditVital(null)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="baseline">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{ fontSize: T_TITLE, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em' }}
              >
                {t('audit.title')}
              </Typography>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
                {t('audit.subtitle')}
              </Typography>
            </Box>
            {isMobile && (
              <IconButton size="small" onClick={() => setAuditVital(null)} aria-label={t('actions.close')}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>
        </Box>
        <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
          {auditVital &&
            (() => {
              const regBy = formatCreatedByForAudit(auditVital.createdBy);
              const rows: {
                label: string;
                value: string;
                note?: string | null;
                numeric?: boolean;
              }[] = [
                {
                  label: t('audit.recordedDate'),
                  value: new Date(auditVital.recordedAt ?? auditVital.createdAt).toLocaleString(
                    dateLocale(),
                    { dateStyle: 'full', timeStyle: 'short' },
                  ),
                  numeric: true,
                },
                {
                  label: t('audit.capturedDate'),
                  value: new Date(auditVital.createdAt).toLocaleString(dateLocale(), {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  }),
                  numeric: true,
                },
                {
                  label: t('audit.recordedBy'),
                  value: auditVital.createdBy ? regBy.primary : '—',
                  note: regBy.secondary,
                },
              ];
              return (
                <Stack divider={<Divider sx={{ borderColor: line }} flexItem />} spacing={GAP_IN}>
                  {rows.map((r) => (
                    <Box key={r.label} sx={{ pt: GAP_IN }}>
                      <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                        {r.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: T_BODY,
                          fontWeight: 400,
                          color: 'text.primary',
                          mt: 0.25,
                          lineHeight: 1.4,
                          ...(r.numeric ? numericCellSx : {}),
                        }}
                      >
                        {r.value}
                      </Typography>
                      {r.note && (
                        <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                          {r.note}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              );
            })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
          <Button onClick={() => setAuditVital(null)} fullWidth sx={primaryButtonSx(isDark)}>
            {t('actions.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
