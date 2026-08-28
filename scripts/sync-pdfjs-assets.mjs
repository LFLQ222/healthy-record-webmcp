// Copies the pdf.js runtime assets (CMaps, standard fonts, wasm, ICC profiles)
// into public/pdfjs/ so PdfViewer can load them at runtime. Runs on postinstall.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pdfjs-dist');
const dst = join(root, 'public', 'pdfjs');

if (!existsSync(src)) {
  console.warn('[sync-pdfjs-assets] pdfjs-dist not installed yet, skipping');
  process.exit(0);
}

rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });

for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  const from = join(src, dir);
  if (existsSync(from)) {
    cpSync(from, join(dst, dir), { recursive: true });
    console.log(`[sync-pdfjs-assets] copied ${dir}`);
  }
}
