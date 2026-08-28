import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import type { AlertColor } from '@mui/material/Alert';
import type { SnackbarCloseReason } from '@mui/material/Snackbar';

export type NotifyOptions = {
  message: string;
  severity?: AlertColor;
  autoHideDuration?: number;
  action?: React.ReactNode;
};

interface NotificationContextType {
  notify: (opts: NotifyOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');
  const [duration, setDuration] = useState<number | undefined>(4000);
  const [action, setAction] = useState<React.ReactNode>(undefined);

  const notify = useCallback((opts: NotifyOptions) => {
    setMsg(opts.message);
    setSeverity(opts.severity ?? 'info');
    setDuration(opts.autoHideDuration ?? 4000);
    setAction(opts.action);
    setOpen(true);
  }, []);

  const handleClose = useCallback((_e: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert elevation={6} variant="filled" onClose={handleClose} severity={severity} sx={{ width: '100%' }} action={action}>
          {msg}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used within NotificationProvider');
  return ctx.notify;
}
