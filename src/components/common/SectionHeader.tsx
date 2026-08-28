/**
 * SectionHeader — uniform section title bar for every EHR section.
 *
 * Apple Health category-chip feel: tinted tonal icon bucket (36×36, 12px radius,
 * 12% brand fill, colored icon) + tight title + optional subtitle + trailing slot.
 *
 * Replaces the old 40×40 solid-gradient badges everywhere.
 */

import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { iconBucketSx, BRAND } from './designTokens';

export interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  hue?: string;      // override the icon-bucket color for a specific section
  dense?: boolean;   // tighter layout for inline headers
  trailing?: React.ReactNode; // edit switch, menu, etc.
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  hue = BRAND.primary,
  dense = false,
  trailing,
}: SectionHeaderProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      spacing={{ xs: 1.25, sm: 1.25 }}
      sx={{ mb: dense ? 1.25 : 2, minWidth: 0, width: '100%' }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={iconBucketSx(isDark, hue)}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<any>, {
                sx: {
                  fontSize: 20,
                  ...((icon as React.ReactElement<any>).props?.sx || {}),
                },
              })
            : icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant={dense ? 'subtitle1' : 'h6'}
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.018em',
              lineHeight: 1.2,
              fontSize: dense ? '1rem' : '1.125rem',
              color: 'text.primary',
            }}
            noWrap
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'text.secondary',
                fontSize: '0.75rem',
                lineHeight: 1.35,
                mt: 0.25,
              }}
              noWrap
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {trailing && (
        <Box sx={{ flexShrink: { xs: 1, sm: 0 }, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
          {trailing}
        </Box>
      )}
    </Stack>
  );
}
