/**
 * LaboratorySection — documentos de laboratorio + analitos extraídos.
 *
 * Comparte expediente con HealthSummarySection y VitalSignsSection, así que
 * comparte su sistema: cuatro pasos de tipografía, dos pesos, el color sólo en
 * el texto (nunca en una píldora teñida ni en un panel de color) y hairline
 * como separador primario.
 */

import { dateLocale } from '../../../utils/dateLocale';
import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  CircularProgress,
  alpha,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ScienceIcon from '@mui/icons-material/Science';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import FileIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChartIcon from '@mui/icons-material/InsertChartOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import SearchIcon from '@mui/icons-material/Search';
import { PdfViewer } from '../../common/PdfViewer';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { useUploads } from '../../../context/UploadContext';
import { useAnalyteGraph } from '../AnalyteGraphProvider';
import {
  getPatientOverview,
  fetchDocumentBlobUrl,
  fetchDoctorPatientDocumentBlob,
  getPatientLabResults,
  getPatientLabSummary,
  reprocessLabDocument,
  reprocessLabDocumentForPatient,
  type LabResult,
  type LabResultHistory,
} from '../../../services/ehrService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import {
  BRAND,
  RADIUS,
  FONT_STACK,
  glassSx,
  elevations,
  iconBucketSx,
  primaryButtonSx,
  secondaryButtonSx,
} from '../../common/designTokens';
import { SectionHeader } from '../../common/SectionHeader';
import { GroupedList, ListRow } from '../../common/ListRow';

/* ----------------------------- motion tokens ----------------------------- */
const listStagger = {
  visible: { transition: { staggerChildren: 0.035 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

/**
 * Escala tipográfica — los mismos cuatro pasos que HealthSummarySection. Si algo
 * debe destacar se sube de paso; no se pone en negrita.
 */
const T_VALUE = '1.75rem'; // paso 1 — sólo la cifra de un analito fuera de rango
const T_TITLE = '1.125rem'; // paso 2 — títulos de sección y cifras destacadas
const T_BODY = '0.9375rem'; // paso 3 — cuerpo
const T_META = '0.75rem'; // paso 4 — satélites

/** Ritmo vertical: dentro de bloque · entre bloques de una capa · entre capas. */
const GAP_IN = 1;
const GAP_BLOCK = 2;
const GAP_LAYER = 4;

/** Separador primario de la sección; el borde glass queda como decoración. */
const hairline = (isDark: boolean) => alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.08 : 0.06);

/* ----------------------------- helpers ----------------------------- */
/** Satélite de una línea meta; el punto separador lo pone quien lo compone. */
// `weight` sólo para satélites en color clínico: en oscuro el rojo no llega a 4.5:1 y el 600 lo compensa.
const metaText = (label: string, color: string = 'text.secondary', weight: number = 400) => (
  <Typography
    sx={{ fontSize: T_META, fontWeight: weight, color, fontVariantNumeric: 'tabular-nums' }}
  >
    {label}
  </Typography>
);

/** Sin la píldora, dos satélites contiguos se leen corridos: este punto los separa. */
const metaDot = (
  <Typography aria-hidden sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
    ·
  </Typography>
);

/** Palabra de estado clínico: el color va en el texto, sin píldora ni fondo teñido. */
const statusWord = (label: string, color: string, Icon?: React.ElementType) => (
  <Stack direction="row" alignItems="center" spacing={0.4} sx={{ display: 'inline-flex' }}>
    {/* Punto y flecha: el color no viaja solo, por daltonismo. */}
    <Box aria-hidden sx={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
    {Icon && <Icon sx={{ fontSize: 13, color: 'text.secondary' }} />}
    {/* Única excepción del paso 3 a peso 600: la palabra de estado clínico. */}
    <Typography sx={{ fontSize: T_BODY, fontWeight: 600, color }}>{label}</Typography>
  </Stack>
);

const statusDot = (color: string) => (
  <Box
    sx={{
      width: 5,
      height: 5,
      borderRadius: '50%',
      bgcolor: color,
      boxShadow: `0 0 0 2px ${alpha(color, 0.22)}`,
      flexShrink: 0,
    }}
  />
);

export const statusColorFor = (status: LabResult['status'] | string): string => {
  switch (status) {
    case 'high':
      return BRAND.danger;
    case 'low':
      return BRAND.info;
    case 'positive':
      return BRAND.warning;
    case 'unknown':
      return BRAND.mutedFg;
    default:
      return BRAND.success;
  }
};

export const statusLabelFor = (status: string, hasRefRange: boolean): string => {
  if (status === 'high')
    return hasRefRange
      ? i18n.t('laboratorySection:status.high')
      : i18n.t('laboratorySection:status.abnormal');
  if (status === 'low')
    return hasRefRange
      ? i18n.t('laboratorySection:status.low')
      : i18n.t('laboratorySection:status.abnormal');
  if (status === 'positive') return i18n.t('laboratorySection:status.positive');
  if (status === 'unknown') return i18n.t('laboratorySection:status.notAvailable');
  return i18n.t('laboratorySection:status.normal');
};

export const fmtNum = (v: unknown): string => {
  if (v == null) return '-';
  const n = parseFloat(String(v));
  if (!isFinite(n)) return String(v);
  return parseFloat(n.toFixed(4)).toString();
};

/* ----------------------------- Analyte graph ----------------------------- */
export function AnalyteGraph({
  graphData,
  theme,
  height = 400,
}: {
  graphData: LabResultHistory;
  theme: import('@mui/material').Theme;
  /** Override the chart height (default 400). The chat widget passes a compact value. */
  height?: number;
}) {
  const { t } = useTranslation('laboratorySection');
  const refLow = graphData.dataPoints.slice().reverse().find((dp) => dp.refLow != null)?.refLow;
  const refHigh = graphData.dataPoints.slice().reverse().find((dp) => dp.refHigh != null)?.refHigh;
  const chartData = graphData.dataPoints.map((dp) => ({
    ...dp,
    date: new Date(dp.date).toLocaleDateString(dateLocale(), {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    }),
  }));

  const allValues = [
    ...graphData.dataPoints.map((dp) => dp.value),
    ...(refLow != null ? [refLow] : []),
    ...(refHigh != null ? [refHigh] : []),
  ];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) * 0.12 || 1;
  const yDomain: [number, number] = [
    Math.max(0, parseFloat((minVal - padding).toFixed(4))),
    parseFloat((maxVal + padding).toFixed(4)),
  ];

  return (
    <Box sx={{ height, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fontFamily: FONT_STACK }}
            stroke={theme.palette.text.secondary}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 12, fontFamily: FONT_STACK }}
            unit={graphData.unit ? ` ${graphData.unit}` : undefined}
            width={70}
            stroke={theme.palette.text.secondary}
          />
          <RechartsTooltip
            contentStyle={{
              borderRadius: RADIUS.sm,
              fontFamily: FONT_STACK,
              border: `1px solid ${alpha(BRAND.primary, 0.2)}`,
            }}
            formatter={(value: any, _name: any, props: any) => {
              const status = props.payload?.status;
              // Sin esto, 'unknown'/'positive'/'negative' se rotulaban "Normal": una lectura sin
              // rango de referencia (peso, talla) no es normal ni anormal, y un positivo menos.
              const label =
                status === 'high'
                  ? t('graph.high')
                  : status === 'low'
                  ? t('graph.low')
                  : status === 'positive'
                  ? t('status.positive')
                  : status === 'negative'
                  ? t('status.negative')
                  : status === 'unknown'
                  ? t('status.notAvailable')
                  : t('graph.normal');
              return [`${value} ${graphData.unit || ''} — ${label}`, graphData.analyteName];
            }}
            labelFormatter={(label: any) => t('graph.dateLabel', { label })}
          />
          {refLow != null && refHigh != null && (
            <ReferenceArea y1={refLow} y2={refHigh} fill={BRAND.success} fillOpacity={0.08} />
          )}
          {refLow != null && (
            <ReferenceLine
              y={refLow}
              stroke={BRAND.success}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: t('graph.min', { value: refLow, unit: graphData.unit || '' }),
                position: 'insideBottomLeft',
                // 12px es el suelo duro de la escala (paso 4); por debajo no se lee.
                fontSize: 12,
                fill: BRAND.success,
                fontFamily: FONT_STACK,
              }}
            />
          )}
          {refHigh != null && (
            <ReferenceLine
              y={refHigh}
              stroke={BRAND.success}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: t('graph.max', { value: refHigh, unit: graphData.unit || '' }),
                position: 'insideTopLeft',
                fontSize: 12,
                fill: BRAND.success,
                fontFamily: FONT_STACK,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={BRAND.primary}
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              const color = statusColorFor(payload.status);
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <Stack
        direction="row"
        spacing={2.5}
        justifyContent="center"
        alignItems="center"
        sx={{ mt: GAP_BLOCK, flexWrap: 'wrap', rowGap: GAP_IN }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center">
          {statusDot(BRAND.success)}
          {metaText(t('graph.normal'), 'text.secondary')}
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {statusDot(BRAND.danger)}
          {metaText(t('graph.high'), 'text.secondary')}
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {statusDot(BRAND.info)}
          {metaText(t('graph.low'), 'text.secondary')}
        </Stack>
        {(refLow != null || refHigh != null) && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 16, height: 2, bgcolor: BRAND.success, borderRadius: 1 }} />
            {metaText(t('graph.normalRange'), 'text.secondary')}
          </Stack>
        )}
        {metaText(t('graph.measurements', { count: graphData.dataPoints.length }))}
      </Stack>
    </Box>
  );
}

/* ----------------------------- floating dialog chrome ----------------------------- */
const dialogPaperSx = (isDark: boolean, isMobile: boolean) => ({
  ...glassSx(isDark, 'floating', { blur: 28, radius: isMobile ? 0 : RADIUS.xl }),
  boxShadow: elevations[4],
  overflow: 'hidden' as const,
  ...(isMobile ? { borderRadius: 0 } : {}),
});

/* ----------------------------- main component ----------------------------- */
interface LaboratorySectionProps {
  patientId: string;
  onDataChange?: () => void;
  onDeleteDocument?: (docId: string, docName: string) => void;
}

export const LaboratorySection: React.FC<LaboratorySectionProps> = ({
  patientId,
  onDataChange,
  onDeleteDocument,
}) => {
  const { t } = useTranslation('laboratorySection');
  const { role } = useAuth();
  const notify = useNotify();
  const { startUpload } = useUploads();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [reprocessingDocId, setReprocessingDocId] = React.useState<string | null>(null);
  const [dropConfirmOpen, setDropConfirmOpen] = React.useState(false);
  const [pendingDropFiles, setPendingDropFiles] = React.useState<FileList | null>(null);
  const [expandedDocs, setExpandedDocs] = React.useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = React.useState<string>('');
  const [pendingFiles, setPendingFiles] = React.useState<FileList | null>(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
  const [viewerContentType, setViewerContentType] = React.useState<string>('');
  const [viewerLoading, setViewerLoading] = React.useState(false);
  const [viewerTitle, setViewerTitle] = React.useState<string>('');
  const [viewerZoom, setViewerZoom] = React.useState(1);
  const [viewerRotate, setViewerRotate] = React.useState(0);

  const { openAnalyteGraph: openAnalyteGraphCtx } = useAnalyteGraph();
  const [viewMode, setViewMode] = React.useState<'all' | 'abnormal'>('all');
  const [selectedStudy, setSelectedStudy] = React.useState<string>('all');
  const [ocrProcessing, setOcrProcessing] = React.useState(false);
  const [ocrPollingCount, setOcrPollingCount] = React.useState(0);
  const [analytesPage, setAnalytesPage] = React.useState(0);
  const [analyteSearch, setAnalyteSearch] = React.useState('');
  const ANALYTES_PER_PAGE = 60;


  const { data, refetch } = useQuery({
    queryKey: ['patientOverview', patientId],
    queryFn: () => getPatientOverview(patientId),
    enabled: !!patientId,
    retry: false,
  });

  const { data: labResults, refetch: refetchLabResults } = useQuery({
    queryKey: ['patientLabResults', patientId],
    queryFn: () => getPatientLabResults(patientId),
    enabled: !!patientId,
    retry: false,
  });

  const studyOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    (labResults || []).forEach((r) => {
      const raw = (r.studyType || '').trim();
      if (!raw) return;
      const normalized = raw.toLowerCase();
      if (!map.has(normalized)) map.set(normalized, raw);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [labResults]);

  const filteredLabResults = React.useMemo(() => {
    if (!labResults) return [];
    if (selectedStudy === 'all') return labResults;
    return labResults.filter(
      (r) => (r.studyType || '').trim().toLowerCase() === selectedStudy
    );
  }, [labResults, selectedStudy]);

  const { data: labSummary } = useQuery({
    queryKey: ['patientLabSummary', patientId],
    queryFn: () => getPatientLabSummary(patientId),
    enabled: !!patientId,
    retry: false,
  });

  const latestByAnalyte = React.useMemo<LabResult[]>(() => {
    if (!labResults) return [];
    const timeOf = (r: LabResult) =>
      new Date(r.studyDate || r.createdAt || 0).getTime();
    const map = new Map<string, LabResult>();
    for (const r of labResults) {
      const key = r.analyteNormalized;
      const existing = map.get(key);
      if (!existing || timeOf(r) > timeOf(existing)) map.set(key, r);
    }
    return Array.from(map.values());
  }, [labResults]);

  const measurementsByAnalyte = React.useMemo(() => {
    const counts = new Map<string, number>();
    (labResults || []).forEach((r) => {
      counts.set(r.analyteNormalized, (counts.get(r.analyteNormalized) || 0) + 1);
    });
    return counts;
  }, [labResults]);

  const abnormalUniqueCount = React.useMemo(
    () =>
      latestByAnalyte.filter(
        (r) => r.status !== 'normal' && r.status !== 'unknown'
      ).length,
    [latestByAnalyte]
  );

  const openAnalyteGraph = (analyteNormalized: string, analyteName: string) =>
    openAnalyteGraphCtx(analyteNormalized, analyteName);

  const handleFileUpload = (files: FileList) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    // Etiqueta explícita 'laboratorios': lo subido DESDE esta sección debe
    // aparecer aquí sí o sí, sin importar el nombre del archivo. Antes, un
    // estudio con "ecg"/"electro" en el nombre se auto-clasificaba como
    // "paraclínicos" (inferCategory del backend) y desaparecía del listado.
    startUpload({
      files: Array.from(files),
      patientId: role === 'doctor' && patientId ? patientId : undefined,
      category: 'laboratorios',
      onDone: async () => {
        setUploading(false);
        await refetch();
        setOcrProcessing(true);
        setOcrPollingCount(0);
        notify({ message: t('notify.uploaded'), severity: 'success' });
      },
      onCancelled: () => setUploading(false),
      onError: () => {
        setUploading(false);
        notify({ message: t('notify.uploadError'), severity: 'error' });
      },
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  React.useEffect(() => {
    if (!ocrProcessing) return;
    const interval = setInterval(async () => {
      if (document.hidden) return; // no pollear con la pestaña en segundo plano
      try {
        // Run both refetches in parallel — they're independent, so awaiting them
        // serially was doubling the latency of every 4s polling cycle.
        await Promise.all([refetch(), refetchLabResults()]);
        setOcrPollingCount((c) => c + 1);
      } catch {}
    }, 4000);
    if (ocrPollingCount > 30) {
      setOcrProcessing(false);
      onDataChange?.();
    }
    return () => clearInterval(interval);
  }, [ocrProcessing, ocrPollingCount]);

  const prevLabCountRef = React.useRef(labResults?.length || 0);
  React.useEffect(() => {
    if (!ocrProcessing) return;
    const currentCount = labResults?.length || 0;
    if (currentCount > prevLabCountRef.current && ocrPollingCount > 1) {
      setTimeout(() => {
        setOcrProcessing(false);
        refetchLabResults();
        onDataChange?.();
      }, 8000);
    }
    prevLabCountRef.current = currentCount;
  }, [labResults?.length, ocrProcessing, ocrPollingCount]);

  const handleFileInputChange = (files: FileList) => {
    if (!files || files.length === 0) return;
    const first = files[0];
    const isPdfFile = first && (first.type === 'application/pdf' || /\.pdf$/i.test(first.name));
    if (isPdfFile) {
      const url = URL.createObjectURL(first);
      setPreviewUrl(url);
      setPreviewFileName(first.name);
      setPendingFiles(files);
      setPreviewOpen(true);
    } else {
      void handleFileUpload(files);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewOpen(false);
    setPendingFiles(null);
  };

  const confirmUploadFromPreview = () => {
    if (!pendingFiles) return;
    handleFileUpload(pendingFiles);
    closePreview();
  };

  const openPdfForDocument = async (doc: { id: string; originalName?: string }) => {
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerTitle(doc.originalName || t('doc.defaultViewerTitle'));
    setViewerZoom(1);
    setViewerRotate(0);
    try {
      if (role === 'doctor') {
        const { blob, contentType } = await fetchDoctorPatientDocumentBlob(patientId, doc.id);
        const url = URL.createObjectURL(blob);
        setViewerUrl(url);
        setViewerContentType(contentType);
      } else {
        const { url, contentType } = await fetchDocumentBlobUrl(doc.id);
        setViewerUrl(url);
        setViewerContentType(contentType);
      }
    } catch {
      notify({ message: t('notify.openError'), severity: 'error' });
      setViewerOpen(false);
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null);
    setViewerContentType('');
    setViewerOpen(false);
    setViewerTitle('');
    setViewerZoom(1);
    setViewerRotate(0);
  };

  // Safety net for the preview/viewer blob URLs: revoke when replaced by a new
  // file or when the section unmounts. The close handlers above cover the happy
  // path, but opening a second document or navigating away mid-view would
  // otherwise leak the underlying Blob (a full PDF/image) in memory.
  React.useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  React.useEffect(() => {
    return () => { if (viewerUrl) URL.revokeObjectURL(viewerUrl); };
  }, [viewerUrl]);

  React.useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+') {
        setViewerZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)));
      }
      if (e.key === '-') {
        setViewerZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
      }
      if (e.key === '0') {
        setViewerZoom(1);
      }
      if (e.key.toLowerCase() === 'r') {
        setViewerRotate((r) => (r + 90) % 360);
      }
      if (e.key === 'Escape') {
        closeViewer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = e.dataTransfer.files;
    if (dropped && dropped.length > 0) {
      setPendingDropFiles(dropped);
      setDropConfirmOpen(true);
    }
  };

  const cancelDropConfirm = () => {
    setDropConfirmOpen(false);
    setPendingDropFiles(null);
  };

  const confirmDrop = () => {
    if (!pendingDropFiles) return;
    setDropConfirmOpen(false);
    handleFileInputChange(pendingDropFiles);
    setPendingDropFiles(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleReprocess = async (docId: string) => {
    setReprocessingDocId(docId);
    try {
      const result =
        role === 'doctor' && patientId
          ? await reprocessLabDocumentForPatient(patientId, docId)
          : await reprocessLabDocument(docId);
      await refetch();
      await refetchLabResults();
      if (result.extracted === 0) {
        notify({
          message: result.message ?? t('notify.noAnalytes'),
          severity: 'warning',
        });
      } else {
        notify({
          message: t('notify.reprocessed', { count: result.extracted }),
          severity: 'success',
        });
      }
    } catch {
      notify({ message: t('notify.reprocessError'), severity: 'error' });
    } finally {
      setReprocessingDocId(null);
    }
  };

  const handleDeleteDocument = (docId: string, docName: string) => {
    onDeleteDocument?.(docId, docName);
  };

  if (!data) return null;

  const documents = ((data?.documents || []) as any[]).filter(
    (d) => d.documentCategory === 'laboratorios'
  );
  const docIds = new Set<string>();
  filteredLabResults.forEach((r: LabResult) => {
    if (r.documentId) docIds.add(r.documentId);
  });
  documents.forEach((d) => docIds.add(d.id));
  const hasAnyDocs = docIds.size > 0 || (documents && documents.length > 0);

  const allDocs = (data?.documents || []) as any[];
  const docList = Array.from(docIds).map((docId) => {
    const doc =
      documents.find((d) => d.id === docId) ||
      allDocs.find((d) => d.id === docId) || {
        id: docId,
        originalName: t('doc.defaultName'),
        createdAt: '',
      };
    const docLabResults = filteredLabResults.filter((r: LabResult) => r.documentId === docId);
    return { doc, docLabResults, docId };
  });

  const canUpload = role === 'doctor' || role === 'clinic' || role === 'nurse' || role === 'patient';

  /* --------------------------- render --------------------------- */
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onDrop={canUpload ? handleDrop : undefined}
      onDragOver={canUpload ? handleDragOver : undefined}
      onDragEnter={canUpload ? handleDragEnter : undefined}
      onDragLeave={canUpload ? handleDragLeave : undefined}
      sx={{ position: 'relative', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}
    >
      {/* Drag overlay */}
      {dragOver && canUpload && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            borderRadius: 3,
            border: '2px dashed',
            borderColor: BRAND.primary,
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            pointerEvents: 'none',
            backdropFilter: 'blur(2px)',
          }}
        >
          <UploadFileIcon sx={{ fontSize: 56, color: BRAND.primary }} />
          <Typography
            sx={{
              fontSize: T_TITLE,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: BRAND.primary,
            }}
          >
            {t('upload.dropHere')}
          </Typography>
          <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
            {t('upload.dropHint')}
          </Typography>
        </Box>
      )}

      <SectionHeader
        icon={<ScienceIcon />}
        title={t('header.title')}
        subtitle={
          (labResults?.length || 0) > 0
            ? t('header.analytesExtracted', { count: labResults!.length })
            : t('header.subtitleDefault')
        }
        trailing={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            {studyOptions.length > 0 && (
              <FormControl
                size="small"
                sx={{
                  minWidth: { xs: '100%', sm: 220 },
                  '& .MuiOutlinedInput-root': {
                    ...glassSx(isDark, 'row', { blur: 14, radius: RADIUS.sm }),
                    '& fieldset': { border: 'none' },
                  },
                }}
              >
                <InputLabel id="lab-study-filter-label">{t('filter.study')}</InputLabel>
                <Select
                  labelId="lab-study-filter-label"
                  value={selectedStudy}
                  label={t('filter.study')}
                  onChange={(e) => {
                    setSelectedStudy(e.target.value);
                    setAnalytesPage(0);
                  }}
                >
                  <MenuItem value="all">{t('filter.allStudies')}</MenuItem>
                  {studyOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept=".pdf,image/*"
              onChange={(e) => e.target.files && handleFileInputChange(e.target.files)}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              startIcon={
                uploading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <UploadFileIcon sx={{ fontSize: 18 }} />
                )
              }
              sx={{ ...primaryButtonSx(isDark), minWidth: 0 }}
            >
              {!isMobile && (uploading ? t('upload.processing') : t('upload.uploadResults'))}
            </Button>
          </Stack>
        }
      />

      {/* OCR Processing Banner */}
      {ocrProcessing && (
        <Box
          sx={{
            ...glassSx(isDark, 'panel', { blur: 18, radius: RADIUS.lg }),
            p: 2,
            mb: GAP_BLOCK,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box sx={{ ...iconBucketSx(isDark, BRAND.primary), width: 34, height: 34 }}>
            <AutoAwesomeIcon sx={{ fontSize: 17 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* El azul de marca lo llevan el bucket y el spinner; en texto no llega a contraste. */}
            <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary' }}>
              {t('ocr.analyzing')}
            </Typography>
            <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
              {(labResults?.length || 0) > 0
                ? t('ocr.found', { count: labResults!.length })
                : t('ocr.processingPages')}
            </Typography>
          </Box>
          <CircularProgress size={18} sx={{ color: BRAND.primary }} />
        </Box>
      )}

      {/* Empty state (drag-drop) */}
      {!hasAnyDocs && !labResults?.length ? (
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={t('upload.uploadAria')}
          sx={{
            ...glassSx(isDark, 'panel', { blur: 20, radius: RADIUS.xl }),
            border: `1.5px dashed ${alpha(BRAND.primary, dragOver ? 0.6 : 0.3)}`,
            p: { xs: 4, md: 5 },
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 240ms cubic-bezier(0.4,0,0.2,1)',
            transform: dragOver ? 'translateY(-2px)' : undefined,
            boxShadow: dragOver ? elevations[3] : elevations[1],
            '&:hover': {
              borderColor: alpha(BRAND.primary, 0.5),
              boxShadow: elevations[2],
            },
            '&:focus-visible': {
              outline: `2px solid ${BRAND.primary}`,
              outlineOffset: 2,
            },
          }}
        >
          <Box
            sx={{
              ...iconBucketSx(isDark, BRAND.primary),
              width: 56,
              height: 56,
              borderRadius: `${RADIUS.lg}px`,
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <ScienceIcon sx={{ fontSize: 26 }} />
          </Box>
          <Typography
            sx={{
              fontSize: T_TITLE,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: dragOver ? BRAND.primary : 'text.primary',
              mb: GAP_IN,
            }}
          >
            {dragOver ? t('upload.dropHere') : t('upload.emptyTitle')}
          </Typography>
          <Typography
            sx={{
              fontSize: T_BODY,
              fontWeight: 400,
              color: 'text.secondary',
              maxWidth: '68ch',
              mx: 'auto',
              mb: 3,
              lineHeight: 1.55,
            }}
          >
            {t('upload.emptyDescription')}
          </Typography>
          <Button
            startIcon={
              uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />
            }
            disabled={uploading}
            sx={{ ...primaryButtonSx(isDark), px: 3.5 }}
          >
            {uploading ? t('upload.processing') : t('upload.selectFiles')}
          </Button>
          <Typography
            sx={{
              fontSize: T_META,
              fontWeight: 400,
              color: 'text.secondary',
              mt: GAP_BLOCK,
              display: 'block',
            }}
          >
            {t('upload.supportedFormats')}
          </Typography>
        </Box>
      ) : null}

      {/* Documents list */}
      {hasAnyDocs && (
        <Box
          component={motion.div}
          variants={listStagger}
          initial="hidden"
          animate="visible"
        >
          <GroupedList>
            {docList.map(({ doc, docLabResults, docId }) => {
              const isExpanded = expandedDocs.has(docId);
              const name = (doc as any).originalName || '';
              const isPdfDoc = /\.pdf$/i.test(name);
              const isImageDoc = /\.(jpg|jpeg|png|webp)$/i.test(name);
              const docHue = isPdfDoc ? BRAND.danger : isImageDoc ? BRAND.primary : BRAND.info;
              const DocIcon = isPdfDoc ? PdfIcon : isImageDoc ? ImageIcon : FileIcon;
              const abnormalCount = docLabResults.filter(
                (r: LabResult) => r.status === 'high' || r.status === 'low'
              ).length;

              const resultsByPage = new Map<number, LabResult[]>();
              docLabResults.forEach((r: LabResult) => {
                const pg = r.pageNumber || 0;
                if (!resultsByPage.has(pg)) resultsByPage.set(pg, []);
                resultsByPage.get(pg)!.push(r);
              });
              const sortedPages = Array.from(resultsByPage.entries()).sort(
                (a, b) => a[0] - b[0]
              );

              const studyDate = docLabResults.find((r: LabResult) => r.studyDate)?.studyDate;
              const displayDate = studyDate || (doc as any).createdAt;
              const dateLabel = displayDate
                ? new Date(displayDate).toLocaleDateString(dateLocale(), {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : t('doc.unknownDate');

              return (
                <Box
                  component={motion.div}
                  key={docId}
                  variants={itemFade}
                >
                  <ListRow
                    icon={
                      <Box sx={{ ...iconBucketSx(isDark, docHue), width: 30, height: 30 }}>
                        <DocIcon sx={{ fontSize: 17 }} />
                      </Box>
                    }
                    title={
                      <Typography
                        sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary' }}
                        noWrap
                      >
                        {name}
                      </Typography>
                    }
                    subtitle={
                      <Stack
                        direction="row"
                        spacing={0.6}
                        alignItems="center"
                        sx={{ mt: 0.35, flexWrap: 'wrap', rowGap: 0.5 }}
                      >
                        {metaText(dateLabel, 'text.secondary')}
                        {docLabResults.length > 0 && metaDot}
                        {docLabResults.length > 0 &&
                          metaText(t('doc.analytes', { count: docLabResults.length }))}
                        {abnormalCount > 0 && metaDot}
                        {/* "alterados" es la señal redundante del rojo, por daltonismo. */}
                        {abnormalCount > 0 &&
                          metaText(t('doc.abnormal', { count: abnormalCount }), BRAND.danger, 600)}
                        {sortedPages.length > 1 && metaDot}
                        {sortedPages.length > 1 &&
                          metaText(t('doc.pages', { count: sortedPages.length }))}
                      </Stack>
                    }
                    trailing={
                      <Stack direction="row" spacing={0.25} alignItems="center">
                        <Tooltip title={t('doc.viewOriginal')}>
                          <IconButton
                            size="small"
                            aria-label={t('doc.viewOriginalAria')}
                            onClick={(e) => {
                              e.stopPropagation();
                              void openPdfForDocument(doc as any);
                            }}
                            sx={{
                              width: 30,
                              height: 30,
                              color: 'text.secondary',
                              '&:hover': {
                                color: BRAND.primary,
                                bgcolor: alpha(BRAND.primary, 0.08),
                              },
                            }}
                          >
                            <VisibilityIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('doc.reprocess')}>
                          <span>
                            <IconButton
                              size="small"
                              aria-label={t('doc.reprocessAria')}
                              disabled={reprocessingDocId === (doc as any).id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleReprocess((doc as any).id);
                              }}
                              sx={{
                                width: 30,
                                height: 30,
                                color: 'text.secondary',
                                '&:hover': {
                                  color: BRAND.primary,
                                  bgcolor: alpha(BRAND.primary, 0.08),
                                },
                              }}
                            >
                              {reprocessingDocId === (doc as any).id ? (
                                <CircularProgress size={14} sx={{ color: BRAND.primary }} />
                              ) : (
                                <AutoAwesomeIcon sx={{ fontSize: 17 }} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('doc.delete')}>
                          <IconButton
                            size="small"
                            aria-label={t('doc.deleteAria')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(
                                (doc as any).id,
                                (doc as any).originalName || t('doc.fallbackName')
                              );
                            }}
                            sx={{
                              width: 30,
                              height: 30,
                              color: 'text.secondary',
                              '&:hover': {
                                color: BRAND.danger,
                                bgcolor: alpha(BRAND.danger, 0.06),
                              },
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          aria-label={isExpanded ? t('doc.collapse') : t('doc.expand')}
                          sx={{
                            width: 30,
                            height: 30,
                            color: 'text.secondary',
                          }}
                        >
                          {isExpanded ? (
                            <ExpandLessIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <ExpandMoreIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </Stack>
                    }
                    onClick={() => {
                      const next = new Set(expandedDocs);
                      if (isExpanded) next.delete(docId);
                      else next.add(docId);
                      setExpandedDocs(next);
                    }}
                    expanded={isExpanded && docLabResults.length > 0}
                    expandedContent={
                      <AnimatePresence>
                        {isExpanded && docLabResults.length > 0 && (
                          <Box
                            component={motion.div}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            sx={{ mt: 1, ml: { xs: 0, sm: 5.25 }, minWidth: 0 }}
                          >
                            <Stack spacing={GAP_BLOCK}>
                              {sortedPages.map(([pageNum, pageResults]) => (
                                <Box key={`page-${pageNum}`}>
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="baseline"
                                    sx={{
                                      mb: GAP_IN,
                                      px: 0.25,
                                      pb: 0.5,
                                      borderBottom: `1px solid ${hairline(isDark)}`,
                                    }}
                                  >
                                    {metaText(
                                      pageNum > 0
                                        ? t('doc.page', { page: pageNum })
                                        : t('doc.results'),
                                      'text.secondary',
                                    )}
                                    {metaText(t('doc.analytes', { count: pageResults.length }))}
                                  </Stack>
                                  <GroupedList dense>
                                    {pageResults
                                      .slice()
                                      .sort(
                                        (a: LabResult, b: LabResult) =>
                                          (a.status === 'high' || a.status === 'low' ? 0 : 1) -
                                          (b.status === 'high' || b.status === 'low' ? 0 : 1)
                                      )
                                      .map((result: LabResult) => {
                                        const isAbnormal =
                                          result.status === 'high' || result.status === 'low';
                                        const hasRefRange =
                                          result.refLow != null || result.refHigh != null;
                                        const color = statusColorFor(result.status);
                                        const StatusIcon =
                                          result.status === 'high'
                                            ? TrendingUpIcon
                                            : result.status === 'low'
                                            ? TrendingDownIcon
                                            : CheckCircleOutlineIcon;

                                        const pct =
                                          result.refLow != null &&
                                          result.refHigh != null &&
                                          result.valueNumeric != null
                                            ? Math.min(
                                                100,
                                                Math.max(
                                                  0,
                                                  ((Number(result.valueNumeric) -
                                                    Number(result.refLow)) /
                                                    (Number(result.refHigh) -
                                                      Number(result.refLow))) *
                                                    100
                                                )
                                              )
                                            : null;

                                        return (
                                          <ListRow
                                            key={result.id}
                                            dense
                                            onClick={() =>
                                              openAnalyteGraph(
                                                result.analyteNormalized,
                                                result.analyteName
                                              )
                                            }
                                            title={
                                              <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={0.75}
                                              >
                                                {statusDot(color)}
                                                <Typography
                                                  sx={{
                                                    fontSize: T_BODY,
                                                    fontWeight: 400,
                                                    color: 'text.primary',
                                                  }}
                                                  noWrap
                                                >
                                                  {result.analyteName}
                                                </Typography>
                                              </Stack>
                                            }
                                            subtitle={
                                              pct != null ? (
                                                <Box sx={{ mt: 0.5, pr: 1 }}>
                                                  <Stack
                                                    direction="row"
                                                    justifyContent="space-between"
                                                    sx={{
                                                      mb: 0.35,
                                                      fontVariantNumeric: 'tabular-nums',
                                                    }}
                                                  >
                                                    {metaText(fmtNum(result.refLow))}
                                                    {metaText(fmtNum(result.refHigh))}
                                                  </Stack>
                                                  <Box
                                                    sx={{
                                                      height: 4,
                                                      bgcolor: alpha(
                                                        BRAND.primary,
                                                        isDark ? 0.1 : 0.08
                                                      ),
                                                      borderRadius: 3,
                                                      position: 'relative',
                                                    }}
                                                  >
                                                    <Box
                                                      sx={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        right: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        bgcolor: alpha(BRAND.success, 0.25),
                                                        borderRadius: 3,
                                                      }}
                                                    />
                                                    <Box
                                                      sx={{
                                                        position: 'absolute',
                                                        left: `${pct}%`,
                                                        top: -3,
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: color,
                                                        border: `2px solid ${
                                                          isDark ? '#0F1A1F' : '#fff'
                                                        }`,
                                                        boxShadow: `0 1px 4px ${alpha(color, 0.4)}`,
                                                        transform: 'translateX(-5px)',
                                                      }}
                                                    />
                                                  </Box>
                                                </Box>
                                              ) : (
                                                <Box sx={{ mt: 0.25 }}>
                                                  {metaText(t('doc.noRefRange'))}
                                                </Box>
                                              )
                                            }
                                            trailing={
                                              <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={1}
                                              >
                                                <Box sx={{ textAlign: 'right' }}>
                                                  <Typography
                                                    sx={{
                                                      fontSize: T_TITLE,
                                                      fontWeight: 600,
                                                      letterSpacing: '-0.01em',
                                                      fontVariantNumeric: 'tabular-nums',
                                                      color: isAbnormal ? color : 'text.primary',
                                                      lineHeight: 1.15,
                                                    }}
                                                  >
                                                    {result.valueNumeric != null
                                                      ? fmtNum(result.valueNumeric)
                                                      : result.valueText ?? '-'}
                                                  </Typography>
                                                  {result.unit && (
                                                    <Typography
                                                      sx={{
                                                        fontSize: T_META,
                                                        fontWeight: 400,
                                                        color: 'text.secondary',
                                                        mt: 0.25,
                                                      }}
                                                    >
                                                      {result.unit}
                                                    </Typography>
                                                  )}
                                                </Box>
                                                {isAbnormal &&
                                                  statusWord(
                                                    statusLabelFor(result.status, hasRefRange),
                                                    color,
                                                    StatusIcon
                                                  )}
                                              </Stack>
                                            }
                                          />
                                        );
                                      })}
                                  </GroupedList>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </AnimatePresence>
                    }
                  />
                </Box>
              );
            })}
          </GroupedList>
        </Box>
      )}

      {/* Analytes grid — paginated bento */}
      {labResults && labResults.length > 0 && (
        <Box sx={{ mt: GAP_LAYER }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'baseline' }}
            spacing={1.5}
            sx={{ mb: GAP_BLOCK }}
          >
            <Stack direction="row" alignItems="baseline" spacing={1}>
              {/* Icono desnudo, sin bucket teñido: aquí no codifica nada, sólo ubica. */}
              <ChartIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography
                sx={{
                  fontSize: T_TITLE,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: 'text.primary',
                }}
              >
                {t('analytes.title')}
              </Typography>
              {metaText(`${labSummary?.uniqueAnalytes ?? latestByAnalyte.length}`)}
            </Stack>
            <Stack direction="row" spacing={0.75}>
              {(['all', 'abnormal'] as const).map((mode) => {
                const active = viewMode === mode;
                const label =
                  mode === 'all'
                    ? t('analytes.all')
                    : t('analytes.abnormal', { count: abnormalUniqueCount });
                const hue = mode === 'all' ? BRAND.primary : BRAND.danger;
                return (
                  <Box
                    key={mode}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setViewMode(mode);
                      setAnalytesPage(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setViewMode(mode);
                        setAnalytesPage(0);
                      }
                    }}
                    sx={{
                      ...glassSx(isDark, 'row', { blur: 14, radius: RADIUS.pill }),
                      px: 1.5,
                      py: 0.6,
                      cursor: 'pointer',
                      fontSize: T_BODY,
                      // El seleccionado se marca con el borde, no con negrita.
                      fontWeight: 400,
                      color: active ? hue : 'text.secondary',
                      border: `1px solid ${alpha(hue, active ? 0.55 : 0.14)}`,
                      transition: 'all 180ms cubic-bezier(0.4,0,0.2,1)',
                      '&:hover': { borderColor: alpha(hue, 0.35) },
                      '&:focus-visible': {
                        outline: `2px solid ${hue}`,
                        outlineOffset: 2,
                      },
                    }}
                  >
                    {label}
                  </Box>
                );
              })}
            </Stack>
          </Stack>

          <TextField
            value={analyteSearch}
            onChange={(e) => {
              setAnalyteSearch(e.target.value);
              setAnalytesPage(0);
            }}
            placeholder={t('analytes.searchPlaceholder')}
            size="small"
            fullWidth
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: alpha(BRAND.primary, 0.7) }} />
                </InputAdornment>
              ),
              endAdornment: analyteSearch ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label={t('analytes.clearSearchAria')}
                    onClick={() => {
                      setAnalyteSearch('');
                      setAnalytesPage(0);
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              mb: GAP_BLOCK,
              '& .MuiOutlinedInput-root': {
                ...glassSx(isDark, 'row', { blur: 14, radius: RADIUS.sm }),
                fontSize: T_BODY,
                '& fieldset': { border: 'none' },
              },
            }}
          />

          {(() => {
            const statusPriority = (s: string) =>
              s === 'high' || s === 'low' || s === 'positive' ? 0 : 1;
            const term = analyteSearch.trim().toLowerCase();
            const filtered = (viewMode === 'all'
              ? latestByAnalyte
              : latestByAnalyte.filter(
                  (r: LabResult) => r.status !== 'normal' && r.status !== 'unknown'
                )
            )
              .filter((r: LabResult) => {
                if (!term) return true;
                return (
                  (r.analyteName || '').toLowerCase().includes(term) ||
                  (r.analyteNormalized || '').toLowerCase().includes(term) ||
                  (r.studyType || '').toLowerCase().includes(term)
                );
              })
              .slice()
              .sort(
                (a: LabResult, b: LabResult) =>
                  statusPriority(a.status) - statusPriority(b.status)
              );
            const totalPages = Math.ceil(filtered.length / ANALYTES_PER_PAGE);
            const paged = filtered.slice(
              analytesPage * ANALYTES_PER_PAGE,
              (analytesPage + 1) * ANALYTES_PER_PAGE
            );

            return (
              <>
                <Box
                  component={motion.div}
                  variants={listStagger}
                  initial="hidden"
                  animate="visible"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      md: 'repeat(3, minmax(0, 1fr))',
                      lg: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: GAP_IN,
                    minWidth: 0,
                  }}
                >
                  {paged.map((result: LabResult) => {
                    const isAbnormal =
                      result.status === 'high' ||
                      result.status === 'low' ||
                      result.status === 'positive';
                    const hasRefRange =
                      result.refLow != null || result.refHigh != null;
                    const color = statusColorFor(result.status);
                    const StatusIcon =
                      result.status === 'high'
                        ? TrendingUpIcon
                        : result.status === 'low'
                        ? TrendingDownIcon
                        : CheckCircleOutlineIcon;

                    return (
                      <Box
                        key={result.id}
                        component={motion.div}
                        variants={itemFade}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          openAnalyteGraph(result.analyteNormalized, result.analyteName)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openAnalyteGraph(
                              result.analyteNormalized,
                              result.analyteName
                            );
                          }
                        }}
                        sx={{
                          ...glassSx(isDark, 'panel', { blur: 16, radius: RADIUS.md }),
                          position: 'relative',
                          p: 1.5,
                          cursor: 'pointer',
                          transition: 'all 220ms cubic-bezier(0.4,0,0.2,1)',
                          boxShadow: elevations[1],
                          '&:hover': {
                            boxShadow: elevations[2],
                            transform: 'translateY(-1px)',
                          },
                          '&:focus-visible': {
                            outline: `2px solid ${BRAND.primary}`,
                            outlineOffset: 2,
                          },
                          '@media (prefers-reduced-motion: reduce)': {
                            transition: 'none',
                            '&:hover': { transform: 'none' },
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          spacing={1}
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: T_BODY,
                                fontWeight: 400,
                                color: 'text.secondary',
                                mb: 0.25,
                              }}
                              noWrap
                              title={result.analyteName}
                            >
                              {result.analyteName}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="baseline">
                              <Typography
                                sx={{
                                  // El paso 1 NO se usa aquí: la rejilla pinta hasta 60
                                  // analitos y con el filtro "Alterados" salían 60 cifras
                                  // a 28px, que es el muro que este rediseño venía a quitar.
                                  // Lo anormal se distingue por color y peso, no por tamaño.
                                  fontSize: T_TITLE,
                                  fontWeight: 600,
                                  fontVariantNumeric: 'tabular-nums',
                                  color: isAbnormal ? color : 'text.primary',
                                  lineHeight: 1.15,
                                  // Una cifra de laboratorio no se parte nunca: break-word
                                  // dejaba "1250.75" como "1250." / "75". Si no cabe, se
                                  // recorta con elipsis y el valor completo va en title.
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={
                                  result.valueNumeric != null
                                    ? fmtNum(result.valueNumeric)
                                    : result.valueText ?? undefined
                                }
                              >
                                {result.valueNumeric != null
                                  ? fmtNum(result.valueNumeric)
                                  : result.valueText ?? '-'}
                              </Typography>
                              {result.unit && (
                                <Typography
                                  sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}
                                >
                                  {result.unit}
                                </Typography>
                              )}
                            </Stack>
                            {(result.refLow != null || result.refHigh != null) && (
                              <Box sx={{ mt: 0.35 }}>
                                {metaText(
                                  t('analytes.ref', {
                                    low: result.refLow != null ? fmtNum(result.refLow) : '-',
                                    high: result.refHigh != null ? fmtNum(result.refHigh) : '-',
                                  }),
                                )}
                              </Box>
                            )}
                          </Box>
                          {isAbnormal &&
                            statusWord(
                              statusLabelFor(result.status, hasRefRange),
                              color,
                              StatusIcon
                            )}
                        </Stack>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mt: 0.75, gap: 1 }}
                        >
                          {result.pageNumber != null && result.pageNumber > 0
                            ? metaText(
                                `${t('analytes.pageShort', { page: result.pageNumber })}${
                                  result.studyDate
                                    ? ` · ${new Date(result.studyDate).toLocaleDateString(dateLocale())}`
                                    : ''
                                }`,
                              )
                            : <span />}
                          {(() => {
                            const count =
                              measurementsByAnalyte.get(result.analyteNormalized) || 1;
                            if (count <= 1) return null;
                            return (
                              <Stack direction="row" alignItems="center" spacing={0.35}>
                                <TimelineIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                {metaText(t('analytes.measurements', { count }))}
                              </Stack>
                            );
                          })()}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>

                {filtered.length === 0 && (
                  <Stack
                    alignItems="center"
                    spacing={1}
                    sx={{ py: 5, color: 'text.secondary' }}
                  >
                    <SearchIcon sx={{ fontSize: 28, color: alpha(BRAND.primary, 0.45) }} />
                    <Typography sx={{ fontSize: T_BODY, fontWeight: 400 }}>
                      {analyteSearch.trim()
                        ? t('analytes.noResultsFor', { term: analyteSearch.trim() })
                        : t('analytes.noAnalytes')}
                    </Typography>
                    {analyteSearch.trim() && (
                      <Button
                        size="small"
                        onClick={() => {
                          setAnalyteSearch('');
                          setAnalytesPage(0);
                        }}
                        sx={{ ...secondaryButtonSx(isDark), minWidth: 0 }}
                      >
                        {t('analytes.clearSearch')}
                      </Button>
                    )}
                  </Stack>
                )}

                {totalPages > 1 && (
                  <Stack
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                    spacing={2}
                    sx={{ mt: GAP_BLOCK }}
                  >
                    <Button
                      size="small"
                      disabled={analytesPage === 0}
                      onClick={() => setAnalytesPage((p) => Math.max(0, p - 1))}
                      sx={{ ...secondaryButtonSx(isDark), minWidth: 0 }}
                    >
                      {t('analytes.prev')}
                    </Button>
                    {/* El recorte por página no es mudo: dice cuántos resultados hay en total. */}
                    {metaText(
                      t('analytes.pagination', {
                        page: analytesPage + 1,
                        total: totalPages,
                        count: filtered.length,
                      }),
                      'text.secondary',
                    )}
                    <Button
                      size="small"
                      disabled={analytesPage >= totalPages - 1}
                      onClick={() =>
                        setAnalytesPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      sx={{ ...secondaryButtonSx(isDark), minWidth: 0 }}
                    >
                      {t('analytes.next')}
                    </Button>
                  </Stack>
                )}
              </>
            );
          })()}
        </Box>
      )}

      {/* Drop Confirmation */}
      <Dialog
        open={dropConfirmOpen}
        onClose={cancelDropConfirm}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: dialogPaperSx(isDark, isMobile) }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: `1px solid ${hairline(isDark)}`,
          }}
        >
          <Box sx={{ ...iconBucketSx(isDark, BRAND.primary), width: 36, height: 36 }}>
            <UploadFileIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: T_TITLE,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'text.primary',
              }}
            >
              {t('upload.confirmTitle')}
            </Typography>
            {metaText(
              pendingDropFiles && pendingDropFiles.length > 1
                ? t('upload.nFiles', { count: pendingDropFiles.length })
                : t('upload.oneFile'),
              'text.secondary',
            )}
          </Box>
          <IconButton
            size="small"
            aria-label={t('viewer.close')}
            onClick={cancelDropConfirm}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 1 }}>
          <GroupedList dense>
            {pendingDropFiles &&
              Array.from(pendingDropFiles).map((file, i) => {
                const isPdfFile =
                  file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
                const hue = isPdfFile ? BRAND.danger : BRAND.primary;
                const Icon = isPdfFile ? PdfIcon : ImageIcon;
                return (
                  <ListRow
                    key={i}
                    dense
                    icon={
                      <Box sx={{ ...iconBucketSx(isDark, hue), width: 26, height: 26 }}>
                        <Icon sx={{ fontSize: 15 }} />
                      </Box>
                    }
                    title={
                      <Typography
                        sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary' }}
                        noWrap
                      >
                        {file.name}
                      </Typography>
                    }
                    subtitle={
                      <Box sx={{ mt: 0.25 }}>
                        {metaText(`${(file.size / 1024 / 1024).toFixed(2)} MB`, 'text.secondary')}
                      </Box>
                    }
                  />
                );
              })}
          </GroupedList>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button onClick={cancelDropConfirm} sx={secondaryButtonSx(isDark)}>
            {t('upload.cancel')}
          </Button>
          <Button
            onClick={confirmDrop}
            startIcon={<UploadFileIcon />}
            sx={primaryButtonSx(isDark)}
          >
            {t('upload.upload')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Pre-upload Preview */}
      <Dialog
        open={previewOpen}
        onClose={closePreview}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        PaperProps={{ sx: dialogPaperSx(isDark, isMobile) }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: `1px solid ${hairline(isDark)}`,
          }}
        >
          <Box sx={{ ...iconBucketSx(isDark, BRAND.primary), width: 36, height: 36 }}>
            <VisibilityIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: T_TITLE,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'text.primary',
              }}
              noWrap
            >
              {t('upload.previewTitle')}
            </Typography>
            <Typography
              sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}
              noWrap
            >
              {previewFileName}
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label={t('viewer.close')}
            onClick={closePreview}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent
          sx={{
            p: 0,
            height: '70vh',
            bgcolor: isDark ? alpha('#000', 0.4) : alpha(BRAND.primary, 0.03),
          }}
        >
          {pendingFiles?.[0] || previewUrl ? (
            <PdfViewer
              file={(pendingFiles?.[0] as File) || (previewUrl as string)}
              zoom={1}
              rotate={0}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            onClick={closePreview}
            disabled={uploading}
            sx={secondaryButtonSx(isDark)}
          >
            {t('upload.cancel')}
          </Button>
          <Button
            onClick={confirmUploadFromPreview}
            disabled={uploading}
            startIcon={
              uploading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <UploadFileIcon />
              )
            }
            sx={primaryButtonSx(isDark)}
          >
            {uploading ? t('upload.uploading') : t('upload.confirmTitle')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stored Document Viewer */}
      <Dialog
        open={viewerOpen}
        onClose={closeViewer}
        fullWidth
        maxWidth="lg"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            ...dialogPaperSx(isDark, isMobile),
            height: isMobile ? undefined : '90vh',
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: `1px solid ${hairline(isDark)}`,
          }}
        >
          <Box sx={{ ...iconBucketSx(isDark, BRAND.primary), width: 32, height: 32 }}>
            <VisibilityIcon sx={{ fontSize: 17 }} />
          </Box>
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: T_BODY,
              fontWeight: 400,
              color: 'text.primary',
            }}
            noWrap
          >
            {viewerTitle}
          </Typography>
          <Tooltip title={t('viewer.openNewTab')}>
            <IconButton
              size="small"
              aria-label={t('viewer.openNewTab')}
              onClick={() => viewerUrl && window.open(viewerUrl, '_blank')}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: BRAND.primary, bgcolor: alpha(BRAND.primary, 0.08) },
              }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            aria-label={t('viewer.close')}
            onClick={closeViewer}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent
          sx={{
            p: 0,
            bgcolor: isDark ? alpha('#000', 0.4) : alpha(BRAND.primary, 0.03),
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {viewerLoading ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          ) : viewerUrl ? (
            <Box sx={{ flex: 1, position: 'relative', overflow: 'auto' }}>
              {viewerContentType.startsWith('image/') ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100%',
                    p: 2,
                  }}
                >
                  <img
                    src={viewerUrl}
                    alt={viewerTitle}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transform: `rotate(${viewerRotate}deg) scale(${viewerZoom})`,
                      transition: 'transform 200ms cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                </Box>
              ) : (
                <PdfViewer
                  file={viewerUrl}
                  zoom={viewerZoom}
                  rotate={viewerRotate}
                  onZoomChange={setViewerZoom}
                  onRotateChange={setViewerRotate}
                />
              )}
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
                {t('viewer.loadError')}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
