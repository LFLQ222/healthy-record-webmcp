/**
 * Healthy Record — Design Tokens
 *
 * Derived from ui-ux-pro-max skill recommendations (see design-system/healthy-record/MASTER.md):
 *   • Style:   Glassmorphism + Spatial UI (VisionOS) + Bento Box Grid
 *   • Palette: Healthcare / Medical Clinic  (Primary #5FA3CC soft clinical blue + #16A34A health green)
 *   • Effects: backdrop-filter blur + saturate, 1px translucent borders,
 *              soft VisionOS-style shadows (0 8px 32px rgba(0,0,0,0.1))
 *   • Motion:  150–300ms, ease-out, scale 1.02 on focus, respects prefers-reduced-motion
 *
 * User-mandated overrides vs. skill defaults:
 *   • Typography = Apple-native SF Pro Display/Text → Inter (skill suggested
 *     Figtree/Noto Sans — rejected: user reads those as AI-generated).
 *
 * WCAG targets: 4.5:1 normal text, 3:1 large text, visible focus rings.
 */

import { alpha } from '@mui/material';

/** Core brand + semantic palette (Healthcare / Medical Clinic from skill) */
export const BRAND = {
  primary: '#5FA3CC',       // soft clinical blue — trust, calm
  primaryDeep: '#3F7FA9',   // used for body text + hover depth (4.7:1 on white)
  primaryLight: '#A5CBE2',  // pale tint for halos, badges, rings
  secondary: '#A5CBE2',
  accent: '#16A34A',        // health green (WCAG-safe accent)
  accentDeep: '#047857',

  // Semantic
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',

  // Neutrals (healthcare-tinted)
  foreground: '#134E4A',    // deep teal for text in light mode
  mutedFg: '#64748B',
  border: '#CCFBF1',
} as const;

/** Radius scale — la misma disciplina de la landing: chico y firme. El radio
 *  grande abarata, y a 16–24px toda superficie se lee como tarjeta de app. */
export const RADIUS = {
  xs: 4,
  sm: 4,
  md: 8,
  lg: 8,
  xl: 10,
  pill: 999,
} as const;

/** Motion tokens (ui-ux-pro-max §7: 150–300ms, ease-out entering) */
export const MOTION = {
  fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '180ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '280ms cubic-bezier(0.4, 0, 0.2, 1)',
  // ease-out-quint — desaceleración natural, sin rebote (el bounce abarata).
  spring: '420ms cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

/**
 * Superficie del producto — papel, no vidrio.
 *
 * Conserva el nombre y la firma de la antigua `glassSx` porque la usan ~60
 * componentes: cambiar el cuerpo migra la app entera de una vez. `blur` se
 * acepta y se ignora; sin degradado global detrás no había nada que difuminar,
 * y el vidrio translúcido era justo lo que hacía que el producto se leyera como
 * plantilla genérica en vez de como la landing.
 *
 * - `row`      fila o sub-bloque dentro de una tarjeta.
 * - `panel`    tarjeta o sección.
 * - `floating` menú o popover; la sombra la pone quien lo usa (elevations[3]).
 *
 * En claro los tres tonos son papel blanco y el filo hace la jerarquía. `row`
 * llegó a devolver un gris (#F7F8F9) pensando en filas pequeñas, pero de las 46
 * llamadas la mayoría envuelve secciones enteras del expediente: el resultado
 * eran bloques grises del tamaño de media pantalla sobre la página blanca.
 * En oscuro sí se aclara un paso, que ahí es como se lee la profundidad.
 */
export function glassSx(
  isDark: boolean,
  tone: 'panel' | 'row' | 'floating' = 'panel',
  opts: { blur?: number; radius?: number } = {}
) {
  const radius = opts.radius ?? (tone === 'row' ? RADIUS.md : RADIUS.lg);

  const background = isDark
    ? tone === 'row'
      ? '#16191D'
      : MARKETING.surfaceAltDark
    : MARKETING.surface;

  return {
    background,
    border: `1px solid ${isDark ? MARKETING.borderDark : MARKETING.border}`,
    borderRadius: `${radius}px`,
  } as const;
}

/** Elevación. En papel la profundidad la da el filo de 1px, no la sombra: lo
 *  que descansa sobre la página no flota. Sólo se eleva lo que de verdad está
 *  por encima —menús y modales—, que sin sombra se confunden con la página. */
export const elevations = {
  0: 'none',
  // tarjeta en reposo
  1: 'none',
  // tarjeta interactiva
  2: 'none',
  // menú / popover
  3: '0 8px 24px -12px rgba(15,23,42,0.18), 0 2px 6px -3px rgba(15,23,42,0.08)',
  // modal / sheet
  4: '0 24px 56px -20px rgba(15,23,42,0.26), 0 6px 16px -8px rgba(15,23,42,0.10)',
  // El glow de marca bajo los CTA era el tell más caro de todos.
  brand: (_isDark: boolean) => 'none',
} as const;

/** Tonal icon-bucket background for section-header icons.
 *  Replaces the old solid-gradient 40×40 badges — subtle tinted fill,
 *  colored icon, no shadow. Apple Health category-chip feel.
 */
export function iconBucketSx(isDark: boolean, hue: string = BRAND.primary) {
  return {
    width: 36,
    height: 36,
    borderRadius: `${RADIUS.sm}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: alpha(hue, isDark ? 0.2 : 0.12),
    color: hue,
    flexShrink: 0,
  } as const;
}

/** Apple-native font stack — used by <Typography> defaults in theme.ts
 *  but exposed here for sx overrides that need fontFamily inline.
 */
export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

/** Tipografía de marca para titulares display (landing). Outfit — geométrica
 *  de construcción circular. Solo headlines; el body sigue en FONT_STACK.
 *  Cargada non-blocking en index.html. */
export const DISPLAY_FONT =
  '"Outfit", "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

/**
 * Lenguaje visual de las páginas públicas (landing, precios, artículos).
 *
 * Separado del sistema del producto a propósito: el EHR es glass + azul clínico
 * suave, y la landing es papel blanco, negro puro y tipografía Light. Mezclarlos
 * en `BRAND` obligaría a reteñir toda la app para cambiar un titular.
 *
 * El peso 300 es lo que hace que el titular se lea serio en vez de simpático:
 * a ese peso el tipo necesita tamaño y aire, nunca tracking negativo agresivo.
 */
export const MARKETING = {
  ink: '#000000',
  inkSoft: '#565A5D',
  inkFaint: '#8A8F94',
  accent: '#1B4F8A',
  accentHover: '#143B69',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F8F9',
  border: '#E4E6E9',

  inkDark: '#FFFFFF',
  inkSoftDark: '#9AA0A6',
  inkFaintDark: '#6B7177',
  accentDark: '#7FB0DC',
  surfaceDark: '#0A0B0C',
  surfaceAltDark: '#121417',
  borderDark: '#26292E',

  /** Radio chico y firme — el radio grande abarata (eden usa 4px). */
  radius: 4,
  radiusCard: 8,
  displayWeight: 300,
} as const;

/**
 * Escala tipográfica de las páginas públicas. Contenida a propósito: en peso 300
 * el titular gana presencia por aire y tamaño, no por grosor, y pasado cierto
 * punto se vuelve cartel.
 */
export const MARKETING_TYPE = {
  display: { xs: '2.5rem', sm: '3.25rem', md: 'clamp(3rem, 4.2vw, 4.25rem)' },
  h2: { xs: '2rem', sm: '2.5rem', md: 'clamp(2.5rem, 3.6vw, 3.25rem)' },
  h3: { xs: '1.25rem', md: '1.4rem' },
  bodyLg: { xs: '1.0625rem', md: '1.125rem' },
  body: { xs: '1rem', md: '1.0625rem' },
  small: '0.8125rem',
} as const;

/** Paleta de la landing resuelta para el modo activo. */
export function marketingPalette(isDark: boolean) {
  return {
    ink: isDark ? MARKETING.inkDark : MARKETING.ink,
    inkSoft: isDark ? MARKETING.inkSoftDark : MARKETING.inkSoft,
    inkFaint: isDark ? MARKETING.inkFaintDark : MARKETING.inkFaint,
    accent: isDark ? MARKETING.accentDark : MARKETING.accent,
    surface: isDark ? MARKETING.surfaceDark : MARKETING.surface,
    surfaceAlt: isDark ? MARKETING.surfaceAltDark : MARKETING.surfaceAlt,
    border: isDark ? MARKETING.borderDark : MARKETING.border,
  };
}

/** CTA sólido de la landing — un solo color, sin gradiente, sin glow, radio 4px. */
export function marketingButtonSx(isDark: boolean) {
  const accent = isDark ? MARKETING.accentDark : MARKETING.accent;
  return {
    borderRadius: `${MARKETING.radius}px`,
    px: 2.5,
    py: 1.6,
    fontFamily: DISPLAY_FONT,
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: 0,
    textTransform: 'none' as const,
    background: accent,
    color: isDark ? '#0A0B0C' : '#FFFFFF',
    boxShadow: 'none',
    transition: `background-color ${MOTION.base}`,
    '&:hover': {
      background: isDark ? '#A8CCE8' : MARKETING.accentHover,
      boxShadow: 'none',
    },
    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  };
}

/** Enlace-botón secundario de la landing: texto plano, sin caja. */
export function marketingLinkSx(isDark: boolean) {
  const accent = isDark ? MARKETING.accentDark : MARKETING.accent;
  return {
    borderRadius: `${MARKETING.radius}px`,
    px: 2,
    py: 1.6,
    fontFamily: DISPLAY_FONT,
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: 0,
    textTransform: 'none' as const,
    color: isDark ? MARKETING.inkDark : MARKETING.ink,
    background: 'transparent',
    '&:hover': { background: 'transparent', color: accent },
  };
}

/** CTA principal del producto — el MISMO azul y la misma letra que el botón de
 *  la landing, sólo con el alto compacto que pide una pantalla densa. Tener dos
 *  azules de acción (#1B4F8A fuera, #3F7FA9 dentro) era lo que hacía que app y
 *  sitio parecieran de dos empresas.
 *  Usage:  <Button sx={{ ...primaryButtonSx(isDark) }}>Guardar</Button>
 */
export function primaryButtonSx(isDark: boolean) {
  const accent = isDark ? MARKETING.accentDark : MARKETING.accent;
  return {
    borderRadius: `${MARKETING.radius}px`,
    px: 2.25,
    py: 0.8,
    fontFamily: DISPLAY_FONT,
    fontSize: '0.9rem',
    fontWeight: 500,
    letterSpacing: 0,
    textTransform: 'none' as const,
    background: accent,
    color: isDark ? '#0A0B0C' : '#FFFFFF',
    boxShadow: 'none',
    transition: `background-color ${MOTION.base}`,
    '&:hover': {
      background: isDark ? '#A8CCE8' : MARKETING.accentHover,
      boxShadow: 'none',
    },
    '&:active': { background: isDark ? '#A8CCE8' : '#0F2E52' },
    '&.Mui-disabled': {
      background: alpha(accent, isDark ? 0.35 : 0.32),
      color: isDark ? alpha('#0A0B0C', 0.7) : alpha('#FFFFFF', 0.9),
      boxShadow: 'none',
    },
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
      '&:hover': { transform: 'none' },
    },
  };
}

/** Form-field style — near-solid surface with a real border, so hover/focus/
 *  error states read clearly. Shared by auth pages; replaces the borderless
 *  glass inputs. Usage: <TextField sx={fieldSx(isDark)} … /> */
export function fieldSx(isDark: boolean, radius: number = MARKETING.radius) {
  const mk = marketingPalette(isDark);
  const accent = mk.accent;
  return {
    '& .MuiOutlinedInput-root': {
      background: isDark ? MARKETING.surfaceAltDark : MARKETING.surface,
      borderRadius: `${radius}px`,
      fontFamily: FONT_STACK,
      fontSize: '0.95rem',
      transition: 'box-shadow 160ms ease',
      '& fieldset': {
        border: `1px solid ${mk.border}`,
        transition: 'border-color 160ms ease',
      },
      '&:hover fieldset': {
        borderColor: isDark ? '#3A3F46' : '#C7CBD1',
      },
      '&.Mui-focused fieldset': {
        borderColor: accent,
        borderWidth: '1.5px',
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha(accent, isDark ? 0.28 : 0.14)}`,
      },
    },
    '& .MuiInputLabel-root': {
      fontFamily: FONT_STACK,
      fontWeight: 500,
      fontSize: '0.9rem',
      '&.Mui-focused': { color: accent },
    },
    '& .MuiFormHelperText-root': {
      fontFamily: FONT_STACK,
      fontSize: '0.72rem',
      mt: 0.4,
    },
  };
}

/** Secundario (ghost) — subordinado al CTA. Sin relleno en reposo: en papel,
 *  dos cajas rellenas juntas ya no jerarquizan nada. */
export function secondaryButtonSx(isDark: boolean) {
  const mk = marketingPalette(isDark);
  return {
    borderRadius: `${MARKETING.radius}px`,
    px: 2.25,
    py: 0.8,
    fontFamily: DISPLAY_FONT,
    fontSize: '0.9rem',
    fontWeight: 400,
    letterSpacing: 0,
    textTransform: 'none' as const,
    color: mk.ink,
    background: 'transparent',
    '&:hover': {
      background: mk.surfaceAlt,
      color: mk.accent,
    },
  };
}
