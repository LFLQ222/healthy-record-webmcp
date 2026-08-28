import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          charts: ['recharts'],
          pdf: ['react-pdf', 'pdfjs-dist', 'jspdf'],
          motion: ['framer-motion'],
          i18n: ['i18next', 'react-i18next', 'dayjs'],
        },
      },
    },
  },
});
