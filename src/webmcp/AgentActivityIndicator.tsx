/**
 * Floating pill shown while a WebMCP tool is executing — makes agent-driven
 * UI movement legible: the viewer sees WHO is acting before the screen moves.
 */
import React from 'react';
import { alpha, Box, Typography, useTheme } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AnimatePresence, motion } from 'framer-motion';
import { BRAND } from '../components/common/designTokens';
import { getAgentActivity, subscribeAgentActivity } from './agentActivity';

export function AgentActivityIndicator() {
  const activity = React.useSyncExternalStore(subscribeAgentActivity, getAgentActivity);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        bottom: 22,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 2000,
      }}
    >
      <AnimatePresence>
        {activity && (
          <Box
            key={activity.id}
            component={motion.div}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.75,
              py: 0.8,
              borderRadius: '999px',
              bgcolor: isDark ? alpha('#0F172A', 0.86) : alpha('#0F172A', 0.82),
              border: `1px solid ${alpha(BRAND.primary, 0.5)}`,
              boxShadow: `0 8px 28px ${alpha('#000', 0.35)}`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <AutoAwesomeIcon
              sx={{
                fontSize: 15,
                color: BRAND.primary,
                animation: 'hrAgentSpin 2.4s linear infinite',
                '@keyframes hrAgentSpin': {
                  '0%': { transform: 'rotate(0deg) scale(1)' },
                  '50%': { transform: 'rotate(180deg) scale(1.15)' },
                  '100%': { transform: 'rotate(360deg) scale(1)' },
                },
              }}
            />
            <Typography sx={{ color: '#F8FAFC', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '-0.005em' }}>
              {activity.message}
            </Typography>
          </Box>
        )}
      </AnimatePresence>
    </Box>
  );
}
