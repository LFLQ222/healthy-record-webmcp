import React from 'react';
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import GreenIcon from '@mui/icons-material/CheckCircle';
import YellowIcon from '@mui/icons-material/Warning';
import RedIcon from '@mui/icons-material/Error';
import WeightIcon from '@mui/icons-material/FitnessCenter';
import HeartIcon from '@mui/icons-material/Favorite';
import PressureIcon from '@mui/icons-material/Bloodtype';
import OxygenIcon from '@mui/icons-material/Air';
import BmiIcon from '@mui/icons-material/PercentRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronIcon from '@mui/icons-material/KeyboardArrowDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { motion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import type { PatientOverview } from '../../../services/ehrService';
import { dateLocale } from '../../../utils/dateLocale';
import { useAnalyteGraph } from '../AnalyteGraphProvider';
import { LabExpertCard } from './LabExpertCard';
import {
  BRAND,
  RADIUS,
  glassSx,
  elevations,
  iconBucketSx,
} from '../../common/designTokens';

interface HealthSummarySectionProps {
  data: PatientOverview;
  patientId: string;
  onRegenerate: () => Promise<void>;
}

type FindingStatus = 'high' | 'low' | 'critical' | 'positive' | 'negative' | 'normal' | 'other';

interface ParsedFinding {
  name: string;
  value?: string;
  unit?: string;
  status: FindingStatus;
  statusLabel?: string;
  refRange?: string;
  raw: string;
}

const FINDING_RE =
  /^(.+?):\s*([+-]?[\d.,]+)\s*([^()]*?)\s*\(([^)]+)\)(?:\s*\[\s*ref[^:]*:\s*([^\]]+)\])?\s*$/i;

function mapStatus(label: string): { status: FindingStatus; clean: string } {
  const norm = label.trim().toLowerCase();
  if (/crítico|critic/.test(norm))
    return { status: 'critical', clean: i18n.t('healthSummarySection:status.critical') };
  if (/alto|elevad|high/.test(norm))
    return { status: 'high', clean: i18n.t('healthSummarySection:status.high') };
  if (/bajo|low/.test(norm))
    return { status: 'low', clean: i18n.t('healthSummarySection:status.low') };
  // "Anormal", "abnormal", "subnormal", "no normal" o "falso negativo" contienen
  // literalmente las palabras que clasifican un valor como en rango; sin este
  // guardia caían en el acordeón colapsado pintados de verde.
  if (/\b(ab|a|sub|non|no|falso|false)[\s-]?(normal|negativ)/.test(norm))
    return { status: 'other', clean: label.trim() };
  if (/positiv/.test(norm))
    return { status: 'positive', clean: i18n.t('healthSummarySection:status.positive') };
  if (/negativ/.test(norm))
    return { status: 'negative', clean: i18n.t('healthSummarySection:status.negative') };
  if (/normal/.test(norm))
    return { status: 'normal', clean: i18n.t('healthSummarySection:status.normal') };
  return { status: 'other', clean: label.trim() };
}

function parseFinding(raw: string): ParsedFinding {
  const m = raw.match(FINDING_RE);
  if (!m) return { name: raw, status: 'other', raw };
  const [, name, value, unit, statusLabel, refRange] = m;
  const { status, clean } = mapStatus(statusLabel);
  const trimmedName = name.trim();
  return {
    name: trimmedName || raw,
    value: value.trim(),
    unit: (unit || '').trim() || undefined,
    status,
    statusLabel: clean,
    refRange: refRange?.trim(),
    raw,
  };
}

/**
 * Escala tipográfica — cuatro pasos y ninguno más. Si algo debe destacar se sube
 * de paso; no se pone en negrita.
 */
const T_VALUE = '1.75rem'; // paso 1 — sólo el valor de un hallazgo fuera de rango
const T_TITLE = '1.125rem'; // paso 2 — títulos, alérgeno, palabra del semáforo, cifra vital
const T_BODY = '0.9375rem'; // paso 3 — cuerpo
const T_META = '0.75rem'; // paso 4 — satélites

/** Ritmo vertical: dentro de bloque · entre bloques de una capa · entre capas. */
const GAP_IN = 1;
const GAP_BLOCK = 2;
const GAP_LAYER = 4;

/** Separador primario de la sección; el borde glass queda como decoración. */
const hairline = (isDark: boolean) => alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.08 : 0.06);

/** Partición de hallazgos: todo lo que no sea esto se muestra siempre, sin tope. */
const EN_RANGO = new Set<FindingStatus>(['normal', 'negative']);

const SEVERITY_RANK: Record<FindingStatus, number> = {
  critical: 0,
  high: 1,
  low: 1,
  positive: 2,
  other: 3,
  negative: 4,
  normal: 4,
};

const valueColor = (s: FindingStatus): string => {
  if (s === 'high' || s === 'critical' || s === 'positive') return BRAND.danger;
  if (s === 'low') return BRAND.warning;
  if (s === 'negative' || s === 'normal') return BRAND.success;
  return 'text.primary';
};

const trendIcon = (s: FindingStatus) =>
  s === 'low' ? TrendingDownIcon : s === 'high' || s === 'critical' ? TrendingUpIcon : null;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

/**
 * StatTile y SubHeader viven aquí y no dentro del componente: declaradas en el
 * cuerpo, React las trataba como tipos nuevos en cada render y desmontaba y
 * volvía a montar las 5 celdas y las cabeceras con cada cambio de estado
 * —incluido el de "Actualizar"—, reiniciando la animación de entrada.
 */
interface StatTileProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  unit?: string;
}

/** Celda de la banda de constantes: sin superficie propia, sin hover, sin bucket. */
const StatTileBase = ({ icon: Icon, label, value, unit }: StatTileProps) => (
  <Box
    component={motion.div}
    variants={itemVariants}
    sx={{ px: 1.5, py: 1.25, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}
  >
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
      <Icon sx={{ fontSize: 12, color: 'text.secondary', flexShrink: 0 }} />
      <Typography noWrap sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
    <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: T_TITLE,
          fontWeight: 600,
          lineHeight: 1.15,
          color: 'text.primary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      {unit && (
        <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
          {unit}
        </Typography>
      )}
    </Stack>
  </Box>
);

interface SubHeaderProps {
  title: string;
  /** Opcional y sin bucket: el iconBucket sólo sobrevive en el semáforo y en LabExpertCard. */
  icon?: React.ElementType;
  count?: number;
  total?: number;
  action?: React.ReactNode;
}

const SubHeaderBase = ({ title, icon: Icon, count, total, action }: SubHeaderProps) => (
  <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: GAP_IN }}>
    {Icon && <Icon sx={{ fontSize: 15, color: 'text.secondary' }} />}
    <Typography
      sx={{ fontSize: T_TITLE, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em' }}
    >
      {title}
    </Typography>
    {count != null && (
      <Typography
        sx={{
          fontSize: T_META,
          fontWeight: 400,
          color: 'text.secondary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {total != null && total > count ? `${count}/${total}` : count}
      </Typography>
    )}
    <Box sx={{ flex: 1 }} />
    {action}
  </Stack>
);

interface DisplayFinding extends ParsedFinding {
  id: string;
  createdAt: string;
  source?: string;
}

interface FindingRowProps {
  f: DisplayFinding;
  isDark: boolean;
  /** Fuera de rango: única fila que usa el paso 1 para la cifra. */
  emphasis: boolean;
  onOpen: (name: string) => void;
}

const FindingRow = ({ f, isDark, emphasis, onOpen }: FindingRowProps) => {
  const { t } = useTranslation('healthSummarySection');
  const vColor = valueColor(f.status);
  const Trend = trendIcon(f.status);
  const canOpen = Boolean(f.name && f.name.trim());
  // Sin cifra parseada la fila se pinta como texto crudo; 'other' siempre se
  // marca como no interpretado, tenga cifra o no: el estado no se supo leer.
  const noValue = f.status === 'other' && f.value == null;
  const uninterpreted = f.status === 'other';
  const abnormal = !EN_RANGO.has(f.status) && f.status !== 'other';
  const when = React.useMemo(() => {
    const d = new Date(f.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  }, [f.createdAt]);
  const meta = [when, f.source].filter(Boolean).join(' · ');
  const hasSecondLine = Boolean(f.statusLabel || f.refRange || meta || uninterpreted);

  return (
    <Box
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={canOpen ? () => onOpen(f.name) : undefined}
      onKeyDown={
        canOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(f.name);
              }
            }
          : undefined
      }
      sx={{
        px: 1.5,
        py: 1,
        cursor: canOpen ? 'pointer' : 'default',
        // Un crítico se separa de un elevado por la palabra y por ir primero en
        // el orden, no por una barra de color al margen.
        transition: 'background-color 160ms cubic-bezier(0.4,0,0.2,1)',
        '&:hover': {
          background: alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.04 : 0.03),
        },
        '&:hover .finding-name': { textDecoration: canOpen ? 'underline' : 'none' },
        '&:focus-visible': {
          outline: `1px solid ${alpha(isDark ? '#ffffff' : '#000000', 0.3)}`,
          outlineOffset: -1,
        },
      }}
    >
      <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ minWidth: 0 }}>
        <Typography
          className="finding-name"
          title={f.name}
          sx={{
            fontSize: T_BODY,
            fontWeight: 400,
            color: 'text.primary',
            lineHeight: 1.4,
            flex: 1,
            minWidth: 0,
            overflow: noValue ? 'visible' : 'hidden',
            textOverflow: noValue ? 'clip' : 'ellipsis',
            whiteSpace: noValue ? 'normal' : 'nowrap',
          }}
        >
          {f.name}
        </Typography>
        {f.value != null && (
          <Stack
            direction="row"
            alignItems="baseline"
            spacing={0.4}
            sx={{
              flexShrink: 0,
              minWidth: emphasis ? 92 : 64,
              justifyContent: 'flex-end',
            }}
          >
            <Typography
              sx={{
                fontSize: emphasis ? T_VALUE : T_BODY,
                fontWeight: emphasis ? 600 : 400,
                color: vColor,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
                letterSpacing: emphasis ? '-0.02em' : undefined,
              }}
            >
              {f.value}
            </Typography>
            {f.unit && (
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                {f.unit}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

      {hasSecondLine && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}
        >
          {f.statusLabel && (
            <Stack direction="row" alignItems="center" spacing={0.4}>
              {abnormal && (
                <Box
                  aria-hidden
                  sx={{ width: 5, height: 5, borderRadius: '50%', background: vColor }}
                />
              )}
              {abnormal && Trend && <Trend sx={{ fontSize: 13, color: 'text.secondary' }} />}
              {/* Única excepción del paso 3 a peso 600: la palabra de estado clínico. */}
              <Typography sx={{ fontSize: T_BODY, fontWeight: 600, color: vColor }}>
                {f.statusLabel}
              </Typography>
            </Stack>
          )}
          {uninterpreted && (
            <Stack direction="row" alignItems="center" spacing={0.4}>
              <Box
                aria-hidden
                sx={{ width: 5, height: 5, borderRadius: '50%', background: BRAND.warning }}
              />
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: BRAND.warning }}>
                {t('findings.unparsed')}
              </Typography>
            </Stack>
          )}
          {f.refRange && (
            <Typography
              title={t('findings.refTitle', { range: f.refRange })}
              sx={{
                fontSize: T_META,
                fontWeight: 400,
                color: 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {t('findings.refShort', { range: f.refRange })}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          {meta && (
            <Typography
              noWrap
              title={meta}
              sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', maxWidth: '100%' }}
            >
              {meta}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
};

export function HealthSummarySection({ data, patientId, onRegenerate }: HealthSummarySectionProps) {
  const { t } = useTranslation('healthSummarySection');
  const trafficLightConfig = React.useMemo(
    () =>
      ({
        verde: {
          label: t('trafficLight.verde.label'),
          icon: GreenIcon,
          color: BRAND.success,
          description: t('trafficLight.verde.description'),
        },
        amarillo: {
          label: t('trafficLight.amarillo.label'),
          icon: YellowIcon,
          color: BRAND.warning,
          description: t('trafficLight.amarillo.description'),
        },
        rojo: {
          label: t('trafficLight.rojo.label'),
          icon: RedIcon,
          color: BRAND.danger,
          description: t('trafficLight.rojo.description'),
        },
      }) as const,
    [t],
  );
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [regenLoading, setRegenLoading] = React.useState(false);
  const [inRangeOverride, setInRangeOverride] = React.useState<boolean | null>(null);

  // La sección no se remonta al cambiar de paciente ni al regenerar: sin este
  // reset, un colapso manual anterior anularía la apertura defensiva y viajaría
  // de un expediente a otro.
  React.useEffect(() => {
    setInRangeOverride(null);
  }, [patientId, data.findings]);

  const handleRegenerate = async () => {
    if (regenLoading) return;
    setRegenLoading(true);
    try {
      await onRegenerate();
    } finally {
      setRegenLoading(false);
    }
  };

  const { openAnalyteGraph } = useAnalyteGraph();
  const openFinding = React.useCallback(
    (name: string) => openAnalyteGraph(name, name),
    [openAnalyteGraph],
  );

  const currentLight =
    trafficLightConfig[data.trafficLight as keyof typeof trafficLightConfig] ||
    trafficLightConfig.amarillo;
  const StatusIcon = currentLight.icon;

  const line = hairline(isDark);
  const panel = {
    ...glassSx(isDark, 'panel', { blur: 18, radius: RADIUS.lg }),
    boxShadow: elevations[1] as string,
  };
  const bandGlass = glassSx(isDark, 'row', { blur: 14, radius: RADIUS.lg });
  // El tinte va como capa de background sobre el degradado de glass: un
  // backgroundColor queda debajo del gradiente casi opaco y no se ve.

  const allergies = data.allergies ?? [];
  const hasAllergies = allergies.length > 0;
  const activeDiagnoses = (data.diagnoses ?? []).filter((d) => d.status !== 'resolved');
  const medications = data.medications ?? [];
  const vaccines = data.vaccines ?? [];
  const vitals = data.vitals?.[0];

  const { outOfRange, inRange, needsReview } = React.useMemo(() => {
    const list: DisplayFinding[] = (data.findings ?? []).map((f) => ({
      ...parseFinding(f.text),
      id: f.id,
      createdAt: f.createdAt,
      source: f.document?.originalName,
    }));
    const capa0 = list
      .filter((f) => !EN_RANGO.has(f.status))
      .sort((a, b) => SEVERITY_RANK[a.status] - SEVERITY_RANK[b.status]);
    const colapsable = list.filter((f) => EN_RANGO.has(f.status));
    // Red de seguridad real: `colapsable` sale de EN_RANGO, así que preguntarle
    // otra vez por EN_RANGO nunca dispara. Lo que sí puede pasar es que el texto
    // crudo delate una anomalía que la etiqueta no recogió.
    const sospechosos = colapsable.filter(
      (f) => !f.statusLabel || /anormal|abnormal|fuera de rango|out of range|crític|critic/i.test(f.raw),
    );
    return { outOfRange: capa0, inRange: colapsable, needsReview: sospechosos.length };
    // `t` en las deps: mapStatus traduce al parsear, así que sin esto las
    // etiquetas de estado se quedaban congeladas al cambiar de idioma.
  }, [data.findings, t]);

  const inRangeOpen = inRangeOverride ?? needsReview > 0;

  const vitalsGridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' },
    '& > *': { borderLeft: `1px solid ${line}` },
    [theme.breakpoints.down('sm')]: {
      '& > *:nth-of-type(3n + 1)': { borderLeft: 'none' },
      '& > *:nth-of-type(n + 4)': { borderTop: `1px solid ${line}` },
    },
    [theme.breakpoints.up('sm')]: {
      '& > *:nth-of-type(5n + 1)': { borderLeft: 'none' },
    },
  } as const;

  const vitalsDate = (() => {
    const when = vitals?.recordedAt ?? vitals?.createdAt;
    if (!when) return null;
    const d = new Date(when);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  // Única desreferencia del archivo sin guardia: si el backend no manda
  // `metrics`, reventaba la sección entera con un TypeError.
  const metaLine = [
    `${data.metrics?.hallazgos ?? 0} ${t('metrics.hallazgos')}`,
    `${data.metrics?.medicamentos ?? 0} ${t('metrics.medicamentos')}`,
    `${data.metrics?.resultadosNuevos ?? 0} ${t('metrics.resultados')}`,
  ].join(' · ');

  return (
    <Box
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1 · Línea de encabezado — sin panel, sin halo, sin subtítulo */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography
          sx={{
            fontSize: T_TITLE,
            fontWeight: 600,
            color: 'text.primary',
            letterSpacing: '-0.01em',
          }}
        >
          {t('hero.title')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={regenLoading ? t('action.updating') : t('action.update')}>
          <span>
            <IconButton
              size="small"
              onClick={handleRegenerate}
              disabled={regenLoading}
              aria-label={regenLoading ? t('action.updating') : t('action.update')}
              sx={{ color: BRAND.primary }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* 2 · Banda de seguridad — semáforo + alergias. Sólo se tiñe si hay alergias. */}
      <Box
        component={motion.div}
        variants={itemVariants}
        sx={{
          ...bandGlass,
          boxShadow: elevations[1] as string,
          p: 2,
          mt: GAP_BLOCK,
          // Sin tinte ni barra de color: la señal la llevan los nombres de los
          // alérgenos, en rojo y al paso 2. Un panel teñido con filo de color
          // es decoración, y encima compite con el rojo que sí significa algo.
        }}
      >
        <Stack spacing={GAP_IN}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            {/* El iconBucket se conserva aquí: es codificación redundante del
                color para daltonismo, no decoración. */}
            <Box sx={{ ...iconBucketSx(isDark, currentLight.color), width: 36, height: 36 }}>
              <StatusIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontSize: T_TITLE, fontWeight: 600, color: currentLight.color, lineHeight: 1.3 }}
              >
                {currentLight.label}
              </Typography>
              <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
                {currentLight.description}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: line }} />

          <Box>
            <Stack direction="row" alignItems="baseline" spacing={1}>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                {t('allergies.title')}
              </Typography>
              {hasAllergies && (
                <Typography
                  sx={{
                    fontSize: T_META,
                    fontWeight: 400,
                    color: BRAND.danger,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {allergies.length}
                </Typography>
              )}
            </Stack>
            {hasAllergies ? (
              <Box
                sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.25, mt: 0.5 }}
              >
                {allergies.map((a) => (
                  <Typography
                    key={a.id}
                    sx={{
                      fontSize: T_TITLE,
                      fontWeight: 600,
                      color: BRAND.danger,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.35,
                    }}
                  >
                    {a.isOther ? a.notes || t('allergies.other') : a.name}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography
                sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary', mt: 0.5 }}
              >
                {t('allergies.empty')}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>

      {/* 3 · Constantes vitales — una sola superficie, celdas separadas por hairline */}
      <Box
        component={motion.div}
        variants={itemVariants}
        sx={{ ...panel, mt: GAP_BLOCK, overflow: 'hidden' }}
      >
        {vitals ? (
          <>
            <Box sx={vitalsGridSx}>
              <StatTileBase icon={WeightIcon} label={t('vitals.weight')} value={vitals.weightKg ?? '—'} unit="kg" />
              <StatTileBase icon={BmiIcon} label={t('vitals.bmi')} value={vitals.bmi ? vitals.bmi.toFixed(1) : '—'} />
              <StatTileBase
                icon={PressureIcon}
                label={t('vitals.pressure')}
                value={vitals.systole && vitals.diastole ? `${vitals.systole}/${vitals.diastole}` : '—'}
                unit="mmHg"
              />
              <StatTileBase icon={HeartIcon} label={t('vitals.heartRate')} value={vitals.heartRate ?? '—'} unit="bpm" />
              <StatTileBase icon={OxygenIcon} label={t('vitals.oxygen')} value={vitals.oxygenSaturationPct ?? '—'} unit="%" />
            </Box>
            {/* Sin la fecha, un peso de hace ocho meses se lee igual que el de hoy. */}
            {vitalsDate && (
              <Typography
                sx={{
                  px: 1.5,
                  py: 1,
                  borderTop: `1px solid ${line}`,
                  fontSize: T_META,
                  fontWeight: 400,
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t('vitals.recordedOn', { date: vitalsDate })}
              </Typography>
            )}
          </>
        ) : (
          <Typography sx={{ p: 2, fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
            {t('vitals.empty')}
          </Typography>
        )}
      </Box>

      {/* Sin `hasFindings` de guardia: con la lista vacía se borraban los bloques
          4 y 5 enteros, así que el paciente sano —el único a quien el estado
          vacío digno le importa— era justo el que no lo veía. */}
      {
        <>
          {/* 4 · Fuera de rango — sin tope de elementos */}
          <Box
            component={motion.div}
            variants={itemVariants}
            role="region"
            aria-label={t('findings.title')}
            sx={{ ...panel, mt: GAP_BLOCK, overflow: 'hidden' }}
          >
            <Box sx={{ px: 2, pt: 2 }}>
              <SubHeaderBase title={t('findings.outOfRange')} count={outOfRange.length} />
            </Box>
            {outOfRange.length > 0 ? (
              <Box
                sx={{
                  maxHeight: 460,
                  overflowY: 'auto',
                  pb: 1,
                  scrollbarWidth: 'thin',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    background: alpha(isDark ? '#ffffff' : '#000000', 0.12),
                    borderRadius: 3,
                  },
                }}
              >
                <Stack divider={<Divider sx={{ borderColor: line }} flexItem />}>
                  {outOfRange.map((f) => (
                    <FindingRow key={f.id} f={f} isDark={isDark} emphasis onOpen={openFinding} />
                  ))}
                </Stack>
              </Box>
            ) : (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pb: 2 }}>
                <Box
                  aria-hidden
                  sx={{ width: 8, height: 8, borderRadius: '50%', background: BRAND.success }}
                />
                <Typography sx={{ fontSize: T_TITLE, fontWeight: 600, color: BRAND.success }}>
                  {t('findings.noneOutOfRange')}
                </Typography>
              </Stack>
            )}
          </Box>

          {/* 5 · En rango · N — única cosa tras interacción; no es un panel */}
          {inRange.length > 0 && (
            <Box component={motion.div} variants={itemVariants} sx={{ mt: GAP_BLOCK }}>
              <Box
                component="button"
                type="button"
                aria-expanded={inRangeOpen}
                aria-controls="hs-in-range-panel"
                onClick={() => setInRangeOverride(!inRangeOpen)}
                sx={{
                  width: '100%',
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  background: 'transparent',
                  border: `1px solid ${line}`,
                  borderRadius: `${RADIUS.md}px`,
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                  textAlign: 'left',
                  '&:focus-visible': {
                    outline: `1px solid ${alpha(isDark ? '#ffffff' : '#000000', 0.3)}`,
                    outlineOffset: -1,
                  },
                }}
              >
                <ChevronIcon
                  sx={{
                    fontSize: 18,
                    color: 'text.secondary',
                    transform: inRangeOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 160ms cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: T_BODY,
                    fontWeight: 400,
                    color: needsReview > 0 ? BRAND.warning : BRAND.success,
                  }}
                >
                  {needsReview > 0
                    ? t('findings.needsReview', { count: needsReview })
                    : t('findings.inRange')}
                </Typography>
                <Typography
                  role="status"
                  sx={{
                    fontSize: T_META,
                    fontWeight: 400,
                    color: needsReview > 0 ? BRAND.warning : BRAND.success,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  · {inRange.length}
                </Typography>
              </Box>
              {inRangeOpen && (
                <Stack
                  id="hs-in-range-panel"
                  sx={{ mt: GAP_IN }}
                  divider={<Divider sx={{ borderColor: line }} flexItem />}
                >
                  {inRange.map((f) => (
                    <FindingRow
                      key={f.id}
                      f={f}
                      isDark={isDark}
                      emphasis={false}
                      onOpen={openFinding}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </>
      }

      {/* 6 · Problemas y tratamiento — un panel, una cabecera, dos columnas */}
      <Box
        component={motion.div}
        variants={itemVariants}
        sx={{ ...panel, mt: GAP_LAYER, overflow: 'hidden' }}
      >
        <Box sx={{ px: 2, pt: 2 }}>
          <SubHeaderBase title={t('problems.title')} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Box
            sx={{
              px: 2,
              pb: 2,
              borderRight: { xs: 'none', md: `1px solid ${line}` },
              borderBottom: { xs: `1px solid ${line}`, md: 'none' },
            }}
          >
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: GAP_IN }}>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                {t('diagnoses.title')}
              </Typography>
              <Typography
                sx={{
                  fontSize: T_META,
                  fontWeight: 400,
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {activeDiagnoses.length}
              </Typography>
            </Stack>
            {activeDiagnoses.length > 0 ? (
              <Stack spacing={GAP_IN} sx={{ maxHeight: 320, overflowY: 'auto' }}>
                {activeDiagnoses.map((d) => (
                  <Box key={d.id} sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary', lineHeight: 1.4 }}
                    >
                      {d.description || d.code}
                    </Typography>
                    {d.code && (
                      <Typography
                        sx={{
                          fontSize: T_META,
                          fontWeight: 400,
                          color: 'text.secondary',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {d.code}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
                {t('diagnoses.empty')}
              </Typography>
            )}
          </Box>

          <Box sx={{ px: 2, pb: 2, pt: { xs: 2, md: 0 } }}>
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: GAP_IN }}>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                {t('medications.title')}
              </Typography>
              <Typography
                sx={{
                  fontSize: T_META,
                  fontWeight: 400,
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {medications.length}
              </Typography>
            </Stack>
            {medications.length > 0 ? (
              <Stack spacing={GAP_IN} sx={{ maxHeight: 320, overflowY: 'auto' }}>
                {medications.map((m) => (
                  <Box key={m.id} sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary', lineHeight: 1.4 }}
                    >
                      {m.name}
                    </Typography>
                    <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                      {m.dose || t('medications.noDose')}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
                {t('medications.empty')}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* 7 · Análisis clínico + disclaimer al pie (nunca tras interacción) */}
      <Box component={motion.div} variants={itemVariants} sx={{ ...panel, p: 2, mt: GAP_BLOCK }}>
        <SubHeaderBase title={t('clinical.title')} />
        <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mb: 1 }}>
          {t('hero.subtitle')}
        </Typography>
        <Typography
          sx={{
            fontSize: T_BODY,
            fontWeight: 400,
            color: 'text.primary',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            maxWidth: '68ch',
          }}
        >
          {data.summary || t('clinical.emptySummary')}
        </Typography>
        <Typography
          sx={{
            mt: GAP_BLOCK,
            fontSize: T_META,
            fontWeight: 400,
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {metaLine}
        </Typography>
        <Divider sx={{ borderColor: line, my: GAP_IN }} />
        <Typography
          sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', lineHeight: 1.5 }}
        >
          {t('hero.disclaimer')}
        </Typography>
      </Box>

      {/* 8 · Zona de contexto — separador + vacunas */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: GAP_LAYER }}>
        <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
          {t('context.title')}
        </Typography>
        <Divider sx={{ flex: 1, borderColor: line }} />
      </Stack>

      <Box component={motion.div} variants={itemVariants} sx={{ ...panel, p: 2, mt: GAP_BLOCK }}>
        <SubHeaderBase title={t('vaccines.title')} count={vaccines.length} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {vaccines.length > 0 ? (
            <>
              {vaccines.slice(0, 8).map((v) => (
                <Box
                  key={v.id}
                  sx={{
                    px: 1,
                    py: 0.35,
                    borderRadius: `${RADIUS.pill}px`,
                    background: alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.06 : 0.04),
                    color: 'text.primary',
                    fontSize: T_BODY,
                    fontWeight: 400,
                  }}
                >
                  {v.name}
                </Box>
              ))}
              {/* El recorte aquí sí se queda (es historia, no conducta de hoy),
                  pero deja de ser silencioso. */}
              {vaccines.length > 8 && (
                <Box
                  sx={{
                    px: 1,
                    py: 0.35,
                    borderRadius: `${RADIUS.pill}px`,
                    color: 'text.secondary',
                    fontSize: T_META,
                    fontWeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {t('common.andMore', { count: vaccines.length - 8 })}
                </Box>
              )}
            </>
          ) : (
            <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
              {t('vaccines.empty')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* 9 · Análisis experto de laboratorio */}
      {patientId && (
        <Box sx={{ mt: GAP_BLOCK }}>
          <LabExpertCard patientId={patientId} />
        </Box>
      )}

      {/* Indicador de regeneración: ya no cubre la sección con un blur; al pulsar
          Actualizar el médico seguía necesitando ver alergias y críticos. */}
      {regenLoading && (
        <Box
          sx={{
            position: 'absolute',
            // A la derecha y no centrado: centrado se montaba encima de la
            // palabra del semáforo, que es justo lo que no puede taparse.
            top: 0,
            right: 0,
            zIndex: 10,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          <Box
            sx={{
              ...glassSx(isDark, 'floating', { blur: 22, radius: RADIUS.lg }),
              px: 1.75,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              boxShadow: elevations[3],
            }}
          >
            <CircularProgress size={20} thickness={5} sx={{ color: BRAND.primary }} />
            <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
              {t('overlay.updating')}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
