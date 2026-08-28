import React from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  CircularProgress,
  Divider,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import FollowUpIcon from '@mui/icons-material/FactCheck';
import RedFlagIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import { motion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  getLabExpertAnalysis,
  regenerateLabExpertAnalysis,
  type LabExpertReport,
} from '../../../services/ehrService';
import { useAnalyteGraph } from '../AnalyteGraphProvider';
import {
  BRAND,
  RADIUS,
  glassSx,
  elevations,
  iconBucketSx,
  secondaryButtonSx,
} from '../../common/designTokens';

interface LabExpertCardProps {
  patientId: string;
}

/**
 * Escala tipográfica — los mismos pasos del resumen. El paso 1 (1.75rem) no
 * aparece: esta tarjeta no tiene una cifra excepcional que destacar.
 */
const T_TITLE = '1.125rem'; // paso 2 — título de la tarjeta
const T_BODY = '0.9375rem'; // paso 3 — narrativa, alertas, nombres
const T_META = '0.75rem'; // paso 4 — satélites: códigos, evidencia, contadores

/** Ritmo vertical: dentro de bloque · entre bloques de una capa · entre capas. */
const GAP_IN = 1;
const GAP_BLOCK = 2;
const GAP_LAYER = 4;

/** Separador primario de la tarjeta; el borde glass queda como decoración. */
const hairline = (isDark: boolean) => alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.08 : 0.06);

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const confidenceColor = (c: 'alta' | 'moderada' | 'baja', brand: typeof BRAND) => {
  if (c === 'alta') return brand.danger;
  if (c === 'moderada') return brand.warning;
  return brand.info;
};

const priorityColor = (p: 'alta' | 'media' | 'baja', brand: typeof BRAND) => {
  if (p === 'alta') return brand.danger;
  if (p === 'media') return brand.warning;
  return brand.info;
};

/** Grado: punto de color + la palabra que lo nombra, para que no dependa del color. */
function SeverityTag({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
      <Box
        aria-hidden
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
        }}
      />
      <Typography
        sx={{
          fontSize: T_META,
          fontWeight: 400,
          textTransform: 'capitalize',
          color: 'text.secondary',
          lineHeight: 1.4,
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

export function LabExpertCard({ patientId }: LabExpertCardProps) {
  const { t } = useTranslation('labExpertCard');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { openAnalyteGraph } = useAnalyteGraph();

  const [report, setReport] = React.useState<LabExpertReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [regenerating, setRegenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLabExpertAnalysis(patientId);
      setReport(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [patientId, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRegenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    setError(null);
    try {
      const data = await regenerateLabExpertAnalysis(patientId);
      setReport(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('error.regenerateFailed'));
    } finally {
      setRegenerating(false);
    }
  };

  const cardSurface = {
    ...glassSx(isDark, 'panel', { blur: 18, radius: RADIUS.lg }),
    boxShadow: elevations[1] as string,
  };

  const line = hairline(isDark);

  /** Rótulo de bloque: satélite, no titular. El titular es la cabecera de la tarjeta. */
  const blockLabelSx = {
    fontSize: T_META,
    fontWeight: 400,
    color: 'text.secondary',
  } as const;

  const countSx = {
    fontSize: T_META,
    fontWeight: 400,
    color: 'text.secondary',
    fontVariantNumeric: 'tabular-nums',
  } as const;

  if (loading) {
    return (
      <Box
        component={motion.div}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        sx={{ ...cardSurface, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}
      >
        <CircularProgress size={16} thickness={4} sx={{ color: 'text.secondary' }} />
        <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary' }}>
          {t('loading')}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        component={motion.div}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        sx={{ ...cardSurface, p: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <RedFlagIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary', flex: 1 }}>
            {error}
          </Typography>
          <Button
            size="small"
            onClick={load}
            startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
            sx={{
              ...secondaryButtonSx(isDark),
              ...glassSx(isDark, 'row', { blur: 14, radius: RADIUS.sm }),
              px: 1.25,
              py: 0.4,
              fontSize: T_META,
              fontWeight: 400,
              color: 'text.primary',
            }}
          >
            {t('retry')}
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!report || !report.narrative) {
    return (
      <Box
        component={motion.div}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        sx={{ ...cardSurface, p: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <ScienceIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary', flex: 1 }}>
            {t('empty')}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      component={motion.div}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      sx={{ ...cardSurface, p: 0, overflow: 'hidden' }}
    >
      {/* Cabecera — sin degradado ni tinte: sólo el hairline la separa del cuerpo */}
      <Box
        sx={{
          px: 2,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: `1px solid ${line}`,
        }}
      >
        {/* El iconBucket se conserva: es la marca de la tarjeta, no decoración de dato. */}
        <Box sx={{ ...iconBucketSx(isDark, BRAND.primary), width: 30, height: 30 }}>
          <ScienceIcon sx={{ fontSize: 15 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: T_TITLE,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              lineHeight: 1.3,
            }}
          >
            {t('header.title')}
          </Typography>
          <Typography
            sx={{
              fontSize: T_META,
              fontWeight: 400,
              color: 'text.secondary',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t('header.stats', {
              analytes: report.analytesConsidered,
              measurements: report.measurementsConsidered,
            })}
            {report.cached ? t('header.cachedSuffix') : ''}
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={handleRegenerate}
          disabled={regenerating}
          startIcon={
            regenerating ? (
              <CircularProgress size={11} thickness={5} sx={{ color: 'text.secondary' }} />
            ) : (
              <RefreshIcon sx={{ fontSize: 13 }} />
            )
          }
          sx={{
            ...secondaryButtonSx(isDark),
            px: 1.15,
            py: 0.35,
            fontSize: T_META,
            fontWeight: 400,
            color: 'text.secondary',
            background: 'transparent',
            '&:hover': {
              background: alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.05 : 0.04),
            },
          }}
        >
          {regenerating ? t('regenerating') : t('regenerate')}
        </Button>
      </Box>

      <Box
        sx={{
          p: 2,
          '& > .lab-block': { mt: GAP_BLOCK, pt: GAP_BLOCK, borderTop: `1px solid ${line}` },
          // La narrativa y las listas accionables son dos capas distintas.
          '& > .lab-block:first-of-type': { mt: GAP_LAYER },
        }}
      >
        {/* Narrativa */}
        <Typography
          sx={{
            fontSize: T_BODY,
            fontWeight: 400,
            lineHeight: 1.6,
            color: 'text.primary',
            whiteSpace: 'pre-wrap',
            maxWidth: '68ch',
          }}
        >
          {report.narrative}
        </Typography>

        {/* Alertas críticas */}
        {report.redFlags.length > 0 && (
          <Box className="lab-block">
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: GAP_IN }}>
              <Typography sx={blockLabelSx}>{t('redFlags.title')}</Typography>
              <Typography sx={{ ...countSx, color: BRAND.danger }}>
                {report.redFlags.length}
              </Typography>
            </Stack>
            <Stack spacing={GAP_IN}>
              {report.redFlags.map((flag, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <Box
                    aria-hidden
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: BRAND.danger,
                      mt: '9px',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary', lineHeight: 1.5 }}
                  >
                    {flag}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {/* Diagnósticos probables */}
        {report.probableDiagnoses.length > 0 && (
          <Box className="lab-block">
            {/* Sin este margen el rótulo y el descargo, ambos al paso 4, se leían corridos. */}
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
              <Typography sx={blockLabelSx}>{t('diagnoses.title')}</Typography>
              <Typography sx={countSx}>{report.probableDiagnoses.length}</Typography>
            </Stack>
            <Typography
              sx={{
                fontSize: T_META,
                fontWeight: 400,
                lineHeight: 1.5,
                color: 'text.secondary',
                mb: GAP_IN,
                maxWidth: '68ch',
              }}
            >
              {t('diagnoses.disclaimer')}
            </Typography>
            <Stack spacing={GAP_IN} divider={<Divider sx={{ borderColor: line }} flexItem />}>
              {report.probableDiagnoses.map((dx, i) => {
                const color = confidenceColor(dx.confidence, BRAND);
                return (
                  <Tooltip
                    key={i}
                    placement="top-start"
                    arrow
                    title={
                      dx.evidence.length > 0 ? (
                        <Box sx={{ p: 0.25 }}>
                          <Typography sx={{ fontSize: T_META, fontWeight: 600, mb: 0.4 }}>
                            {t('diagnoses.fullEvidence')}
                          </Typography>
                          <Box component="ul" sx={{ pl: 1.5, m: 0 }}>
                            {dx.evidence.map((ev, j) => (
                              <Box
                                component="li"
                                key={j}
                                sx={{ fontSize: T_META, fontWeight: 400, lineHeight: 1.5, mb: 0.2 }}
                              >
                                {ev}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ) : (
                        ''
                      )
                    }
                  >
                    <Box>
                      <Stack
                        direction="row"
                        alignItems="baseline"
                        justifyContent="space-between"
                        spacing={1.25}
                      >
                        <Typography
                          sx={{
                            fontSize: T_BODY,
                            fontWeight: 400,
                            color: 'text.primary',
                            lineHeight: 1.4,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {dx.name}
                          {dx.icd10 && (
                            // Entre paréntesis: sin caja que lo delimite, el código se leía pegado al nombre.
                            <Box
                              component="span"
                              sx={{
                                fontSize: T_META,
                                fontWeight: 400,
                                color: 'text.secondary',
                                ml: 0.75,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              ({dx.icd10})
                            </Box>
                          )}
                        </Typography>
                        <SeverityTag color={color} label={dx.confidence} />
                      </Stack>
                      {dx.evidence.length > 0 && (
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            columnGap: 1.5,
                            rowGap: 0.5,
                            mt: 0.5,
                          }}
                        >
                          {dx.evidence.slice(0, 4).map((ev, j) => {
                            const beforeValue = ev.split(/\s+[\d.,]+/)[0]?.trim() || ev;
                            const analyteCandidate = beforeValue.split(/[:,(]/)[0]?.trim() || '';
                            const clickable = analyteCandidate.length > 1;
                            return (
                              <Box
                                key={j}
                                role={clickable ? 'button' : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                onClick={
                                  clickable
                                    ? (e) => {
                                        e.stopPropagation();
                                        openAnalyteGraph(analyteCandidate, analyteCandidate);
                                      }
                                    : undefined
                                }
                                onKeyDown={
                                  clickable
                                    ? (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openAnalyteGraph(analyteCandidate, analyteCandidate);
                                        }
                                      }
                                    : undefined
                                }
                                sx={{
                                  fontSize: T_META,
                                  fontWeight: 400,
                                  lineHeight: 1.5,
                                  color: 'text.secondary',
                                  cursor: clickable ? 'pointer' : 'default',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  borderBottom: clickable
                                    ? `1px dotted ${alpha(isDark ? '#ffffff' : '#000000', 0.25)}`
                                    : 'none',
                                  transition: 'color 160ms ease, border-color 160ms ease',
                                  '&:hover': clickable
                                    ? {
                                        color: 'text.primary',
                                        borderBottomColor: alpha(
                                          isDark ? '#ffffff' : '#000000',
                                          0.55,
                                        ),
                                      }
                                    : undefined,
                                }}
                                title={ev}
                              >
                                {ev}
                              </Box>
                            );
                          })}
                          {dx.evidence.length > 4 && (
                            <Typography
                              sx={{
                                fontSize: T_META,
                                fontWeight: 400,
                                lineHeight: 1.5,
                                color: 'text.secondary',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {t('evidence.more', { count: dx.evidence.length - 4 })}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Seguimiento sugerido */}
        {report.suggestedFollowUps.length > 0 && (
          <Box className="lab-block">
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: GAP_IN }}>
              <Typography sx={blockLabelSx}>{t('followUps.title')}</Typography>
              <Typography sx={countSx}>{report.suggestedFollowUps.length}</Typography>
            </Stack>
            <Stack spacing={GAP_IN} divider={<Divider sx={{ borderColor: line }} flexItem />}>
              {report.suggestedFollowUps.map((f, i) => {
                const color = priorityColor(f.priority, BRAND);
                return (
                  <Box key={i}>
                    <Stack
                      direction="row"
                      alignItems="baseline"
                      justifyContent="space-between"
                      spacing={1.25}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        <FollowUpIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                        <Typography
                          sx={{
                            fontSize: T_BODY,
                            fontWeight: 400,
                            color: 'text.primary',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.test}
                        </Typography>
                      </Stack>
                      <SeverityTag color={color} label={f.priority} />
                    </Stack>
                    {f.rationale && (
                      <Typography
                        sx={{
                          fontSize: T_META,
                          fontWeight: 400,
                          color: 'text.secondary',
                          mt: 0.4,
                          ml: 2.75,
                          lineHeight: 1.5,
                          maxWidth: '68ch',
                        }}
                      >
                        {f.rationale}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}
