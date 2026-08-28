import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { reportError } from '../../services/errorReporting';
import { isStaleChunkError } from '../../utils/staleChunk';
import i18n from '../../i18n';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  /** El fallo es "este build ya no existe": se ofrece recargar, no reintentar. */
  isStale: boolean;
}

const DOM_MUTATION_PATTERNS = [
  'removeChild',
  'insertBefore',
  'not a child of this',
  'no es hijo de este',
];

function isDomMutationError(error: Error): boolean {
  const msg = error.message || '';
  return DOM_MUTATION_PATTERNS.some((p) => msg.includes(p));
}

export class ErrorBoundary extends React.Component<Props, State> {
  private autoRecoverAttempts = 0;
  private static MAX_AUTO_RECOVER = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isStale: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isStale: isStaleChunkError(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Despliegue nuevo: el chunk que pedía esta ruta ya no está en el servidor.
    // No es un bug de la app y no se reporta. Tampoco recargamos por nuestra
    // cuenta: este boundary también envuelve modales abiertos sobre un
    // expediente en edición, y una recarga sorpresa perdería lo escrito.
    if (isStaleChunkError(error)) return;

    if (isDomMutationError(error) && this.autoRecoverAttempts < ErrorBoundary.MAX_AUTO_RECOVER) {
      this.autoRecoverAttempts++;
      console.warn(
        `[ErrorBoundary] DOM mutation error from browser extension/translate — auto-recovering (attempt ${this.autoRecoverAttempts})`,
      );
      this.setState({ hasError: false, error: null, isStale: false });
      return;
    }
    console.error('[ErrorBoundary]', error, info.componentStack);
    // Reporta al backend para que el admin lo vea en /admin/errores.
    reportError(error, {
      action: 'render',
      metadata: { componentStack: info.componentStack },
    });
  }

  handleReset = () => {
    this.autoRecoverAttempts = 0;
    this.setState({ hasError: false, error: null, isStale: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      // Build caducado: "Intentar de nuevo" no sirve —React.lazy cachea el
      // rechazo, así que re-renderizar vuelve a fallar—. Lo único que arregla
      // esto es traerse el build nuevo.
      const stale = this.state.isStale;
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color={stale ? 'text.primary' : 'error'} gutterBottom>
            {i18n.t(stale ? 'errorBoundary:staleTitle' : 'errorBoundary:title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {stale
              ? i18n.t('errorBoundary:staleMessage')
              : this.state.error?.message || i18n.t('errorBoundary:defaultMessage')}
          </Typography>
          {stale ? (
            <Button variant="contained" onClick={() => window.location.reload()}>
              {i18n.t('errorBoundary:reload')}
            </Button>
          ) : (
            <Button variant="outlined" onClick={this.handleReset}>
              {i18n.t('errorBoundary:retry')}
            </Button>
          )}
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
