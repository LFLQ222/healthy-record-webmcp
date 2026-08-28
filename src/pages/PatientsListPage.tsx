import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  alpha,
  Avatar,
  Box,
  Chip,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { listMyPatients, type UserBasic } from '../services/ehrService';
import { BRAND, glassSx } from '../components/common/designTokens';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { useAuth } from '../context/AuthContext';

/**
 * Doctor's patient list — the demo's landing view. Opening a chart navigates
 * to /pacientes/:id, which is where the chart-scoped WebMCP tools register.
 */
export default function PatientsListPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user } = useAuth();
  const { t } = useTranslation('patientDetailPage');

  const { data: patients, isLoading } = useQuery<UserBasic[]>({
    queryKey: ['myPatients'],
    queryFn: listMyPatients,
  });

  const panelGlass = glassSx(isDark, 'panel', { blur: 20, radius: 14 });

  return (
    <Box sx={{ minHeight: '100vh', pb: 6 }}>
      <Paper
        elevation={0}
        sx={{
          height: 60,
          px: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          ...glassSx(isDark, 'panel', { blur: 20, radius: 0 }),
          border: 'none',
          borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.14)' : 'rgba(95,163,204,0.18)'}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '9px',
              background: BRAND.primaryDeep,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            H
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: '-0.012em', lineHeight: 1.1 }}>
              Healthy Record
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              Dr. {user?.firstName} {user?.lastName} · {user?.specialty}
            </Typography>
          </Box>
          <Chip
            size="small"
            label="Synthetic demo data"
            sx={{
              fontSize: '0.68rem',
              fontWeight: 600,
              bgcolor: alpha(BRAND.primary, isDark ? 0.2 : 0.1),
              color: BRAND.primary,
            }}
          />
          <LanguageToggle />
        </Stack>
      </Paper>

      <Container maxWidth="md" sx={{ pt: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em', mb: 0.5 }}>
          {t('nav.patients', { defaultValue: 'Patients' })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('list.subtitle', {
            defaultValue: 'Open a chart — the agent tools for that chart register the moment it opens.',
          })}
        </Typography>

        {isLoading ? (
          <Stack spacing={1.25}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: '14px' }} />
            ))}
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            {(patients ?? []).map((p) => {
              const age = p.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth as string), 'year') : null;
              return (
                <Paper
                  key={p.id}
                  elevation={0}
                  onClick={() => navigate(`/pacientes/${p.id}`, { state: p })}
                  sx={{
                    ...panelGlass,
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.75,
                    cursor: 'pointer',
                    transition: 'transform 160ms ease, background-color 160ms ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      bgcolor: alpha(BRAND.primary, isDark ? 0.1 : 0.05),
                    },
                  }}
                >
                  <Avatar sx={{ width: 44, height: 44, background: BRAND.primaryDeep, fontSize: '1rem', fontWeight: 500 }}>
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, letterSpacing: '-0.01em' }} noWrap>
                      {p.firstName} {p.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {age != null ? `${age} ${t('sidebar.years', { defaultValue: 'yrs' })}` : '—'}
                      {p.gender ? ` · ${p.gender === 'male' ? 'M' : 'F'}` : ''}
                      {p.occupation ? ` · ${p.occupation}` : ''}
                    </Typography>
                  </Box>
                  <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                </Paper>
              );
            })}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
