import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { persistLanguage } from '../../i18n';

/** ES/EN switch for the UI chrome. Clinical data stays in Spanish by design. */
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0];
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={lang}
      onChange={(_e, next) => {
        if (next && next !== lang) {
          i18n.changeLanguage(next);
          persistLanguage(next);
        }
      }}
      sx={{ '& .MuiToggleButton-root': { px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 600, textTransform: 'none' } }}
    >
      <ToggleButton value="en">EN</ToggleButton>
      <ToggleButton value="es">ES</ToggleButton>
    </ToggleButtonGroup>
  );
}
