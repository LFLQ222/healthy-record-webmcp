/**
 * ListRow + GroupedList — iOS Settings-style grouped list primitives.
 *
 * Designed for the EHR "grouped card of rows" pattern used everywhere:
 * antecedentes, allergies, switches, etc.
 *
 *   <GroupedList>
 *     <ListRow icon={<Icon />} title="Diabetes" trailing={<Switch />} />
 *     <ListRow title="Hipertensión" trailing={<Chevron />} />
 *   </GroupedList>
 *
 * Rows are auto-separated by a 1px divider (except the last).
 */

import React from 'react';
import { Box, Stack, Typography, useTheme, alpha } from '@mui/material';
import { BRAND, RADIUS, glassSx } from './designTokens';

export interface GroupedListProps {
  children: React.ReactNode;
  dense?: boolean;
  sx?: any;
}

export function GroupedList({ children, dense, sx }: GroupedListProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <Box
      sx={{
        ...glassSx(isDark, 'row', { radius: RADIUS.lg }),
        overflow: 'hidden',
        ...sx,
      }}
    >
      {items.map((child, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <Box
              sx={{
                borderTop: `1px solid ${alpha(BRAND.primary, isDark ? 0.14 : 0.09)}`,
                mx: dense ? 1.5 : 2,
              }}
            />
          )}
          {child}
        </React.Fragment>
      ))}
    </Box>
  );
}

export interface ListRowProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;         // highlighted (e.g., currently-selected)
  dense?: boolean;
  /** When set, the row expands below the trailing to show this content. */
  expanded?: boolean;
  expandedContent?: React.ReactNode;
}

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  active,
  dense,
  expanded,
  expandedContent,
}: ListRowProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const clickable = Boolean(onClick);

  return (
    <Box
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      sx={{
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background-color 160ms ease',
        background: active
          ? alpha(BRAND.primary, isDark ? 0.16 : 0.08)
          : 'transparent',
        '&:hover': clickable
          ? { background: alpha(BRAND.primary, isDark ? 0.12 : 0.05) }
          : undefined,
        '&:focus-visible': {
          outline: `2px solid ${BRAND.primary}`,
          outlineOffset: -2,
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{
          px: dense ? 1.75 : 2,
          py: dense ? 1.1 : 1.35,
          minHeight: dense ? 44 : 52,
        }}
      >
        {icon && (
          <Box
            sx={{
              width: dense ? 26 : 30,
              height: dense ? 26 : 30,
              borderRadius: `${RADIUS.sm}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: alpha(BRAND.primary, isDark ? 0.18 : 0.1),
              color: BRAND.primary,
              flexShrink: 0,
              '& svg': { fontSize: dense ? 15 : 17 },
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {typeof title === 'string' ? (
            <Typography
              sx={{
                fontSize: dense ? '0.85rem' : '0.92rem',
                fontWeight: active ? 600 : 500,
                letterSpacing: '-0.005em',
                color: active ? 'text.primary' : 'text.primary',
                lineHeight: 1.3,
              }}
              noWrap
            >
              {title}
            </Typography>
          ) : (
            title
          )}
          {subtitle &&
            (typeof subtitle === 'string' ? (
              <Typography
                sx={{
                  fontSize: '0.76rem',
                  color: 'text.secondary',
                  mt: 0.25,
                  lineHeight: 1.35,
                }}
              >
                {subtitle}
              </Typography>
            ) : (
              subtitle
            ))}
        </Box>
        {trailing && <Box sx={{ flexShrink: 0 }}>{trailing}</Box>}
      </Stack>
      {expanded && expandedContent && (
        <Box sx={{ px: dense ? 1.75 : 2, pb: 1.5 }}>{expandedContent}</Box>
      )}
    </Box>
  );
}
