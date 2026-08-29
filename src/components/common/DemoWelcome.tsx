/**
 * First-visit orientation card — the demo's story for evaluators with no
 * medical background. Keeps the DATA authentically messy (that's the point)
 * while the framing stays plain-language. Dismissible; reopens from the "?"
 * button in the chart header.
 */
import React from 'react';
import { alpha, Box, Button, Stack, Typography, useTheme } from '@mui/material';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VerifiedIcon from '@mui/icons-material/Verified';
import { BRAND, glassSx, primaryButtonSx, secondaryButtonSx } from './designTokens';
import { setTourMode } from '../../tour/tourState';

export const WELCOME_STORAGE_KEY = 'hr-demo:welcome-done';

export function welcomeInitiallyOpen(): boolean {
  try {
    return sessionStorage.getItem(WELCOME_STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}

interface Props {
  open: boolean;
  onDismiss: () => void;
}

export function DemoWelcome({ open, onDismiss }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  if (!open) return null;

  const row = (icon: React.ReactNode, text: React.ReactNode) => (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{ color: BRAND.primary, display: 'flex', pt: 0.2 }}>{icon}</Box>
      <Typography sx={{ fontSize: '0.86rem', lineHeight: 1.55, color: 'text.primary' }}>{text}</Typography>
    </Stack>
  );

  return (
    <Box
      sx={{
        ...glassSx(isDark, 'panel', { blur: 16, radius: 14 }),
        p: 2.25,
        mb: 2,
        border: `1px solid ${alpha(BRAND.primary, isDark ? 0.35 : 0.25)}`,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em', mb: 1.25 }}>
        What you're looking at (no medical background needed)
      </Typography>
      <Stack spacing={1}>
        {row(
          <BiotechOutlinedIcon sx={{ fontSize: 18 }} />,
          <>
            A <b>synthetic</b> patient chart from a real production EHR. Buried in 22 months of routine labs, one
            number quietly climbs: <b>creatinine 0.94 → 1.52</b> — the kidneys failing slowly. Each value alone looks
            almost normal; in a 15-minute visit, doctors plausibly miss the trend.
          </>,
        )}
        {row(
          <AutoAwesomeIcon sx={{ fontSize: 18 }} />,
          <>
            Your AI agent works <b>inside this page</b> (WebMCP): ask it what changed, and watch it navigate this
            screen — plotting the trend, highlighting what's out of range, drafting the note.
          </>,
        )}
        {row(
          <VerifiedIcon sx={{ fontSize: 18 }} />,
          <>
            The agent can only <b>propose</b>: its note arrives as a draft, and only the physician's{' '}
            <b>Sign</b> button makes it part of the record.
          </>,
        )}
      </Stack>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
        <Button
          size="small"
          onClick={() => {
            setTourMode('tutorial');
            onDismiss();
          }}
          sx={{ ...secondaryButtonSx(isDark), py: 0.5, fontSize: '0.8rem' }}
        >
          Start guided tour
        </Button>
        <Button size="small" onClick={onDismiss} sx={{ ...primaryButtonSx(isDark), py: 0.5, fontSize: '0.8rem' }}>
          Got it
        </Button>
      </Stack>
    </Box>
  );
}
