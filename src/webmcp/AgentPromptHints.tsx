/**
 * Slim strip of suggested agent prompts — onboarding for evaluators. Tells a
 * visitor exactly what to ask their agent on this screen, and adapts its
 * wording when WebMCP isn't detected. Dismissible per session.
 */
import React from 'react';
import { alpha, Box, Chip, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import { BRAND, glassSx } from '../components/common/designTokens';
import { getModelContext } from './modelContext';

const STORAGE_KEY = 'hr-demo:hide-prompt-hints';

export function AgentPromptHints({ prompts }: { prompts: string[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const supported = React.useMemo(() => !!getModelContext(), []);
  const [hidden, setHidden] = React.useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (hidden) return null;

  return (
    <Box
      sx={{
        ...glassSx(isDark, 'panel', { blur: 14, radius: 12 }),
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.75,
        px: 1.5,
        py: 0.9,
        mb: 2,
        border: `1px solid ${alpha(BRAND.primary, isDark ? 0.3 : 0.22)}`,
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: 15, color: BRAND.primary }} />
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.secondary', mr: 0.5 }}>
        {supported ? 'Ask your agent:' : 'With WebMCP enabled, ask your agent:'}
      </Typography>
      {prompts.map((p) => (
        <Chip
          key={p}
          size="small"
          label={`“${p}”`}
          sx={{
            fontSize: '0.72rem',
            bgcolor: alpha(BRAND.primary, isDark ? 0.14 : 0.08),
            color: 'text.primary',
            '& .MuiChip-label': { px: 1 },
          }}
        />
      ))}
      {!supported && (
        <Tooltip title="Chrome 149+: enable chrome://flags/#enable-webmcp-testing, or open this URL in ChatGPT's in-app browser.">
          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', ml: 0.25, cursor: 'help' }}>
            How?
          </Typography>
        </Tooltip>
      )}
      <Box sx={{ flex: 1 }} />
      <IconButton
        size="small"
        aria-label="Dismiss suggestions"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem(STORAGE_KEY, '1');
          } catch {
            /* ignore */
          }
        }}
        sx={{ width: 24, height: 24, color: 'text.disabled' }}
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}
