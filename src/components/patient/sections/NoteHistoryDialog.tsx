/**
 * NoteHistoryDialog — quién cambió qué en una nota de evolución, y qué decía antes.
 *
 * Mismo sistema que NotesSection y PatientAuditLogDialog: cuatro pasos de
 * tipografía, dos pesos, el color sólo en el texto (nunca una píldora teñida) y
 * hairline como único separador. La sombra del Dialog se conserva: en un modal
 * porta la modalidad.
 */

import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { BRAND, RADIUS, elevations, glassSx, secondaryButtonSx } from '../../common/designTokens';
import { getNoteHistory } from '../../../services/ehrService';

const T_TITLE = '1.125rem';
const T_BODY = '0.9375rem';
const T_META = '0.75rem';

const GAP_IN = 1;

const hairline = (isDark: boolean) => alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.08 : 0.06);

const itemFade = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as any } },
} as const;

/** Un párrafo entero tachado es ilegible: se recorta y el doctor lo despliega si lo necesita. */
const CLAMP_CHARS = 180;

interface NoteHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  noteId: string | null;
}

export default function NoteHistoryDialog({ open, onClose, noteId }: NoteHistoryDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const { t } = useTranslation('notesSection');
  const line = hairline(isDark);

  // noteId se anula al cerrar, pero el diálogo sigue montado durante el fade:
  // consultar por el último id conocido evita que el contenido parpadee a vacío.
  const [lastId, setLastId] = React.useState<string | null>(noteId);
  React.useEffect(() => {
    if (noteId) setLastId(noteId);
  }, [noteId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['noteHistory', lastId],
    queryFn: () => getNoteHistory(lastId as string),
    enabled: open && !!lastId,
  });

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    if (!open) setExpanded({});
  }, [open]);

  const dialogPaperSx = {
    ...glassSx(isDark, 'floating', { blur: 28, radius: isMobile ? 0 : RADIUS.xl }),
    boxShadow: elevations[4] as string,
    overflow: 'hidden',
    border: `1px solid ${line}`,
  } as const;

  /** Listas y textos vienen del mismo snapshot: se imprimen igual. */
  const asText = (value: any): string => {
    if (value === null || value === undefined || value === '') return t('history.emptyValue');
    if (Array.isArray(value)) return value.length ? value.join(' · ') : t('history.emptyValue');
    return String(value);
  };

  const clamp = (key: string, value: any) => {
    const text = asText(value);
    if (text.length <= CLAMP_CHARS || expanded[key]) return text;
    return `${text.slice(0, CLAMP_CHARS)}…`;
  };

  const isLong = (from: any, to: any) =>
    asText(from).length > CLAMP_CHARS || asText(to).length > CLAMP_CHARS;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { ...dialogPaperSx, height: isMobile ? undefined : '80vh' } }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              component="h2"
              sx={{
                fontSize: T_TITLE,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
                color: 'text.primary',
                m: 0,
              }}
            >
              {t('history.title')}
            </Typography>
            <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
              {t('history.subtitle')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label={t('aria.closeHistory')}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ px: 3, py: 0, overflowY: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={26} />
          </Box>
        ) : isError ? (
          <Typography sx={{ fontSize: T_BODY, color: 'text.primary', py: 3 }}>
            {t('history.loadFailed')}
          </Typography>
        ) : (
          <Stack divider={<Divider sx={{ borderColor: line }} flexItem />}>
            {(data?.entries ?? []).map((entry) => (
              <Box
                component={motion.div as any}
                variants={itemFade}
                initial="hidden"
                animate="visible"
                key={entry.revision}
                sx={{ py: 1.75 }}
              >
                <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: T_BODY, fontWeight: 600, color: 'text.primary' }}>
                    {entry.changedBy
                      ? t('history.changedBy', {
                          first: entry.changedBy.firstName,
                          last: entry.changedBy.lastName,
                        })
                      : t('history.revision', { n: entry.revision })}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography
                    sx={{
                      fontSize: T_META,
                      color: 'text.secondary',
                      flexShrink: 0,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {dayjs(entry.changedAt).format('DD MMM YYYY, HH:mm')}
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    fontSize: T_META,
                    color: 'text.secondary',
                    fontStyle: entry.reason ? 'italic' : 'normal',
                    mt: 0.25,
                  }}
                >
                  {entry.reason || t('history.noReason')}
                </Typography>

                <Stack spacing={0.75} sx={{ mt: GAP_IN }}>
                  {Object.entries(entry.changes).map(([field, change]) => {
                    const key = `${entry.revision}:${field}`;
                    return (
                      <Box key={field}>
                        <Typography
                          sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.secondary', lineHeight: 1.5 }}
                        >
                          <Box component="span" sx={{ color: 'text.secondary' }}>
                            {t(`history.fields.${field}`, { defaultValue: field })}:
                          </Box>{' '}
                          <Box component="span" sx={{ textDecoration: 'line-through', color: BRAND.danger }}>
                            {clamp(key, change.from)}
                          </Box>{' '}
                          <Box component="span" sx={{ color: 'text.secondary' }}>
                            →
                          </Box>{' '}
                          {/* El 600 se queda: BRAND.success roza el contraste mínimo a este tamaño. */}
                          <Box component="span" sx={{ color: BRAND.success, fontWeight: 600 }}>
                            {clamp(key, change.to)}
                          </Box>
                        </Typography>
                        {isLong(change.from, change.to) && (
                          <Button
                            size="small"
                            onClick={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))}
                            sx={{
                              p: 0,
                              minWidth: 0,
                              fontSize: T_META,
                              fontWeight: 400,
                              textTransform: 'none',
                              color: BRAND.primary,
                            }}
                          >
                            {expanded[key] ? t('history.showLess') : t('history.showMore')}
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}

            {/* Cierre de la pila: de dónde partió todo. */}
            <Box sx={{ py: 1.75 }}>
              <Stack direction="row" alignItems="baseline" spacing={1.5}>
                <Typography sx={{ fontSize: T_BODY, fontWeight: 600, color: 'text.primary' }}>
                  {t('history.original')}
                </Typography>
                <Box sx={{ flex: 1 }} />
                {data?.createdAt && (
                  <Typography
                    sx={{
                      fontSize: T_META,
                      color: 'text.secondary',
                      flexShrink: 0,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {dayjs(data.signedAt || data.createdAt).format('DD MMM YYYY, HH:mm')}
                  </Typography>
                )}
              </Stack>
              <Typography sx={{ fontSize: T_META, color: 'text.secondary', mt: 0.25 }}>
                {data?.author
                  ? t('history.originalBy', {
                      first: data.author.firstName,
                      last: data.author.lastName,
                    })
                  : t('history.empty')}
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${line}` }}>
        <Button onClick={onClose} sx={secondaryButtonSx(isDark)}>
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
