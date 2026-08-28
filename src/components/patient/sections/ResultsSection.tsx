/**
 * ResultsSection — estudios de imagen y documentos del paciente en una lista única.
 *
 * Comparte expediente con HealthSummarySection y VitalSignsSection, así que
 * comparte su sistema: cuatro pasos de tipografía (aquí sólo hacen falta tres:
 * no hay ninguna cifra fuera de rango que justifique el paso 1), dos pesos, el
 * color sólo en el texto —nunca en una píldora teñida ni en un filo al margen—
 * y hairline como separador.
 *
 * El diálogo de borrado conserva su sombra: en un modal la sombra porta la
 * modalidad, no adorna.
 */

import { dateLocale } from '../../../utils/dateLocale';
import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Checkbox,
  Dialog,
  DialogContent,
  DialogActions,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery } from '@tanstack/react-query';
import { useNotify } from '../../../context/NotificationContext';
import { useUploads } from '../../../context/UploadContext';
import {
  listImagingStudiesForPatient,
  listDocumentsForPatientAsDoctor,
  type ImagingStudy,
} from '../../../services/ehrService';
import {
  BRAND,
  RADIUS,
  glassSx,
  elevations,
  primaryButtonSx,
  secondaryButtonSx,
} from '../../common/designTokens';
import { GroupedList, ListRow } from '../../common/ListRow';

interface ResultsSectionProps {
  patientId: string;
  onDataChange?: () => void;
  onDeleteDocument?: (docId: string, docName: string) => void;
}

/**
 * Escala tipográfica — los mismos pasos que HealthSummarySection. Si algo debe
 * destacar se sube de paso; no se pone en negrita.
 */
const T_TITLE = '1.125rem'; // paso 2 — títulos de sección y de diálogo
const T_BODY = '0.9375rem'; // paso 3 — cuerpo: nombres de estudio y documento
const T_META = '0.75rem'; // paso 4 — satélites: fechas, conteos

/** Ritmo vertical: dentro de bloque · entre bloques de una capa · entre capas. */
const GAP_IN = 1;
const GAP_BLOCK = 2;
const GAP_LAYER = 4;

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

export function ResultsSection({
  patientId,
  onDataChange,
  onDeleteDocument,
}: ResultsSectionProps) {
  const { t } = useTranslation('resultsSection');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();
  const { startUpload } = useUploads();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedStudies, setSelectedStudies] = React.useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [studiesToDelete, setStudiesToDelete] = React.useState<
    Array<{ studyId: string; name: string; fileCount: number; fileIds: string[] }>
  >([]);

  const { data: imagingStudies, refetch: refetchStudies } = useQuery({
    queryKey: ['imaging-studies', patientId],
    queryFn: () => listImagingStudiesForPatient(patientId),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: otherDocs, refetch: refetchOtherDocs } = useQuery({
    queryKey: ['other-docs', patientId],
    queryFn: async () => {
      const allDocs = await listDocumentsForPatientAsDoctor(patientId);
      return allDocs.filter((doc) => {
        const name = (doc.originalName || '').toLowerCase();
        const mime = (doc.mimeType || '').toLowerCase();
        const isImaging =
          name.endsWith('.dcm') ||
          name.endsWith('.dicom') ||
          name.endsWith('.nii') ||
          name.endsWith('.nii.gz') ||
          mime.includes('dicom') ||
          mime.includes('nifti');
        return !isImaging;
      });
    },
    enabled: !!patientId,
  });

  const handleFileUpload = (files: FileList) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    startUpload({
      files: Array.from(files),
      patientId,
      onDone: async () => {
        setUploading(false);
        await Promise.all([refetchStudies(), refetchOtherDocs()]);
        onDataChange?.();
        notify({ message: t('uploadSuccess'), severity: 'success' });
      },
      onCancelled: () => setUploading(false),
      onError: () => {
        setUploading(false);
        notify({ message: t('uploadError'), severity: 'error' });
      },
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteStudy = (study: ImagingStudy) => {
    setStudiesToDelete([
      {
        studyId: study.studyUUID,
        name: t('studyName', { id: study.studyUUID.slice(0, 12) }),
        fileCount: study.fileCount,
        fileIds: study.files.map((f) => f.id),
      },
    ]);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDocument = (docId: string, docName: string) => {
    setStudiesToDelete([{ studyId: docId, name: docName, fileCount: 1, fileIds: [docId] }]);
    setDeleteDialogOpen(true);
  };

  const handleToggleSelection = (studyId: string) => {
    setSelectedStudies((prev) => {
      const next = new Set(prev);
      if (next.has(studyId)) next.delete(studyId);
      else next.add(studyId);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set<string>();
    imagingStudies?.forEach((s) => allIds.add(s.studyUUID));
    otherDocs?.forEach((d) => allIds.add(d.id));
    setSelectedStudies(allIds);
  };

  const handleDeselectAll = () => setSelectedStudies(new Set());

  const handleDeleteSelected = () => {
    const toDelete: Array<{
      studyId: string;
      name: string;
      fileCount: number;
      fileIds: string[];
    }> = [];
    imagingStudies?.forEach((study) => {
      if (selectedStudies.has(study.studyUUID)) {
        toDelete.push({
          studyId: study.studyUUID,
          name: t('studyName', { id: study.studyUUID.slice(0, 12) }),
          fileCount: study.fileCount,
          fileIds: study.files.map((f) => f.id),
        });
      }
    });
    otherDocs?.forEach((doc) => {
      if (selectedStudies.has(doc.id)) {
        toDelete.push({
          studyId: doc.id,
          name: doc.originalName || t('documentFallback'),
          fileCount: 1,
          fileIds: [doc.id],
        });
      }
    });
    setStudiesToDelete(toDelete);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    studiesToDelete.forEach((study) => {
      study.fileIds.forEach((fileId) => {
        onDeleteDocument?.(fileId, study.name);
      });
    });
    setDeleteDialogOpen(false);
    setStudiesToDelete([]);
    setSelectedStudies(new Set());
    setSelectionMode(false);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setStudiesToDelete([]);
  };

  const totalItems = (imagingStudies?.length || 0) + (otherDocs?.length || 0);
  const totalFilesToDelete = studiesToDelete.reduce((acc, s) => acc + s.fileCount, 0);

  const line = hairline(isDark);

  /** Rojo plano y sólido, como el CTA de marca: el peligro lo dice el color. */
  const dangerButtonSx = {
    ...primaryButtonSx(isDark),
    background: BRAND.danger,
    '&:hover': { background: '#B91C1C', boxShadow: 'none' },
    '&:active': { background: '#991B1B' },
  } as const;

  const metaSx = {
    fontSize: T_META,
    fontWeight: 400,
    color: 'text.secondary',
    fontVariantNumeric: 'tabular-nums',
  } as const;

  return (
    <Box component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* 1 · Línea de encabezado — sin panel, sin icono, sin subtítulo */}
      {/* useFlexGap: con spacing por márgenes, envolver la fila deja huecos. */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        useFlexGap
        sx={{ mb: GAP_BLOCK, flexWrap: 'wrap', rowGap: GAP_IN }}
      >
        <Typography
          sx={{
            fontSize: T_TITLE,
            fontWeight: 600,
            color: 'text.primary',
            letterSpacing: '-0.01em',
          }}
        >
          {t('title')}
        </Typography>
        {selectionMode && selectedStudies.size > 0 ? (
          <Typography sx={{ ...metaSx, color: 'text.secondary' }}>
            {t('itemsSelected', { count: selectedStudies.size })}
          </Typography>
        ) : (
          totalItems > 0 && <Typography sx={metaSx}>{totalItems}</Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
          {!selectionMode ? (
            <>
              <Button
                startIcon={<UploadFileIcon sx={{ fontSize: 17 }} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                sx={{ ...primaryButtonSx(isDark), minWidth: 0 }}
              >
                {!isMobile && (uploading ? t('uploading') : t('upload'))}
              </Button>
              {totalItems > 0 && (
                <Button
                  startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 17 }} />}
                  onClick={() => setSelectionMode(true)}
                  sx={secondaryButtonSx(isDark)}
                >
                  {!isMobile && t('select')}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={handleSelectAll} sx={secondaryButtonSx(isDark)}>
                {t('selectAll')}
              </Button>
              <Button onClick={handleDeselectAll} sx={secondaryButtonSx(isDark)}>
                {t('deselectAll')}
              </Button>
              <Button
                startIcon={<DeleteOutlineIcon sx={{ fontSize: 17 }} />}
                onClick={handleDeleteSelected}
                disabled={selectedStudies.size === 0}
                sx={dangerButtonSx}
              >
                {t('deleteCount', { count: selectedStudies.size })}
              </Button>
              <Button
                startIcon={<CancelOutlinedIcon sx={{ fontSize: 17 }} />}
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedStudies(new Set());
                }}
                sx={secondaryButtonSx(isDark)}
              >
                {!isMobile && t('cancel')}
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {totalItems === 0 ? (
        // Estado vacío sin superficie propia ni icono gigante: es una ausencia,
        // no una tarjeta; el aire de capa es lo único que la enmarca.
        <Box sx={{ py: GAP_LAYER }}>
          <Typography sx={{ fontSize: T_BODY, fontWeight: 400, color: 'text.primary' }}>
            {t('emptyTitle')}
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
            {t('emptyDescription')}
          </Typography>
          <Button
            startIcon={<UploadFileIcon sx={{ fontSize: 17 }} />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ ...primaryButtonSx(isDark), mt: GAP_BLOCK }}
          >
            {t('uploadFile')}
          </Button>
        </Box>
      ) : (
        <Box
          component={motion.div as any}
          variants={listStagger}
          initial="hidden"
          animate="visible"
        >
          <GroupedList>
            {imagingStudies?.map((study) => {
              const selected = selectedStudies.has(study.studyUUID);
              return (
                <Box component={motion.div as any} variants={itemFade} key={study.studyUUID}>
                  <ListRow
                    onClick={
                      selectionMode ? () => handleToggleSelection(study.studyUUID) : undefined
                    }
                    active={selected}
                    icon={<FolderIcon />}
                    title={
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="baseline"
                        sx={{ minWidth: 0, flexWrap: 'wrap' }}
                      >
                        <Typography
                          sx={{
                            fontSize: T_BODY,
                            fontWeight: 400,
                            color: 'text.primary',
                            lineHeight: 1.4,
                            minWidth: 0,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                          noWrap
                        >
                          {t('studyName', { id: study.studyUUID.slice(0, 12) })}
                        </Typography>
                        {/* Sin la píldora teñida, el paréntesis es lo que separa
                            el nombre del conteo. */}
                        <Typography sx={{ ...metaSx, flexShrink: 0 }}>
                          ({t('fileCount', { count: study.fileCount })})
                        </Typography>
                      </Stack>
                    }
                    subtitle={
                      <Typography sx={{ ...metaSx, mt: 0.25, color: 'text.secondary' }}>
                        {new Date(study.firstUploadDate).toLocaleString(dateLocale(), {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </Typography>
                    }
                    trailing={
                      selectionMode ? (
                        <Checkbox
                          checked={selected}
                          onChange={() => handleToggleSelection(study.studyUUID)}
                          sx={{
                            p: 0.75,
                            color: alpha(BRAND.primary, 0.5),
                            '&.Mui-checked': { color: BRAND.primary },
                          }}
                        />
                      ) : (
                        <Tooltip title={t('deleteStudy')}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudy(study);
                            }}
                            sx={{
                              color: 'text.secondary',
                              width: 30,
                              height: 30,
                              '&:hover': {
                                color: BRAND.danger,
                                bgcolor: alpha(BRAND.danger, isDark ? 0.12 : 0.06),
                              },
                            }}
                            aria-label={t('deleteStudy')}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )
                    }
                  />
                </Box>
              );
            })}

            {otherDocs?.map((d) => {
              const selected = selectedStudies.has(d.id);
              return (
                <Box component={motion.div as any} variants={itemFade} key={d.id}>
                  <ListRow
                    onClick={selectionMode ? () => handleToggleSelection(d.id) : undefined}
                    active={selected}
                    icon={<DescriptionIcon />}
                    title={
                      <Typography
                        sx={{
                          fontSize: T_BODY,
                          fontWeight: 400,
                          color: 'text.primary',
                          lineHeight: 1.4,
                        }}
                        noWrap
                      >
                        {d.originalName}
                      </Typography>
                    }
                    subtitle={
                      <Typography sx={{ ...metaSx, mt: 0.25, color: 'text.secondary' }}>
                        {new Date(d.createdAt).toLocaleString(dateLocale(), {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </Typography>
                    }
                    trailing={
                      selectionMode ? (
                        <Checkbox
                          checked={selected}
                          onChange={() => handleToggleSelection(d.id)}
                          sx={{
                            p: 0.75,
                            color: alpha(BRAND.primary, 0.5),
                            '&.Mui-checked': { color: BRAND.primary },
                          }}
                        />
                      ) : (
                        <Tooltip title={t('deleteDocument')}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(d.id, d.originalName || t('documentFallback'));
                            }}
                            sx={{
                              color: 'text.secondary',
                              width: 30,
                              height: 30,
                              '&:hover': {
                                color: BRAND.danger,
                                bgcolor: alpha(BRAND.danger, isDark ? 0.12 : 0.06),
                              },
                            }}
                            aria-label={t('deleteDocument')}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )
                    }
                  />
                </Box>
              );
            })}
          </GroupedList>
        </Box>
      )}

      {/* Confirmar eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            ...glassSx(isDark, 'floating', { blur: 28, radius: isMobile ? 0 : RADIUS.xl }),
            // La sombra se queda: en un modal porta la modalidad, no adorna.
            boxShadow: elevations[4] as string,
            overflow: 'hidden',
            border: `1px solid ${line}`,
          },
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            {/* El icono va suelto y en rojo: codificación redundante del peligro
                para daltonismo, sin bucket teñido. */}
            <WarningAmberIcon sx={{ fontSize: 20, color: BRAND.danger, mt: 0.25 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: T_TITLE,
                  fontWeight: 600,
                  color: BRAND.danger,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.3,
                }}
              >
                {t('confirmDeleteTitle')}
              </Typography>
              <Typography sx={{ ...metaSx, color: 'text.secondary', mt: 0.25 }}>
                {t('filesWillBeDeleted', { count: totalFilesToDelete })}
              </Typography>
            </Box>
            {isMobile && (
              <IconButton size="small" onClick={cancelDelete} aria-label={t('close')}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>
        </Box>
        <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
          <Typography
            sx={{
              fontSize: T_BODY,
              fontWeight: 400,
              color: 'text.primary',
              lineHeight: 1.5,
              mb: GAP_IN,
            }}
          >
            {studiesToDelete.length > 1 ? t('confirmDeleteMany') : t('confirmDeleteOne')}
          </Typography>
          <GroupedList>
            {studiesToDelete.map((study) => (
              <ListRow
                key={study.studyId}
                dense
                icon={study.fileCount > 1 ? <FolderIcon /> : <DescriptionIcon />}
                title={
                  // 600 a propósito: es el identificador de lo que se va a borrar
                  // sin vuelta atrás, la última defensa contra el archivo equivocado.
                  <Typography
                    sx={{
                      fontSize: T_BODY,
                      fontWeight: 600,
                      color: 'text.primary',
                      lineHeight: 1.4,
                    }}
                    noWrap
                  >
                    {study.name}
                  </Typography>
                }
                subtitle={
                  study.fileCount > 1 ? (
                    <Typography sx={{ ...metaSx, mt: 0.25, color: 'text.secondary' }}>
                      {t('filesIncluded', { count: study.fileCount })}
                    </Typography>
                  ) : undefined
                }
              />
            ))}
          </GroupedList>
          {/* Sube de paso en vez de engordar: el rojo pequeño ya iba justo de
              contraste en modo oscuro. */}
          <Typography
            sx={{
              mt: GAP_IN,
              fontSize: T_BODY,
              fontWeight: 400,
              color: BRAND.danger,
              lineHeight: 1.5,
            }}
          >
            {t('cannotUndo')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
          <Button onClick={cancelDelete} sx={secondaryButtonSx(isDark)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={confirmDelete}
            startIcon={<DeleteOutlineIcon sx={{ fontSize: 17 }} />}
            sx={dangerButtonSx}
          >
            {t('delete')}
            {studiesToDelete.length > 1 ? t('deleteItemsSuffix', { count: studiesToDelete.length }) : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
