import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import getTheme from './theme';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { UploadProvider } from './context/UploadContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AgentActivityIndicator } from './webmcp/AgentActivityIndicator';
import { DemoTourPanel, TourEntryDialog } from './tour/DemoTour';
import PatientsListPage from './pages/PatientsListPage';
import PatientDetailPage from './pages/PatientDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

export default function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = React.useMemo(() => getTheme(prefersDark ? 'dark' : 'light'), [prefersDark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <UploadProvider>
              <ErrorBoundary>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<PatientsListPage />} />
                    <Route path="/pacientes/:id" element={<PatientDetailPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  <TourEntryDialog />
                  <DemoTourPanel />
                </BrowserRouter>
              </ErrorBoundary>
              <AgentActivityIndicator />
            </UploadProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
