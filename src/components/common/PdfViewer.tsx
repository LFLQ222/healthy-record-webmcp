import React from 'react';
import { Box, Stack, IconButton, Typography, Tooltip, TextField, useMediaQuery, useTheme } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs, Thumbnail } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use local worker bundled by Vite, matching the installed pdfjs-dist version.
// pdf.js 5.x (react-pdf 10) ships the worker as an ES module (.mjs); the old
// .min.js no longer exists.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// pdf.js 5 loads CMaps / standard fonts / wasm / ICC profiles from URLs at
// runtime. Without them, PDFs using predefined CMaps (CJK / Identity-H) or the
// 14 non-embedded standard fonts (common in lab/scanned docs) fail via
// onLoadError. These assets are copied into public/pdfjs/ (see scripts). Paths
// are derived from Vite's BASE_URL and MUST end in a trailing slash.
const PDF_ASSET_BASE = `${import.meta.env.BASE_URL}pdfjs/`;

export interface PdfViewerProps {
  file: string | File | Blob;
  zoom: number;
  rotate: number;
  onZoomChange?: (z: number) => void;
  onRotateChange?: (r: number) => void;
  httpHeaders?: Record<string, string>;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ file, zoom, rotate, onZoomChange, onRotateChange, httpHeaders }) => {
  const { t } = useTranslation('pdfViewer');
  const [numPages, setNumPages] = React.useState<number>(0);
  const [pageNumber, setPageNumber] = React.useState<number>(1);
  const mainRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(800);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showThumbs, setShowThumbs] = React.useState(!isMobile);

  // Memoize options to prevent unnecessary Document reloads.
  // isEvalSupported:false hardens pdf.js against the "arbitrary JS execution on
  // opening a malicious PDF" class of issues (it disables the eval-based code
  // path) — important since we render patient-uploaded PDFs.
  const documentOptions = React.useMemo(
    () => ({
      isEvalSupported: false,
      // Lab/scanned PDFs commonly embed DeviceCMYK colors and ICC profiles that
      // pdf.js can't init; it falls back correctly but logs a `warn()` per object
      // from the worker, flooding the console with thousands of stack frames.
      // ERRORS verbosity silences those non-fatal warnings (true errors still log).
      verbosity: pdfjs.VerbosityLevel.ERRORS,
      cMapUrl: `${PDF_ASSET_BASE}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${PDF_ASSET_BASE}standard_fonts/`,
      wasmUrl: `${PDF_ASSET_BASE}wasm/`,
      iccUrl: `${PDF_ASSET_BASE}iccs/`,
      // Auth now lives in the httpOnly session cookie, so pdf.js must send
      // credentials when it fetches the PDF URL from our API. The old
      // `Authorization: Bearer <localStorage token>` header is dead (the token
      // is no longer stored client-side) — cookies replace it.
      withCredentials: true,
      ...(httpHeaders ? { httpHeaders } : {}),
    }),
    [httpHeaders],
  );

  React.useEffect(() => {
    setShowThumbs(!isMobile);
  }, [isMobile]);

  React.useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [showThumbs]);

  const handleLoadSuccess = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setPageNumber((prev) => Math.min(prev || 1, n));
  };

  const decPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const incPage = () => setPageNumber((p) => Math.min(numPages || 1, p + 1));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: (t) => (t.palette.mode === 'light' ? '#f7f9fb' : 'background.default') }}>
      {/* Toolbar */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 0.5, sm: 1 }}
        sx={{ px: { xs: 0.5, sm: 1.5 }, py: 0.75, flexWrap: 'nowrap', minWidth: 0 }}
      >
        {/* Toggle thumbnails */}
        <Tooltip title={showThumbs ? t('hideThumbnails') : t('showThumbnails')}>
          <IconButton size="small" onClick={() => setShowThumbs((v) => !v)} color={showThumbs ? 'primary' : 'default'}>
            <ViewSidebarIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Page navigation */}
        <Tooltip title={t('previousPage')}>
          <span>
            <IconButton size="small" onClick={decPage} disabled={pageNumber <= 1}>
              <NavigateBeforeIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <TextField
          size="small"
          value={pageNumber}
          onChange={(e) => {
            const v = parseInt(e.target.value || '1', 10);
            if (Number.isFinite(v)) setPageNumber(Math.max(1, Math.min(numPages || 1, v)));
          }}
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', style: { width: isMobile ? 32 : 48, textAlign: 'center' as const, padding: isMobile ? '4px 2px' : undefined } }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>/ {numPages || 1}</Typography>
        <Tooltip title={t('nextPage')}>
          <span>
            <IconButton size="small" onClick={incPage} disabled={pageNumber >= (numPages || 1)}>
              <NavigateNextIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Box sx={{ flex: 1 }} />

        {/* Zoom controls */}
        <Tooltip title="Zoom -">
          <span>
            <IconButton size="small" onClick={() => onZoomChange?.(Math.max(0.5, +(zoom - 0.1).toFixed(2)))}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {!isMobile && (
          <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</Typography>
        )}
        <Tooltip title="Zoom +">
          <span>
            <IconButton size="small" onClick={() => onZoomChange?.(Math.min(3, +(zoom + 0.1).toFixed(2)))}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('fitWidth')}>
          <span>
            <IconButton size="small" onClick={() => onZoomChange?.(1)}>
              <FitScreenIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('rotate90')}>
          <span>
            <IconButton size="small" onClick={() => onRotateChange?.((rotate + 90) % 360)}>
              <RotateRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Viewer area */}
      <Box sx={{ flex: 1, overflow: 'hidden', pb: 0 }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Thumbnails rail */}
          {showThumbs && (
            <Box
              sx={{
                width: { xs: 80, sm: 140 },
                flexShrink: 0,
                overflowY: 'auto',
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: (t) => (t.palette.mode === 'light' ? '#f3f5f7' : 'background.default'),
                p: 0.75,
              }}
            >
              <Document
                file={file}
                onLoadSuccess={handleLoadSuccess}
                onItemClick={({ pageNumber: p }) => setPageNumber(p)}
                loading={<Typography sx={{ p: 1 }} variant="caption">…</Typography>}
                options={documentOptions}
              >
                {Array.from({ length: numPages || 0 }, (_, i) => (
                  <Box
                    key={`thumb_${i + 1}`}
                    onClick={() => setPageNumber(i + 1)}
                    sx={{
                      cursor: 'pointer',
                      mb: 0.75,
                      borderRadius: 1,
                      overflow: 'hidden',
                      outline: pageNumber === i + 1 ? '2px solid #1976d2' : '2px solid transparent',
                      boxShadow: 1,
                      bgcolor: '#fff',
                    }}
                  >
                    <Thumbnail pageNumber={i + 1} width={isMobile ? 68 : 120} />
                  </Box>
                ))}
              </Document>
            </Box>
          )}

          {/* Main page area */}
          <Box ref={mainRef} sx={{ flex: 1, overflow: 'auto', px: { xs: 0.5, sm: 2 }, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ bgcolor: '#fff', borderRadius: 1, boxShadow: 2, overflow: 'hidden', maxWidth: '100%' }}>
                <Document
                  file={file}
                  onLoadSuccess={handleLoadSuccess}
                  onLoadError={(e) => console.error('PDF load error:', e)}
                  onItemClick={({ pageNumber: p }) => setPageNumber(p)}
                  loading={<Typography sx={{ p: 2 }}>{t('loading')}</Typography>}
                  options={documentOptions}
                >
                  <Page
                    pageNumber={pageNumber}
                    width={Math.max(280, Math.min(1400, Math.floor(containerWidth * zoom)))}
                    rotate={rotate}
                    renderAnnotationLayer
                    renderTextLayer
                  />
                </Document>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
