/**
 * Demo UploadContext — same surface as the production upload tray, but the
 * public demo has no storage backend, so uploads are declined with a notice.
 */
import React, { createContext, useCallback, useContext } from 'react';
import { useNotify } from './NotificationContext';

export interface StartUploadArgs {
  files: File[];
  patientId?: string;
  category?: string;
  onDone?: () => void | Promise<void>;
  onError?: (e: unknown) => void;
  onCancelled?: () => void;
}

interface UploadState {
  startUpload: (args: StartUploadArgs) => void;
}

const UploadContext = createContext<UploadState>({ startUpload: () => {} });

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const notify = useNotify();
  const startUpload = useCallback(
    (_args: StartUploadArgs) => {
      notify({
        message: 'Document uploads are disabled in this public demo — all data is a fixed synthetic dataset.',
        severity: 'info',
      });
    },
    [notify],
  );
  return <UploadContext.Provider value={{ startUpload }}>{children}</UploadContext.Provider>;
}

export function useUploads(): UploadState {
  return useContext(UploadContext);
}
