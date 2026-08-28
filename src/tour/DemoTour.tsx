/**
 * Guided tour — entry dialog (guided vs free) plus a floating step panel that
 * checks itself off as things actually happen: navigation, each WebMCP tool
 * invocation (via the `hr-demo:tool-invoked` event the registration layer
 * emits) and the physician's Sign action. No DOM-anchored overlays on
 * purpose: a floating checklist cannot break the page it teaches.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  alpha,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { BRAND, glassSx, primaryButtonSx, secondaryButtonSx } from '../components/common/designTokens';
import { getModelContext } from '../webmcp/modelContext';
import {
  advanceTourFrom,
  endTour,
  getTourMode,
  getTourStep,
  setTourMode,
  subscribeTour,
} from './tourState';

interface TourStep {
  title: string;
  body?: string;
  prompt?: string;
  expectedTool?: string;
  manualLabel?: string;
}

const STEPS: TourStep[] = [
  {
    title: 'Open the "Start here" chart',
    body: 'Click Ernesto Ramírez Ibarra on the patient list — his chart hides the buried kidney signal.',
  },
  {
    title: 'Connect your agent',
    body: 'Chrome 149+: enable chrome://flags/#enable-webmcp-testing and reload (the tour survives). Or open this URL in ChatGPT’s in-app browser. To chat in Chrome, use the official "Model Context Tool Inspector" extension.',
    manualLabel: "I'm connected — continue",
  },
  { title: 'Ask about the visit', prompt: 'What changed since the last visit?', expectedTool: 'get_chart_summary' },
  { title: 'See the buried trend', prompt: 'Show me the creatinine trend', expectedTool: 'plot_lab_trend' },
  { title: 'Light up the problem', prompt: 'Highlight everything out of range', expectedTool: 'highlight_findings' },
  { title: 'Let the agent draft', prompt: 'Draft a note about this finding', expectedTool: 'draft_note' },
  {
    title: 'You sign — the agent cannot',
    body: 'In Notes, press the green Sign button on the agent’s draft. Only the physician makes it part of the record.',
  },
];

function useTour() {
  const subscribe = React.useCallback((l: () => void) => subscribeTour(l), []);
  const mode = React.useSyncExternalStore(subscribe, getTourMode);
  const step = React.useSyncExternalStore(subscribe, getTourStep);
  return { mode, step };
}

export function TourEntryDialog() {
  const { mode } = useTour();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const onList = location.pathname === '/';

  return (
    <Dialog open={mode === null && onList} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, letterSpacing: '-0.012em', pb: 0.5 }}>
        Healthy Record × WebMCP
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', lineHeight: 1.6 }}>
          An EHR where your AI agent works inside the physician's session and drives this very screen. All patients
          are synthetic. How do you want to see it?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5, gap: 1 }}>
        <Button onClick={() => setTourMode('free')} sx={{ ...secondaryButtonSx(isDark), py: 0.6, fontSize: '0.82rem' }}>
          Explore on my own
        </Button>
        <Button onClick={() => setTourMode('tutorial')} sx={{ ...primaryButtonSx(isDark), py: 0.6, fontSize: '0.82rem' }}>
          Take the guided tour
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function DemoTourPanel() {
  const { mode, step } = useTour();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [copied, setCopied] = React.useState(false);
  const supported = React.useMemo(() => !!getModelContext(), []);

  // Step 0: opening the index chart.
  React.useEffect(() => {
    if (location.pathname.startsWith('/pacientes/pat-001')) advanceTourFrom(0);
  }, [location.pathname]);

  // Step 1: agent connectivity auto-passes when WebMCP is present.
  React.useEffect(() => {
    if (supported) advanceTourFrom(1);
  }, [supported, step]);

  // Prompt steps: advance when the agent actually invokes the expected tool.
  React.useEffect(() => {
    const onTool = (e: Event) => {
      const name = (e as CustomEvent<{ name?: string }>).detail?.name;
      const current = getTourStep();
      if (STEPS[current]?.expectedTool && STEPS[current].expectedTool === name) advanceTourFrom(current);
    };
    const onSigned = () => advanceTourFrom(6);
    window.addEventListener('hr-demo:tool-invoked', onTool);
    window.addEventListener('hr-demo:draft-signed', onSigned);
    return () => {
      window.removeEventListener('hr-demo:tool-invoked', onTool);
      window.removeEventListener('hr-demo:draft-signed', onSigned);
    };
  }, []);

  if (mode !== 'tutorial') return null;

  const done = step >= STEPS.length;
  const current = STEPS[Math.min(step, STEPS.length - 1)];

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the chip text is selectable anyway */
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        width: 316,
        maxWidth: 'calc(100vw - 36px)',
        zIndex: 1900,
        p: 1.75,
        ...glassSx(isDark, 'floating', { blur: 22, radius: 14 }),
        border: `1px solid ${alpha(BRAND.primary, isDark ? 0.4 : 0.28)}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
        <AutoAwesomeIcon sx={{ fontSize: 15, color: BRAND.primary }} />
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '-0.008em', flex: 1 }}>
          Guided tour · {Math.min(step + 1, STEPS.length)}/{STEPS.length}
        </Typography>
        <Tooltip title="Exit tour">
          <IconButton size="small" onClick={endTour} sx={{ width: 22, height: 22, color: 'text.disabled' }}>
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {done ? (
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.55 }}>
            🎉 <b>Tour complete.</b> You watched an agent find a buried diagnosis, drive the chart, and hand the
            decision back to a human. Explore freely — every tool stays live.
          </Typography>
          <Button size="small" onClick={endTour} sx={{ ...primaryButtonSx(isDark), py: 0.5, fontSize: '0.8rem' }}>
            Finish
          </Button>
        </Stack>
      ) : (
        <>
          <Stack spacing={0.4} sx={{ mb: 1.25 }}>
            {STEPS.map((s, i) => (
              <Stack key={s.title} direction="row" spacing={0.75} alignItems="center">
                {i < step ? (
                  <CheckCircleIcon sx={{ fontSize: 14, color: BRAND.success }} />
                ) : (
                  <RadioButtonUncheckedIcon
                    sx={{ fontSize: 14, color: i === step ? BRAND.primary : 'text.disabled' }}
                  />
                )}
                <Typography
                  sx={{
                    fontSize: '0.74rem',
                    fontWeight: i === step ? 700 : 400,
                    color: i === step ? 'text.primary' : i < step ? 'text.secondary' : 'text.disabled',
                  }}
                >
                  {s.title}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {current.body && (
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5, mb: 1 }}>
              {current.body}
            </Typography>
          )}

          {current.prompt && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{
                bgcolor: alpha(BRAND.primary, isDark ? 0.14 : 0.08),
                borderRadius: '10px',
                px: 1.1,
                py: 0.6,
                mb: 1,
              }}
            >
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, flex: 1 }}>“{current.prompt}”</Typography>
              <Tooltip title={copied ? 'Copied ✓' : 'Copy prompt'}>
                <IconButton size="small" onClick={() => copyPrompt(current.prompt!)} sx={{ width: 24, height: 24 }}>
                  <ContentCopyIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>
              {current.expectedTool ? 'Auto-advances when your agent runs it' : ' '}
            </Typography>
            <Button
              size="small"
              onClick={() => advanceTourFrom(step)}
              sx={{ ...secondaryButtonSx(isDark), py: 0.3, px: 1.2, fontSize: '0.72rem' }}
            >
              {current.manualLabel ?? 'Skip'}
            </Button>
          </Stack>
        </>
      )}
    </Paper>
  );
}
