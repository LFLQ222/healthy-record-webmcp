import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChartIcon from '@mui/icons-material/InsertChartOutlined';
import {
  getAnalyteHistory,
  listPatientVitals,
  type LabResultHistory,
} from '../../services/ehrService';
import { buildVitalSeries, type VitalMetricKey } from './vitalMetrics';
import { useNotify } from '../../context/NotificationContext';
import {
  BRAND,
  RADIUS,
  glassSx,
  elevations,
  iconBucketSx,
} from '../common/designTokens';
import { AnalyteGraph } from './sections/LaboratorySection';

interface AnalyteGraphContextValue {
  openAnalyteGraph: (nameOrNormalized: string, displayName?: string) => Promise<void>;
  openVitalGraph: (metric: VitalMetricKey, displayName: string, unit?: string) => Promise<void>;
  closeAnalyteGraph: () => void;
}

const AnalyteGraphContext = React.createContext<AnalyteGraphContextValue | null>(null);

export function useAnalyteGraph(): AnalyteGraphContextValue {
  const ctx = React.useContext(AnalyteGraphContext);
  if (!ctx) {
    return {
      openAnalyteGraph: async () => {},
      openVitalGraph: async () => {},
      closeAnalyteGraph: () => {},
    };
  }
  return ctx;
}

/** Ventana del histórico para la gráfica: más ancha que la tabla de la sección. */
const VITAL_GRAPH_LIMIT = 120;

interface ProviderProps {
  patientId: string;
  children: React.ReactNode;
}

export function AnalyteGraphProvider({ patientId, children }: ProviderProps) {
  const { t } = useTranslation('analyteGraphProvider');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const notify = useNotify();

  const [selectedAnalyte, setSelectedAnalyte] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [dialogReady, setDialogReady] = React.useState(false);
  const [data, setData] = React.useState<LabResultHistory | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [kind, setKind] = React.useState<'lab' | 'vital'>('lab');
  // Dos clics seguidos y la respuesta lenta pisaba a la rápida: la serie se
  // pintaba bajo el título de otra métrica. En un expediente eso es atribuir
  // cifras al analito equivocado, así que sólo escribe la petición vigente.
  const requestToken = React.useRef(0);

  const openAnalyteGraph = React.useCallback(
    async (nameOrNormalized: string, displayName?: string) => {
      const token = ++requestToken.current;
      setKind('lab');
      setSelectedAnalyte(displayName ?? nameOrNormalized);
      setOpen(true);
      setLoading(true);
      setData(null);
      try {
        const history = await getAnalyteHistory(patientId, nameOrNormalized);
        if (token !== requestToken.current) return;
        setData(history);
      } catch {
        if (token !== requestToken.current) return;
        notify({ message: t('errorLoadingHistory'), severity: 'error' });
      } finally {
        if (token === requestToken.current) setLoading(false);
      }
    },
    [patientId, notify, t]
  );

  const openVitalGraph = React.useCallback(
    async (metric: VitalMetricKey, displayName: string, unit?: string) => {
      const token = ++requestToken.current;
      setKind('vital');
      setSelectedAnalyte(displayName);
      setOpen(true);
      setLoading(true);
      setData(null);
      try {
        const records = await listPatientVitals(patientId, { limit: VITAL_GRAPH_LIMIT });
        if (token !== requestToken.current) return;
        setData(buildVitalSeries(records, metric, displayName, unit));
      } catch {
        if (token !== requestToken.current) return;
        notify({ message: t('errorLoadingHistory'), severity: 'error' });
      } finally {
        if (token === requestToken.current) setLoading(false);
      }
    },
    [patientId, notify, t]
  );

  const closeAnalyteGraph = React.useCallback(() => {
    // Invalida lo que venga en vuelo: si no, cerrar y reabrir otra métrica
    // deja que la respuesta vieja se pinte encima de la nueva.
    requestToken.current += 1;
    setOpen(false);
    setDialogReady(false);
    setData(null);
    setSelectedAnalyte(null);
    setLoading(false);
  }, []);

  const value = React.useMemo(
    () => ({ openAnalyteGraph, openVitalGraph, closeAnalyteGraph }),
    [openAnalyteGraph, openVitalGraph, closeAnalyteGraph]
  );

  const dialogPaperSx = {
    ...glassSx(isDark, 'floating', { blur: 28, radius: isMobile ? 0 : RADIUS.xl }),
    boxShadow: elevations[4],
    overflow: 'hidden' as const,
    ...(isMobile ? { borderRadius: 0 } : {}),
  };

  return (
    <AnalyteGraphContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onClose={closeAnalyteGraph}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        TransitionProps={{ onEntered: () => setDialogReady(true) }}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ ...iconBucketSx(isDark, BRAND.info), width: 36, height: 36 }}>
            <ChartIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.78rem',
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              {t('history')}
            </Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'text.primary',
              }}
              noWrap
            >
              {selectedAnalyte}
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label={t('close')}
            onClick={closeAnalyteGraph}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          ) : data && data.dataPoints.length > 0 ? (
            dialogReady ? (
              <AnalyteGraph graphData={data} theme={theme} />
            ) : (
              <Box sx={{ height: 400 }} />
            )
          ) : (
            <Stack alignItems="center" spacing={0.75} sx={{ py: 8 }}>
              <Typography sx={{ color: 'text.secondary' }}>
                {kind === 'vital' ? t('notEnoughDataVital') : t('notEnoughData')}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.disabled',
                  background: alpha(BRAND.primary, isDark ? 0.08 : 0.05),
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                }}
              >
                {t('needTwoMeasurements')}
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </AnalyteGraphContext.Provider>
  );
}
