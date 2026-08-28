/**
 * "El build que tiene esta pestaña abierta ya no existe en el servidor."
 *
 * Amplify borra los assets del despliegue anterior. Una pestaña que lleva horas
 * abierta conserva el `index.html` viejo en memoria, así que al navegar a una
 * ruta perezosa pide un `/assets/PatientsPage-<hash>.js` que ya devuelve 404 y
 * React.lazy revienta. No es un bug de la app: es un despliegue nuevo.
 *
 * Módulo hoja a propósito (sin imports): lo consumen `lazyPreload`, `main.tsx`,
 * `ErrorBoundary` y `errorReporting`, y no debe participar en ningún ciclo.
 */

// Cómo describe cada navegador un chunk que ya no se puede bajar.
const STALE_CHUNK_PATTERNS = [
  'failed to fetch dynamically imported module', // Chrome / Edge
  'error loading dynamically imported module',   // Firefox
  'importing a module script failed',            // Safari
  'unable to preload css',                       // helper de Vite
  'failed to load module script',                // llegó HTML donde iba JS
];

export function isStaleChunkError(error: unknown): boolean {
  const raw = error as { message?: string } | string | null | undefined;
  const msg = String((typeof raw === 'object' && raw ? raw.message : raw) ?? '').toLowerCase();
  if (!msg) return false;
  return STALE_CHUNK_PATTERNS.some((p) => msg.includes(p));
}

/** True dentro del prerender de react-snap: ahí recargar cuelga el build. */
function isPrerenderAgent(): boolean {
  return typeof navigator !== 'undefined' && /ReactSnap/i.test(navigator.userAgent);
}

let staleBuild = false;

/** Marca que este build ya no está servido (lo detecta `vite:preloadError`). */
export const markStaleBuild = (): void => { staleBuild = true; };
export const isStaleBuild = (): boolean => staleBuild;

const RELOAD_COUNT_KEY = 'hr:stale-chunk-reloads';
const MAX_RELOADS = 2;

function readReloadCount(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_COUNT_KEY)) || 0;
  } catch {
    return MAX_RELOADS; // sin sessionStorage no hay guarda posible: no recargamos
  }
}

/**
 * Recarga la página para coger el build nuevo, como mucho MAX_RELOADS veces.
 *
 * La guarda es un contador en sessionStorage y no una ventana temporal: con un
 * build roto de verdad, una ventana de N segundos deja al usuario recargando
 * para siempre. Solo lo pone a cero un chunk que carga bien (ver lazyPreload).
 * Devuelve true si la recarga se ha lanzado.
 */
export function reloadOnceForStaleChunk(): boolean {
  if (typeof window === 'undefined' || isPrerenderAgent()) return false;
  const count = readReloadCount();
  if (count >= MAX_RELOADS) return false;
  try {
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(count + 1));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Un chunk cargó bien: el build sirve, olvidamos los intentos previos. */
export function clearStaleChunkReloads(): void {
  try {
    sessionStorage.removeItem(RELOAD_COUNT_KEY);
  } catch {
    /* ignore */
  }
}
