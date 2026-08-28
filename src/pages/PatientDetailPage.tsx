/**
 * Patient chart (expediente) — trimmed public-demo cut of the production page.
 *
 * The production chart wires 25+ sections plus voice dictation, radiology,
 * per-clinic modules and a configurable block layout. The demo keeps the
 * five sections the WebMCP scenario exercises — summary, notes, vitals,
 * labs, results — with the original layout, styling and data contracts.
 * Chart-scoped WebMCP tools register while this page is mounted (see
 * src/webmcp/, phase 3) and unregister when it closes.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Avatar,
  Paper,
  ListItemButton,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Skeleton,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import { BRAND, MARKETING, glassSx, secondaryButtonSx } from '../components/common/designTokens';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import dayjs from 'dayjs';
import {
  getPatientOverview,
  type PatientOverview,
  type UserBasic,
  getClinicalHistory,
  type ClinicalHistory,
  deleteDocumentForPatient,
} from '../services/ehrService';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import NotesSection from '../components/patient/sections/NotesSection';
import { VitalSignsSection } from '../components/patient/sections/VitalSignsSection';
import { LaboratorySection } from '../components/patient/sections/LaboratorySection';
import { ResultsSection } from '../components/patient/sections/ResultsSection';
import { HealthSummarySection } from '../components/patient/sections/HealthSummarySection';
import { AnalyteGraphProvider } from '../components/patient/AnalyteGraphProvider';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ChartAgentTools } from '../webmcp/ChartAgentTools';
import { WebMcpStatusChip } from '../webmcp/WebMcpStatusChip';

const KNOWN_SECTIONS = ['summary', 'notes', 'vitals', 'labs', 'results'];

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const location = useLocation();
  const preloadedPatient = (location.state as UserBasic | null) || null;
  const notify = useNotify();
  const { t } = useTranslation('patientDetailPage');

  const [searchParams, setSearchParams] = useSearchParams();
  const urlSection = searchParams.get('section');
  const section: string = urlSection && KNOWN_SECTIONS.includes(urlSection) ? urlSection : 'summary';

  const setSection = React.useCallback(
    (newSection: string) => {
      setSearchParams({ section: newSection }, { replace: true });
    },
    [setSearchParams],
  );

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<PatientOverview>({
    queryKey: ['patientOverview', id],
    queryFn: () => getPatientOverview(id as string, true),
    enabled: !!id,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const regenerateHealthSummary = React.useCallback(async () => {
    if (!id) return;
    try {
      const freshData = await getPatientOverview(id, false);
      queryClient.setQueryData(['patientOverview', id], freshData);
      notify({ message: t('toast.healthSummaryUpdated'), severity: 'success' });
    } catch (e: unknown) {
      notify({ message: t('toast.regenerateSummaryError'), severity: 'error' });
    }
  }, [id, queryClient, notify, t]);

  const { data: ch, isLoading: chLoading, refetch: refetchCh } = useQuery<ClinicalHistory | null>({
    queryKey: ['clinicalHistoryByPatient', id],
    queryFn: () => getClinicalHistory(id as string),
    enabled: !!id,
  });

  const basePatient: UserBasic | null = ch?.patient || preloadedPatient || null;

  // Document deletion state (shared by labs and results sections)
  const [confirmDeleteDocId, setConfirmDeleteDocId] = React.useState<string | null>(null);
  const [confirmDeleteDocName, setConfirmDeleteDocName] = React.useState<string>('');

  type NavItem = { id: string; label: string; icon: React.ReactNode };
  type NavGroup = { label: string | null; items: NavItem[] };

  const navGroups: NavGroup[] = React.useMemo(
    () => [
      {
        label: null,
        items: [{ id: 'summary', label: t('nav.summary'), icon: <AssignmentTurnedInOutlinedIcon fontSize="small" /> }],
      },
      {
        label: t('group.clinical'),
        items: [
          { id: 'notes', label: t('nav.notes'), icon: <DescriptionOutlinedIcon fontSize="small" /> },
          { id: 'vitals', label: t('nav.vitals'), icon: <MonitorHeartOutlinedIcon fontSize="small" /> },
        ],
      },
      {
        label: t('group.studies'),
        items: [
          { id: 'labs', label: t('nav.labs'), icon: <BiotechOutlinedIcon fontSize="small" /> },
          { id: 'results', label: t('nav.results'), icon: <AssignmentTurnedInOutlinedIcon fontSize="small" /> },
        ],
      },
    ],
    [t],
  );

  if (role !== 'doctor') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {t('state.unauthorized')}
        </Typography>
      </Box>
    );
  }

  const isDarkMode = theme.palette.mode === 'dark';
  const panelGlass = glassSx(isDarkMode, 'panel', { blur: 20, radius: 0 });
  const floatingGlass = glassSx(isDarkMode, 'floating', { blur: 24, radius: 14 });
  const glassBorder = isDarkMode ? 'rgba(148,163,184,0.14)' : 'rgba(95,163,204,0.18)';
  const tint = (v: number) => alpha(BRAND.primary, v);

  const sidebarContent = (
    <>
      {/* Patient mini profile */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${glassBorder}` }}>
        <Stack spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              width: 108,
              height: 108,
              background: BRAND.primaryDeep,
              fontSize: '2.3rem',
              fontWeight: 500,
              letterSpacing: 0,
              color: '#FFFFFF',
              boxShadow: 'none',
            }}
          >
            {(basePatient?.firstName?.[0] || '').toUpperCase()}
            {(basePatient?.lastName?.[0] || '').toUpperCase()}
          </Avatar>
          <Box sx={{ textAlign: 'center', width: '100%', minWidth: 0, px: 0.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 500,
                letterSpacing: '-0.012em',
                fontSize: '0.95rem',
                lineHeight: 1.25,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {basePatient ? `${basePatient.firstName} ${basePatient.lastName}` : t('sidebar.patientFallback')}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.74rem', fontVariantNumeric: 'tabular-nums', display: 'block', mt: 0.25 }}
            >
              {basePatient?.dateOfBirth
                ? t('sidebar.ageYears', { count: dayjs().diff(basePatient.dateOfBirth, 'year') })
                : t('sidebar.ageUnknown')}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ p: 1, flex: 1, overflowY: 'auto' }}>
        {navGroups.map((group, groupIdx) => (
          <Box key={`group-${groupIdx}`} sx={{ mb: groupIdx < navGroups.length - 1 ? 1.25 : 0 }}>
            {group.label && (
              <Typography
                sx={{
                  fontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif`,
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  px: 1.5,
                  pt: 1,
                  pb: 0.5,
                }}
              >
                {group.label}
              </Typography>
            )}
            <List sx={{ p: 0 }}>
              {group.items.map((it) => {
                const active = section === it.id;
                return (
                  <ListItem disablePadding key={it.id} sx={{ mb: 0.25 }}>
                    <ListItemButton
                      selected={active}
                      onClick={() => {
                        setSection(it.id);
                        if (isMobile) setDrawerOpen(false);
                      }}
                      sx={{
                        borderRadius: '10px',
                        py: 0.75,
                        px: 1.25,
                        minHeight: 38,
                        transition: 'background-color 160ms ease, color 160ms ease',
                        '&.Mui-selected': {
                          background: alpha(BRAND.primary, isDarkMode ? 0.24 : 0.12),
                          color: BRAND.primary,
                          '& .MuiListItemIcon-root': { color: BRAND.primary },
                        },
                        '&:hover': {
                          bgcolor: isDarkMode ? alpha('#94A3B8', 0.08) : alpha('#0F172A', 0.04),
                        },
                        '&.Mui-selected:hover': {
                          background: alpha(BRAND.primary, isDarkMode ? 0.3 : 0.16),
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: 30, color: 'text.secondary', transition: 'color 160ms ease', '& svg': { fontSize: 18 } }}
                      >
                        {it.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={it.label}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: active ? 600 : 500,
                          fontSize: '0.85rem',
                          letterSpacing: '-0.005em',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </>
  );

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Fixed Header — translucent glass */}
      <Paper
        elevation={0}
        sx={{
          height: 60,
          px: { xs: 1.5, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          ...panelGlass,
          borderRadius: 0,
          border: 'none',
          borderBottom: `1px solid ${glassBorder}`,
          zIndex: 10,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
          {isMobile ? (
            <IconButton
              onClick={() => setDrawerOpen(true)}
              size="small"
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                bgcolor: tint(isDarkMode ? 0.14 : 0.08),
                color: BRAND.primary,
                '&:hover': { bgcolor: tint(isDarkMode ? 0.2 : 0.14) },
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          ) : (
            <IconButton
              onClick={() => navigate('/')}
              size="small"
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                bgcolor: tint(isDarkMode ? 0.14 : 0.08),
                color: BRAND.primary,
                '&:hover': { bgcolor: tint(isDarkMode ? 0.2 : 0.14) },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}

          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto', opacity: 0.4 }} />

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 500, lineHeight: 1.15, fontSize: '0.95rem', letterSpacing: '-0.012em' }}
            >
              {t('header.title')}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{
                maxWidth: { xs: 180, sm: 320, md: 'none' },
                fontSize: '0.78rem',
                letterSpacing: '-0.003em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
                mt: 0.25,
              }}
              title={basePatient ? `${basePatient.firstName} ${basePatient.lastName}` : ''}
            >
              {basePatient ? `${basePatient.firstName} ${basePatient.lastName}` : t('header.loading')}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <WebMcpStatusChip />
            <LanguageToggle />
            {!isMobile && (
              <Button
                size="small"
                onClick={() => navigate('/')}
                sx={{ ...secondaryButtonSx(isDarkMode), py: 0.5, fontSize: '0.82rem' }}
              >
                {t('header.close')}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Main Layout - Split View */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {isMobile ? (
          <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: {
                width: 272,
                display: 'flex',
                flexDirection: 'column',
                ...panelGlass,
                borderRadius: 0,
                border: 'none',
                borderRight: `1px solid ${glassBorder}`,
                '::-webkit-scrollbar': { width: 4 },
                '::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        ) : (
          <Paper
            elevation={0}
            sx={{
              width: 272,
              flexShrink: 0,
              ...panelGlass,
              borderRadius: 0,
              border: 'none',
              borderRight: `1px solid ${glassBorder}`,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              '::-webkit-scrollbar': { width: 4 },
              '::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
            }}
          >
            {sidebarContent}
          </Paper>
        )}

        {/* Content Area - Scrollable */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.25, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Container maxWidth="lg" sx={{ height: '100%', px: { xs: 0, sm: 0.5, md: 1 } }}>
            {isLoading || chLoading ? (
              <Stack spacing={2} sx={{ py: 2 }}>
                <Skeleton variant="text" width="30%" />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Skeleton variant="rectangular" width={80} height={24} />
                  <Skeleton variant="text" width="40%" />
                </Stack>
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '14px' }} />
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: '14px' }} />
              </Stack>
            ) : isError || !data ? (
              <Stack spacing={1.5} alignItems="flex-start" sx={{ py: 2 }}>
                <Typography variant="body2" color="error">
                  {t('state.loadError')}
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    refetch();
                    refetchCh();
                  }}
                  sx={secondaryButtonSx(isDarkMode)}
                >
                  {t('common.retry')}
                </Button>
              </Stack>
            ) : (
              <Box sx={{ pb: 4 }}>
                {/* Section switch */}
                <AnalyteGraphProvider patientId={id as string}>
                  <ChartAgentTools
                    patientId={id as string}
                    patientName={basePatient ? `${basePatient.firstName} ${basePatient.lastName}` : null}
                    onNavigateSection={setSection}
                  />
                  {section === 'summary' && data && (
                    <HealthSummarySection data={data} patientId={id as string} onRegenerate={regenerateHealthSummary} />
                  )}
                  {section === 'notes' && <NotesSection patientId={id as string} />}
                  {section === 'vitals' && <VitalSignsSection patientId={id as string} onDataChange={refetch} />}
                  {section === 'labs' && (
                    <LaboratorySection
                      patientId={id as string}
                      onDataChange={regenerateHealthSummary}
                      onDeleteDocument={(docId, docName) => {
                        setConfirmDeleteDocId(docId);
                        setConfirmDeleteDocName(docName);
                      }}
                    />
                  )}
                  {section === 'results' && (
                    <ResultsSection
                      patientId={id as string}
                      onDataChange={regenerateHealthSummary}
                      onDeleteDocument={(docId, docName) => {
                        setConfirmDeleteDocId(docId);
                        setConfirmDeleteDocName(docName);
                      }}
                    />
                  )}
                </AnalyteGraphProvider>
              </Box>
            )}
          </Container>
        </Box>

        {/* Confirm delete document dialog */}
        <Dialog
          keepMounted
          open={!!confirmDeleteDocId}
          onClose={() => setConfirmDeleteDocId(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              ...floatingGlass,
              boxShadow: 'none',
              overflow: 'hidden',
              border: `1px solid ${alpha(BRAND.danger, isDarkMode ? 0.2 : 0.14)}`,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 500, letterSpacing: '-0.012em', fontSize: '1rem' }}>
            {t('deleteDialog.title')}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: glassBorder }}>
            <Typography variant="body2" sx={{ fontSize: '0.88rem', lineHeight: 1.5, color: 'text.secondary' }}>
              {t('deleteDialog.bodyBefore')}
              <b>"{confirmDeleteDocName}"</b>
              {t('deleteDialog.bodyAfter')}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1.5 }}>
            <Button onClick={() => setConfirmDeleteDocId(null)} sx={secondaryButtonSx(isDarkMode)}>
              {t('common.cancel')}
            </Button>
            <Button
              sx={{
                borderRadius: `${MARKETING.radius}px`,
                px: 2.5,
                py: 0.85,
                textTransform: 'none',
                fontWeight: 500,
                letterSpacing: 0,
                background: BRAND.danger,
                color: '#FFFFFF',
                boxShadow: 'none',
                '&:hover': { background: '#B91C1C', boxShadow: 'none' },
              }}
              onClick={async () => {
                const docId = confirmDeleteDocId;
                if (!docId || !id) return;
                try {
                  await deleteDocumentForPatient(id, docId);
                  setConfirmDeleteDocId(null);
                  await refetch();
                } catch {
                  notify({ message: t('toast.deleteDocumentError'), severity: 'error' });
                }
              }}
            >
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
