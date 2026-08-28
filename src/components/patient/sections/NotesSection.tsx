/**
 * NotesSection — listado de notas de evolución SOAP.
 *
 * Comparte expediente con HealthSummarySection y VitalSignsSection, así que
 * comparte su sistema: cuatro pasos de tipografía, dos pesos, el color sólo en
 * el texto (nunca en una píldora teñida ni en una barra al margen) y hairline
 * como único separador. Los diálogos conservan su sombra: en un modal la
 * sombra porta la modalidad.
 */

import { dateLocale } from '../../../utils/dateLocale';
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
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import VerifiedIcon from '@mui/icons-material/Verified';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BRAND,
  RADIUS,
  elevations,
  glassSx,
  primaryButtonSx,
  secondaryButtonSx,
} from '../../common/designTokens';
import { PdfViewer } from '../../common/PdfViewer';
import {
  deleteEvolutionNote,
  fetchEvolutionPdfObjectUrl,
  getEvolutionNote,
  listEvolutionNotes,
  openEvolutionPdf,
  signDraftNote,
  signEvolutionNote,
  updateEvolutionNote,
} from '../../../services/ehrService';
import { useNotify } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import NoteHistoryDialog from './NoteHistoryDialog';

interface NotesSectionProps {
  patientId: string;
}

/**
 * Escala tipográfica — los mismos cuatro pasos que HealthSummarySection. Aquí
 * no hay ningún valor fuera de rango, así que el paso 1 (T_VALUE) no se usa.
 */
const T_TITLE = '1.125rem'; // paso 2 — títulos de sección y de diálogo
const T_BODY = '0.9375rem'; // paso 3 — cuerpo
const T_META = '0.75rem'; // paso 4 — satélites

/** Ritmo vertical: dentro de bloque · entre bloques. La sección tiene una sola capa. */
const GAP_IN = 1;
const GAP_BLOCK = 2;

/** Separador primario de la sección; el borde glass queda como decoración. */
const hairline = (isDark: boolean) => alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.08 : 0.06);

const listStagger = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { when: 'beforeChildren', staggerChildren: 0.04 },
  },
} as const;

const itemFade = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as any },
  },
} as const;

/** Corregir un dedazo recién firmado no pide motivo; el backend usa la misma ventana. */
const GRACE_WINDOW_MS = 10 * 60 * 1000;

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

export default function NotesSection({ patientId }: NotesSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();
  const { user } = useAuth();
  const { t } = useTranslation('notesSection');
  const queryClient = useQueryClient();

  const { data: notes, isLoading, refetch } = useQuery({
    queryKey: ['evolutionNotes', patientId],
    queryFn: () => listEvolutionNotes(patientId),
    enabled: !!patientId,
  });

  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteSaving, setNoteSaving] = React.useState(false);
  const [noteTitle, setNoteTitle] = React.useState('');
  const [noteSubj, setNoteSubj] = React.useState('');
  const [noteObj, setNoteObj] = React.useState('');
  const [noteAss, setNoteAss] = React.useState('');
  const [notePlan, setNotePlan] = React.useState('');
  const [noteDiag, setNoteDiag] = React.useState('');
  const [noteMed, setNoteMed] = React.useState('');
  const [noteProc, setNoteProc] = React.useState('');
  const [noteInd, setNoteInd] = React.useState('');

  // El mismo diálogo sirve para crear y para editar; editingNoteId decide cuál.
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editRevision, setEditRevision] = React.useState(1);
  const [editStatus, setEditStatus] = React.useState<string | null>(null);
  const [editSignedAt, setEditSignedAt] = React.useState<string | null>(null);
  const [editReason, setEditReason] = React.useState('');
  // Alguien más movió la nota mientras se editaba: guardar encima sería pisarlo.
  const [staleConflict, setStaleConflict] = React.useState(false);
  const [noteLoading, setNoteLoading] = React.useState(false);
  const [historyNoteId, setHistoryNoteId] = React.useState<string | null>(null);

  // La ventana de gracia caduca con el diálogo abierto: sin este latido, la
  // etiqueta seguiría diciendo "opcional" mientras el backend ya exige motivo.
  const [graceTick, setGraceTick] = React.useState(0);
  React.useEffect(() => {
    if (!noteOpen || !editingNoteId || !editSignedAt) return;
    const id = setInterval(() => setGraceTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, [noteOpen, editingNoteId, editSignedAt]);

  const editInGrace = React.useMemo(
    () => !!editSignedAt && Date.now() - new Date(editSignedAt).getTime() < GRACE_WINDOW_MS,
    [editSignedAt, graceTick],
  );

  /** Fuera de la ventana de gracia, una nota firmada no se corrige sin decir por qué. */
  const needsReason = !!editingNoteId && editStatus !== 'DRAFT' && !editInGrace;

  const [pdfViewerOpen, setPdfViewerOpen] = React.useState(false);
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = React.useState<string | null>(null);
  const [pdfZoom, setPdfZoom] = React.useState(1);
  const [pdfRotate, setPdfRotate] = React.useState(0);

  // Fetch the PDF through axios (auth-aware) and feed the viewer a blob: URL —
  // pdf.js can't load the raw API URL directly (401, esp. in dev).
  React.useEffect(() => {
    if (!pdfViewerOpen || !selectedNoteId) return;
    let liveUrl: string | null = null;
    let cancelled = false;
    setPdfBlobUrl(null);
    fetchEvolutionPdfObjectUrl(selectedNoteId)
      .then((url) => {
        if (cancelled) { URL.revokeObjectURL(url); return; }
        liveUrl = url;
        setPdfBlobUrl(url);
      })
      .catch((e: any) => {
        if (cancelled) return;
        const msg = e?.response?.data?.message || t('toast.pdfLoadFailed');
        notify({ message: String(msg), severity: 'error' });
        setPdfViewerOpen(false);
      });
    return () => {
      cancelled = true;
      if (liveUrl) { try { URL.revokeObjectURL(liveUrl); } catch { /* noop */ } }
      setPdfBlobUrl(null); // avoid rendering a revoked blob URL on reopen
    };
  }, [pdfViewerOpen, selectedNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const handleViewPdf = (noteId: string) => {
    setSelectedNoteId(noteId);
    setPdfViewerOpen(true);
    setPdfZoom(1);
    setPdfRotate(0);
  };


  const splitLines = React.useCallback(
    (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean),
    []
  );

  const requestDelete = (noteId: string) => {
    setPendingDeleteId(noteId);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteEvolutionNote(pendingDeleteId);
      notify({ message: t('toast.noteDeleted'), severity: 'success' });
      setDeleteOpen(false);
      setPendingDeleteId(null);
      refetch();
    } catch (error: any) {
      const msg = error?.response?.data?.message || t('toast.deleteFailed');
      notify({
        message: Array.isArray(msg) ? msg.join('\n') : String(msg),
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const resetNoteForm = () => {
    setNoteTitle(''); setNoteSubj(''); setNoteObj(''); setNoteAss(''); setNotePlan('');
    setNoteDiag(''); setNoteMed(''); setNoteProc(''); setNoteInd('');
    setEditingNoteId(null); setEditReason(''); setEditRevision(1);
    setEditStatus(null); setEditSignedAt(null); setStaleConflict(false);
  };

  const handleOpenNew = () => {
    // Sin esto, cancelar una edición y pulsar "Nueva nota" arrancaría con el
    // texto de la nota ajena; el borrador de una creación previa sí se respeta.
    if (editingNoteId) resetNoteForm();
    setNoteOpen(true);
  };

  /** El diálogo sigue montado durante el fade: limpiarlo aquí se vería. */
  const closeNoteDialog = () => setNoteOpen(false);

  const handleNoteDialogExited = () => {
    if (editingNoteId) resetNoteForm();
  };

  const handleOpenEdit = async (noteId: string) => {
    setNoteLoading(true);
    try {
      // Se lee fresca, no de la caché de la lista: así la revisión que se manda
      // en el PATCH es la vigente y no provoca un 409 evitable.
      const n = await getEvolutionNote(noteId);
      setNoteTitle(n.title || '');
      setNoteSubj(n.subjective || '');
      setNoteObj(n.objective || '');
      setNoteAss(n.assessment || '');
      setNotePlan(n.plan || '');
      setNoteDiag((n.diagnoses || []).join('\n'));
      setNoteMed((n.medications?.items || []).join('\n'));
      setNoteProc(n.procedures || '');
      setNoteInd(n.indications || '');
      setEditRevision(n.revision ?? 1);
      setEditStatus(n.status);
      setEditSignedAt(n.signedAt ?? null);
      setEditReason('');
      setStaleConflict(false);
      setEditingNoteId(noteId);
      setNoteOpen(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || t('toast.loadFailed');
      notify({ message: Array.isArray(msg) ? msg.join('\n') : String(msg), severity: 'error' });
    } finally {
      setNoteLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId) return;
    setNoteSaving(true);
    try {
      const updated = await updateEvolutionNote(editingNoteId, {
        title: noteTitle.trim() || undefined,
        subjective: noteSubj,
        objective: noteObj,
        assessment: noteAss,
        plan: notePlan,
        diagnoses: splitLines(noteDiag),
        medications: splitLines(noteMed),
        procedures: noteProc,
        indications: noteInd,
        amendmentReason: editReason.trim() || undefined,
        expectedRevision: editRevision,
      });
      setNoteOpen(false);
      resetNoteForm();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['noteHistory', updated.id] });
      notify({ message: t('toast.noteUpdated'), severity: 'success' });
    } catch (e: any) {
      if (e?.response?.status === 409) {
        // Ni se pisa lo ajeno ni se tira lo escrito: se bloquea el guardado y
        // el doctor decide si recarga. Subir editRevision aquí convertiría el
        // segundo clic en el "lost update" que el candado existe para evitar.
        setStaleConflict(true);
        notify({ message: t('toast.staleNote'), severity: 'warning' });
        refetch();
        return;
      }
      const msg = e?.response?.data?.message || t('toast.updateFailed');
      notify({ message: Array.isArray(msg) ? msg.join('\n') : String(msg), severity: 'error' });
    } finally {
      setNoteSaving(false);
    }
  };

  const handleSignAndGenerate = async () => {
    setNoteSaving(true);
    try {
      const input = {
        title: noteTitle.trim() || undefined,
        subjective: noteSubj,
        objective: noteObj,
        assessment: noteAss,
        plan: notePlan,
        diagnoses: splitLines(noteDiag),
        medications: splitLines(noteMed),
        procedures: noteProc || undefined,
        indications: noteInd || undefined,
      };

      let note;
      try {
        note = await signEvolutionNote(patientId, input);
      } catch (e: any) {
        const msg = e?.response?.data?.message || t('toast.saveFailed');
        notify({
          message: Array.isArray(msg) ? msg.join('\n') : String(msg),
          severity: 'error',
        });
        setNoteSaving(false);
        return;
      }

      setNoteOpen(false);
      openEvolutionPdf(note.id);
      resetNoteForm();
      refetch();
      notify({ message: t('toast.noteSaved'), severity: 'success' });
    } finally {
      setNoteSaving(false);
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

  const dialogPaperSx = {
    ...glassSx(isDark, 'floating', { blur: 28, radius: isMobile ? 0 : RADIUS.xl }),
    // La sombra se queda: en un modal porta la modalidad, no adorna.
    boxShadow: elevations[4] as string,
    overflow: 'hidden',
    border: `1px solid ${line}`,
  } as const;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      ...glassSx(isDark, 'row', { blur: 14, radius: RADIUS.sm }),
      border: `1px solid ${line}`,
      fontSize: T_BODY,
      transition: 'border-color 160ms ease',
      '& fieldset': { border: 'none' },
      '&:hover': { border: `1px solid ${alpha(BRAND.primary, isDark ? 0.28 : 0.2)}` },
      '&.Mui-focused': { border: `1px solid ${BRAND.primary}` },
    },
    '& .MuiInputLabel-root': { fontSize: T_BODY },
  } as const;

  /** Etiqueta de campo y de columna dentro de los diálogos. */
  const fieldLabelSx = {
    fontSize: T_BODY,
    fontWeight: 400,
    color: 'text.primary',
    mb: 0.75,
  } as const;

  const columnLabelSx = {
    fontSize: T_META,
    fontWeight: 400,
    color: 'text.secondary',
    mb: GAP_IN,
  } as const;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* 1 · Línea de encabezado — sin panel, sin bucket de icono */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: GAP_BLOCK }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            // SectionHeader emitía un <h6> real; al sustituirlo por Typography
            // suelta se perdió el encabezado del árbol de accesibilidad.
            component="h2"
            sx={{ fontSize: T_TITLE, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em', m: 0 }}
          >
            {t('title')}
          </Typography>
          <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
            {t('subtitle')}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={handleOpenNew}
          aria-label={t('newNote')}
          sx={{ ...primaryButtonSx(isDark), minWidth: 0 }}
        >
          {!isMobile && t('newNote')}
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ ...panel, overflow: 'hidden' }}>
          <Stack divider={<Divider sx={{ borderColor: line }} flexItem />}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ px: 2, py: 1.25 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Skeleton variant="circular" width={18} height={18} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="55%" height={18} />
                    <Skeleton variant="text" width="35%" height={14} />
                  </Box>
                  <Skeleton variant="circular" width={24} height={24} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : notes && notes.length > 0 ? (
        <Box
          component={motion.div as any}
          variants={listStagger}
          initial="hidden"
          animate="visible"
          sx={{ ...panel, overflow: 'hidden' }}
        >
          <Stack divider={<Divider sx={{ borderColor: line }} flexItem />}>
            {notes.map((note) => {
              const date = new Date(note.createdAt);
              const isAmended = note.status === 'AMENDED';
              const isSigned = note.status === 'SIGNED' || isAmended;
              const isAuthor = !!user?.id && note.author?.id === user.id;
              const statusColor = isSigned ? BRAND.success : BRAND.warning;
              const statusLabel = isAmended
                ? t('status.amended')
                : isSigned ? t('status.signed') : t('status.draft');
              const StatusIcon = isSigned ? VerifiedIcon : EditNoteIcon;
              const day = date.getDate();
              const month = t(`months.${MONTH_KEYS[date.getMonth()]}`);
              const time = date.toLocaleTimeString(dateLocale(), {
                hour: '2-digit',
                minute: '2-digit',
              });
              // Sin la píldora de fecha, los satélites se leerían corridos: van
              // unidos por punto separador.
              const editedOn = note.amendedAt ? new Date(note.amendedAt) : null;
              const meta = [
                `${day} ${month}`,
                time,
                note.author
                  ? t('doctorName', { first: note.author.firstName, last: note.author.lastName })
                  : null,
                isAmended && editedOn
                  ? t('meta.editedBy', {
                      date: `${editedOn.getDate()} ${t(`months.${MONTH_KEYS[editedOn.getMonth()]}`)}`,
                      name: note.updatedBy
                        ? `${note.updatedBy.firstName} ${note.updatedBy.lastName}`
                        : (note.author ? `${note.author.firstName} ${note.author.lastName}` : ''),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <Box
                  component={motion.div as any}
                  variants={itemFade}
                  key={note.id}
                  sx={{
                    px: 2,
                    py: 1.25,
                    transition: 'background-color 160ms cubic-bezier(0.4,0,0.2,1)',
                    '&:hover': {
                      background: alpha(isDark ? '#ffffff' : '#000000', isDark ? 0.04 : 0.03),
                    },
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ minWidth: 0 }}>
                    {/* Icono suelto y teñido: codificación redundante de firmada
                        vs borrador, sin bucket ni fondo. */}
                    <StatusIcon
                      sx={{ fontSize: 18, color: statusColor, flexShrink: 0, mt: 0.25 }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        noWrap
                        title={note.title?.trim() || t('noteTitle')}
                        sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary', lineHeight: 1.4 }}
                      >
                        {/* El título real distingue una nota de otra; sin él,
                            cinco consultas se veían como cinco filas iguales */}
                        {note.title?.trim() || t('noteTitle')}
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                        sx={{ mt: 0.25, flexWrap: 'wrap', rowGap: 0.5, minWidth: 0 }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.4}>
                          <Box
                            aria-hidden
                            sx={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }}
                          />
                          {/* Única excepción del paso 3 a peso 600: la palabra de estado. */}
                          <Typography sx={{ fontSize: T_BODY, fontWeight: 600, color: statusColor }}>
                            {statusLabel}
                          </Typography>
                        </Stack>
                        {/* Aquí va quién firmó la nota: ni se recorta (noWrap la
                            borraba en móvil) ni baja a text.disabled (2.8:1). */}
                        <Typography
                          title={meta}
                          sx={{
                            fontSize: T_META,
                            fontWeight: 400,
                            color: 'text.secondary',
                            fontVariantNumeric: 'tabular-nums',
                            minWidth: 0,
                          }}
                        >
                          {meta}
                        </Typography>
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }} alignItems="center">
                      {!isSigned && (
                        <Tooltip title={t('tooltip.signDraft')}>
                          <Button
                            size="small"
                            startIcon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await signDraftNote(note.id);
                                notify({ message: t('toast.draftSigned'), severity: 'success' });
                                queryClient.invalidateQueries({ queryKey: ['evolutionNotes', patientId] });
                                window.dispatchEvent(new CustomEvent('hr-demo:draft-signed'));
                              } catch {
                                notify({ message: t('toast.signError'), severity: 'error' });
                              }
                            }}
                            sx={{
                              px: 1.1,
                              py: 0.2,
                              minWidth: 0,
                              mr: 0.5,
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textTransform: 'none',
                              color: '#fff',
                              bgcolor: BRAND.success,
                              borderRadius: '8px',
                              boxShadow: 'none',
                              '&:hover': { bgcolor: '#15803D', boxShadow: 'none' },
                            }}
                          >
                            {t('action.signDraft')}
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip title={isAuthor ? t('tooltip.edit') : t('tooltip.notAuthor')}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!isAuthor || noteLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(note.id);
                            }}
                            aria-label={t('aria.editNote')}
                            sx={{ color: 'text.secondary', width: 30, height: 30 }}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {(note.revision ?? 1) > 1 && (
                        <Tooltip title={t('tooltip.history')}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistoryNoteId(note.id);
                            }}
                            aria-label={t('aria.openHistory')}
                            sx={{ color: 'text.secondary', width: 30, height: 30 }}
                          >
                            <HistoryIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t('tooltip.viewPdf')}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPdf(note.id);
                          }}
                          aria-label={t('aria.viewPdf')}
                          sx={{ color: 'text.secondary', width: 30, height: 30 }}
                        >
                          <VisibilityIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('tooltip.openTab')}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEvolutionPdf(note.id);
                          }}
                          aria-label={t('aria.openTab')}
                          sx={{ color: 'text.secondary', width: 30, height: 30 }}
                        >
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          isSigned
                            ? t('tooltip.signedCannotDelete')
                            : t('tooltip.delete')
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={isSigned}
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete(note.id);
                            }}
                            aria-label={t('aria.deleteNote')}
                            sx={{
                              color: 'text.secondary',
                              width: 30,
                              height: 30,
                              '&:hover': { color: BRAND.danger },
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ) : (
        // Estado vacío sin superficie propia ni icono gigante: es una ausencia,
        // no una tarjeta.
        <Box sx={{ py: 3 }}>
          <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary' }}>
            {t('empty.title')}
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
            {t('empty.description')}
          </Typography>
          <Button
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={handleOpenNew}
            sx={{ ...primaryButtonSx(isDark), mt: GAP_BLOCK }}
          >
            {t('newNote')}
          </Button>
        </Box>
      )}

      {/* Diálogo de creación — SOAP + tratamiento */}
      <Dialog
        open={noteOpen}
        onClose={() => !noteSaving && closeNoteDialog()}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        TransitionProps={{ onExited: handleNoteDialogExited }}
        PaperProps={{ sx: { ...dialogPaperSx, height: isMobile ? undefined : '90vh' } }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: T_TITLE,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.25,
                  color: 'text.primary',
                }}
              >
                {editingNoteId ? t('dialog.editTitle') : t('dialog.newTitle')}
              </Typography>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
                {editingNoteId ? t('dialog.editSubtitle') : t('dialog.newSubtitle')}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={closeNoteDialog}
              aria-label={t('aria.closeNewDialog')}
              disabled={noteSaving}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent sx={{ px: 0, py: 0, overflow: 'hidden', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          {/* SOAP column */}
          <Box
            sx={{
              flex: { xs: 'unset', md: '0 0 58%' },
              overflowY: 'auto',
              borderRight: { xs: 'none', md: `1px solid ${line}` },
              borderBottom: { xs: `1px solid ${line}`, md: 'none' },
              px: 3,
              py: 2.5,
            }}
          >
            <Typography sx={columnLabelSx}>{t('soap.heading')}</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography sx={fieldLabelSx}>{t('noteTitleLabel')}</Typography>
                <TextField
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={t('noteTitlePlaceholder')}
                  fullWidth
                  size="small"
                  sx={fieldSx}
                />
              </Box>
              {[
                { key: 'S', label: t('soap.subjective.label'), value: noteSubj, setter: setNoteSubj, placeholder: t('soap.subjective.placeholder'), rows: 4 },
                { key: 'O', label: t('soap.objective.label'), value: noteObj, setter: setNoteObj, placeholder: t('soap.objective.placeholder'), rows: 4 },
                { key: 'A', label: t('soap.assessment.label'), value: noteAss, setter: setNoteAss, placeholder: t('soap.assessment.placeholder'), rows: 3 },
                { key: 'P', label: t('soap.plan.label'), value: notePlan, setter: setNotePlan, placeholder: t('soap.plan.placeholder'), rows: 3 },
              ].map(({ key, label, value, setter, placeholder, rows }) => (
                <Box key={key}>
                  <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mb: 0.75 }}>
                    <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary' }}>
                      {label}
                    </Typography>
                    <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                      {t('required')}
                    </Typography>
                  </Stack>
                  <TextField
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    multiline
                    minRows={rows}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                  />
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Treatment column */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
            <Typography sx={columnLabelSx}>{t('treatment.heading')}</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography sx={fieldLabelSx}>{t('treatment.diagnoses.label')}</Typography>
                <TextField
                  placeholder={t('treatment.diagnoses.placeholder')}
                  value={noteDiag}
                  onChange={(e) => setNoteDiag(e.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  helperText={t('treatment.diagnoses.helper')}
                  FormHelperTextProps={{ sx: { fontSize: T_META, mt: 0.5 } }}
                  sx={fieldSx}
                />
              </Box>
              <Box>
                <Typography sx={fieldLabelSx}>{t('treatment.medications.label')}</Typography>
                <TextField
                  placeholder={t('treatment.medications.placeholder')}
                  value={noteMed}
                  onChange={(e) => setNoteMed(e.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  helperText={t('treatment.medications.helper')}
                  FormHelperTextProps={{ sx: { fontSize: T_META, mt: 0.5 } }}
                  sx={fieldSx}
                />
              </Box>
              <Divider sx={{ borderColor: line }} />
              <Box>
                <Typography sx={fieldLabelSx}>{t('treatment.procedures.label')}</Typography>
                <TextField
                  placeholder={t('treatment.procedures.placeholder')}
                  value={noteProc}
                  onChange={(e) => setNoteProc(e.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                  sx={fieldSx}
                />
              </Box>
              <Box>
                <Typography sx={fieldLabelSx}>{t('treatment.indications.label')}</Typography>
                <TextField
                  placeholder={t('treatment.indications.placeholder')}
                  value={noteInd}
                  onChange={(e) => setNoteInd(e.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                  sx={fieldSx}
                />
              </Box>
              {editingNoteId && editStatus !== 'DRAFT' && (
                <>
                  <Divider sx={{ borderColor: line }} />
                  <Box>
                    <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mb: 0.75 }}>
                      <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary' }}>
                        {t('amend.label')}
                      </Typography>
                      {needsReason && (
                        <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary' }}>
                          {t('required')}
                        </Typography>
                      )}
                    </Stack>
                    <TextField
                      placeholder={t('amend.placeholder')}
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      multiline
                      minRows={2}
                      fullWidth
                      size="small"
                      helperText={needsReason ? t('amend.helper') : t('amend.graceHelper')}
                      FormHelperTextProps={{ sx: { fontSize: T_META, mt: 0.5 } }}
                      sx={fieldSx}
                    />
                  </Box>
                </>
              )}
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            gap: 1.5,
            borderTop: `1px solid ${line}`,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}
        >
          <Typography
            sx={{
              flex: 1,
              fontSize: T_META,
              fontWeight: 400,
              color: staleConflict ? BRAND.danger : 'text.secondary',
            }}
          >
            {staleConflict
              ? t('conflict.hint')
              : editingNoteId ? t('editHint') : t('signHint')}
          </Typography>
          {staleConflict && editingNoteId && (
            <Button
              onClick={() => handleOpenEdit(editingNoteId)}
              disabled={noteLoading}
              fullWidth={isMobile}
              sx={secondaryButtonSx(isDark)}
            >
              {t('conflict.reload')}
            </Button>
          )}
          <Stack direction={isMobile ? 'column-reverse' : 'row'} spacing={1} sx={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              onClick={closeNoteDialog}
              disabled={noteSaving}
              fullWidth={isMobile}
              sx={secondaryButtonSx(isDark)}
            >
              {t('cancel')}
            </Button>
            <Button
              disabled={
                noteSaving || staleConflict ||
                // Al crear se exigen los cuatro; al editar basta con que la nota
                // no quede vacía (las del escriba nacen sin algún campo).
                (editingNoteId
                  ? !(noteSubj || noteObj || noteAss || notePlan)
                  : (!noteSubj || !noteObj || !noteAss || !notePlan)) ||
                (needsReason && !editReason.trim())
              }
              onClick={editingNoteId ? handleSaveEdit : handleSignAndGenerate}
              startIcon={
                noteSaving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : editingNoteId ? (
                  <SaveOutlinedIcon sx={{ fontSize: 17 }} />
                ) : (
                  <VerifiedIcon sx={{ fontSize: 17 }} />
                )
              }
              fullWidth={isMobile}
              sx={primaryButtonSx(isDark)}
            >
              {noteSaving
                ? (editingNoteId ? t('saving') : t('signing'))
                : (editingNoteId ? t('saveChanges') : t('signAndSave'))}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* PDF viewer */}
      <Dialog
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { ...dialogPaperSx, height: isMobile ? undefined : '90vh' } }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: T_TITLE,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.25,
                  color: 'text.primary',
                }}
              >
                {t('pdf.title')}
              </Typography>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
                {t('pdf.subtitle')}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setPdfViewerOpen(false)}
              aria-label={t('aria.closeViewer')}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>
        <DialogContent
          sx={{
            p: 0,
            overflow: 'hidden',
            // Fondo del escenario del PDF, no tinte decorativo: separa la hoja
            // blanca del papel del panel.
            bgcolor: alpha(isDark ? '#000' : BRAND.foreground, isDark ? 0.4 : 0.06),
          }}
        >
          {pdfBlobUrl ? (
            <PdfViewer
              file={pdfBlobUrl}
              zoom={pdfZoom}
              rotate={pdfRotate}
              onZoomChange={setPdfZoom}
              onRotateChange={setPdfRotate}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 240 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            gap: 1,
            borderTop: `1px solid ${line}`,
          }}
        >
          <Button onClick={() => setPdfViewerOpen(false)} sx={secondaryButtonSx(isDark)}>
            {t('close')}
          </Button>
          {selectedNoteId && (
            <Button
              startIcon={<OpenInNewIcon sx={{ fontSize: 17 }} />}
              onClick={() => openEvolutionPdf(selectedNoteId)}
              sx={primaryButtonSx(isDark)}
            >
              {t('openTab')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            {/* Icono suelto y en rojo: codificación redundante del peligro para
                daltonismo, sin bucket teñido. */}
            <WarningAmberIcon sx={{ fontSize: 20, color: BRAND.danger, mt: 0.25 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: T_TITLE,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.25,
                  color: BRAND.danger,
                }}
              >
                {t('delete.title')}
              </Typography>
              <Typography sx={{ fontSize: T_META, fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
                {t('delete.subtitle')}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
          <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary', lineHeight: 1.5 }}>
            {t('delete.confirm')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
            sx={secondaryButtonSx(isDark)}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={deleting}
            startIcon={
              deleting ? (
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
            {deleting ? t('delete.deleting') : t('delete.button')}
          </Button>
        </DialogActions>
      </Dialog>

      <NoteHistoryDialog
        open={!!historyNoteId}
        onClose={() => setHistoryNoteId(null)}
        noteId={historyNoteId}
      />
    </Box>
  );
}
