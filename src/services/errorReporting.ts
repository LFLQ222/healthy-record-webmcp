/**
 * Demo errorReporting — the production app posts browser errors to its
 * backend; the public demo just logs to the console.
 */
export interface ReportContext {
  section?: string;
  action?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

export function reportError(error: unknown, context?: ReportContext): void {
  console.error('[demo error]', error, context ?? '');
}
