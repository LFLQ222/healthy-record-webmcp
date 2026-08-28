/**
 * Header chip showing how many WebMCP tools the page currently exposes.
 * Progressive enhancement: renders nothing when the browser has no
 * `document.modelContext` — except in DEV, where it stays visible so the
 * dynamic register/unregister lifecycle can be watched while developing.
 */
import React from 'react';
import { alpha, Box, Chip, Tooltip } from '@mui/material';
import { BRAND } from '../components/common/designTokens';
import { getModelContext } from './modelContext';
import { getAgentToolNames, subscribeAgentTools } from './useWebMcpTools';

export function WebMcpStatusChip() {
  const supported = React.useMemo(() => !!getModelContext(), []);
  const toolNames = React.useSyncExternalStore(subscribeAgentTools, getAgentToolNames);

  if (!supported && !import.meta.env.DEV) return null;
  if (!toolNames.length) return null;

  const label = supported ? `Agent · ${toolNames.length} tools` : `Agent (off) · ${toolNames.length} tools`;
  return (
    <Tooltip
      title={
        <Box component="span" sx={{ fontSize: '0.72rem' }}>
          {supported
            ? 'WebMCP tools this page exposes to your agent: '
            : 'WebMCP not detected in this browser — tools that WOULD be live: '}
          {toolNames.join(' · ')}
        </Box>
      }
    >
      <Chip
        size="small"
        label={label}
        sx={{
          fontSize: '0.68rem',
          fontWeight: 600,
          color: supported ? BRAND.success : 'text.secondary',
          bgcolor: alpha(supported ? BRAND.success : '#94A3B8', 0.14),
          '& .MuiChip-label': { px: 1 },
        }}
        icon={
          <Box
            sx={{
              width: 7,
              height: 7,
              ml: 0.75,
              borderRadius: '50%',
              bgcolor: supported ? BRAND.success : 'text.disabled',
              boxShadow: supported ? `0 0 0 3px ${alpha(BRAND.success, 0.2)}` : 'none',
            }}
          />
        }
      />
    </Tooltip>
  );
}
