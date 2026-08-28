import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { MARKETING, DISPLAY_FONT, FONT_STACK, elevations } from './components/common/designTokens';

/**
 * Superficies base del producto. Papel, no vidrio: el mismo blanco liso y el
 * mismo filo de 1px de la landing. Antes esto devolvía fondos translúcidos con
 * blur que se apoyaban en el degradado global; ese paquete (tarjeta flotante +
 * blur + sombra larga) es justo lo que hacía que el producto se leyera como
 * plantilla y no como la marca.
 */
const getSurfaces = (mode: PaletteMode) => {
  const dark = mode === 'dark';
  return {
    page: dark ? MARKETING.surfaceDark : MARKETING.surface,
    card: dark ? MARKETING.surfaceAltDark : MARKETING.surface,
    dialog: dark ? MARKETING.surfaceAltDark : MARKETING.surface,
    input: dark ? MARKETING.surfaceAltDark : MARKETING.surface,
    border: dark ? MARKETING.borderDark : MARKETING.border,
    borderStrong: dark ? '#3A3F46' : '#C7CBD1',
  };
};

const getTheme = (mode: PaletteMode) => {
  const s = getSurfaces(mode);
  const dark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      // El azul clínico suave sigue siendo la familia de TINTES (iconos,
      // avatares, estados). Las acciones y los enlaces van en el azul de la
      // landing, que es `accent` — un solo color de acción en toda la marca.
      primary: {
        main: dark ? MARKETING.accentDark : MARKETING.accent,
        light: '#A5CBE2',
        dark: dark ? '#A8CCE8' : MARKETING.accentHover,
        contrastText: dark ? '#0A0B0C' : '#ffffff',
      },
      secondary: {
        main: '#10b981',
        light: '#6ee7b7',
        dark: '#047857',
        contrastText: '#ffffff',
      },
      background: {
        default: s.page,
        paper: s.card,
      },
      divider: s.border,
    },
    shape: {
      borderRadius: MARKETING.radius,
    },
    typography: {
      fontFamily: FONT_STACK,
      // Titulares en Outfit 300 y tracking 0, igual que la landing. El peso 700
      // con -0.04em era la voz de otra marca; a este peso el tipo se sostiene
      // por tamaño y aire, no por grosor.
      h1: { fontFamily: DISPLAY_FONT, fontSize: '2.5rem', fontWeight: 300, lineHeight: 1.15, letterSpacing: 0 },
      h2: { fontFamily: DISPLAY_FONT, fontSize: '2rem', fontWeight: 300, lineHeight: 1.2, letterSpacing: 0 },
      h3: { fontFamily: DISPLAY_FONT, fontSize: '1.625rem', fontWeight: 300, lineHeight: 1.25, letterSpacing: 0 },
      h4: { fontFamily: DISPLAY_FONT, fontSize: '1.375rem', fontWeight: 300, lineHeight: 1.3, letterSpacing: 0 },
      // h5/h6 son etiquetas de sección, no titulares: adelgazarlas las borra.
      // Se quedan en 600 y sólo pierden el tracking negativo.
      h5: { fontSize: '1.0625rem', fontWeight: 600, letterSpacing: 0 },
      h6: { fontSize: '0.9375rem', fontWeight: 600, letterSpacing: 0 },
      subtitle1: { fontWeight: 600, letterSpacing: 0 },
      subtitle2: { fontWeight: 600, letterSpacing: 0 },
      body1: { letterSpacing: 0 },
      body2: { letterSpacing: 0 },
      button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // `colorScheme` lo manda el tema de la app, no el del sistema: si no,
          // barras de scroll y controles nativos salen oscuros con la app en
          // claro. Sin `background-color` aquí a propósito — con fondo en html,
          // el de body deja de propagarse al lienzo.
          html: { scrollBehavior: 'smooth', minHeight: '100%', colorScheme: mode },
          'html, body, #root': { minHeight: '100%' },
          '#root': { position: 'relative', zIndex: 0 },
          body: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
            fontFeatureSettings: '"cv11", "ss01", "cv02", "calt"',
            position: 'relative',
            margin: 0,
            backgroundColor: s.page,
          },
          '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
          '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
          '@media (prefers-reduced-motion: reduce)': { '*': { animation: 'none !important', transition: 'none !important' } },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: s.page,
            boxShadow: 'none',
            backgroundImage: 'none',
            transition: 'background-color 240ms ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          // Sin `translateY` al pasar el ratón: los botones que se levantan
          // solos son la firma del dashboard generado.
          root: {
            borderRadius: MARKETING.radius,
            paddingInline: 16,
            boxShadow: 'none',
            transition: 'background-color 180ms ease, color 180ms ease, border-color 180ms ease',
            '&:hover': { boxShadow: 'none' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: MARKETING.radiusCard,
            boxShadow: 'none',
            backgroundColor: s.card,
            backgroundImage: 'none',
            border: `1px solid ${s.border}`,
            transition: 'border-color 200ms ease',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: MARKETING.radius,
            fontWeight: 500,
            letterSpacing: 0,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          // El modal SÍ se eleva: es lo único que de verdad está por encima de
          // la página, y sin sombra se confunde con ella.
          paper: {
            borderRadius: MARKETING.radiusCard,
            backgroundColor: s.dialog,
            backgroundImage: 'none',
            border: `1px solid ${s.border}`,
            boxShadow: elevations[4],
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          // `:not(.MuiBackdrop-invisible)` es obligatorio: sin él, este color
          // pisa el backdrop invisible que usan Menu y Popover, y abrir el menú
          // de perfil atenuaba la página entera.
          root: { '&:not(.MuiBackdrop-invisible)': { backgroundColor: 'rgba(10, 11, 12, 0.42)' } },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: MARKETING.radius,
            backgroundColor: s.input,
            '& fieldset': { borderColor: s.border },
            '&:hover fieldset': { borderColor: s.borderStrong },
          },
        },
      },
    },
  });
};

export default getTheme;
