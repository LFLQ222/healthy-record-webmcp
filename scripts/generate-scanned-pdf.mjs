/**
 * Generates public/documents/doc-lab-3.pdf — the "scanned" lab report for the
 * April 2025 study. Deterministic (seeded noise), values match the
 * `lab_results` rows in src/mock/db.ts exactly. Run: node scripts/generate-scanned-pdf.mjs
 *
 * Every name on the letterhead is synthetic.
 */
import { jsPDF } from 'jspdf';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'documents');
mkdirSync(out, { recursive: true });

// Seeded LCG so the "scan noise" is identical on every run.
let seed = 20250422;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
const W = pdf.internal.pageSize.getWidth();
const H = pdf.internal.pageSize.getHeight();

// Scanned-paper tint, slightly warm, with a darker top edge.
pdf.setFillColor(246, 244, 238);
pdf.rect(0, 0, W, H, 'F');
pdf.setFillColor(228, 225, 216);
pdf.rect(0, 0, W, 8, 'F');

// Scanner streak artifact down the right side.
pdf.setFillColor(210, 207, 199);
pdf.rect(W - 14, 0, 2.4, H, 'F');

// Letterhead (synthetic laboratory).
pdf.setFont('courier', 'bold');
pdf.setFontSize(13);
pdf.setTextColor(60, 60, 64);
pdf.text('LABORATORIO CLINICO BUGAMBILIAS S.A. DE C.V.', 58, 64, { angle: 0.6 });
pdf.setFont('courier', 'normal');
pdf.setFontSize(8.5);
pdf.text('Av. de las Torres 1841-B, Col. Centro, Hermosillo, Son.  Tel. 662-000-1841', 58, 78, { angle: 0.6 });
pdf.text('Responsable sanitario: QFB S. Duarte M.  Ced. Prof. 0000000  Aviso func. 25-XX-99', 58, 89, { angle: 0.6 });
pdf.setDrawColor(120, 118, 112);
pdf.setLineWidth(1.1);
pdf.line(54, 98, W - 60, 96);

// Patient block, typewriter style, slightly rotated like a skewed scan.
const A = 0.6; // degrees
pdf.setFontSize(9.5);
pdf.setTextColor(52, 52, 56);
const L = 58;
let y = 118;
const line = (txt, dy = 13) => {
  pdf.text(txt, L, y, { angle: A });
  y += dy;
};
line('PACIENTE: RAMIREZ IBARRA ERNESTO             EDAD: 60 A   SEXO: M');
line('FOLIO: 2504-1187      FECHA DE TOMA: 22/ABR/2025 08:40    AYUNO: SI');
line('MEDICO: DR. HERRERA CANTU A.                 CTA: PARTICULAR');
y += 4;

const section = (title) => {
  y += 6;
  pdf.setFont('courier', 'bold');
  line(title, 14);
  pdf.setFont('courier', 'normal');
  pdf.text('ANALITO                    RESULTADO      UNIDADES     VALORES REF.', L, y, { angle: A });
  y += 6;
  pdf.text('-------------------------------------------------------------------', L, y, { angle: A });
  y += 12;
};
const row = (name, value, unit, ref, flag) => {
  const txt =
    name.padEnd(27) + String(value).padEnd(15) + unit.padEnd(13) + ref + (flag ? '   (*)' : '');
  pdf.text(txt, L, y, { angle: A });
  y += 12.5;
};

section('QUIMICA SANGUINEA');
row('GLUCOSA', '135', 'mg/dL', '70 - 100', true);
row('HEMOGLOBINA GLUCOSILADA', '7.4', '%', '4.0 - 5.6', true);
row('CREATININA', '1.31', 'mg/dL', '0.6 - 1.2', true);
row('UREA', '48', 'mg/dL', '17 - 43', true);
row('BUN', '22.4', 'mg/dL', '7 - 20', true);

section('BIOMETRIA HEMATICA');
row('HEMOGLOBINA', '13.8', 'g/dL', '13.5 - 17.5', false);
row('LEUCOCITOS', '7.2', '10^3/uL', '4.5 - 11.0', false);
row('PLAQUETAS', '265', '10^3/uL', '150 - 450', false);

section('EXAMEN GENERAL DE ORINA');
row('PROTEINAS', 'INDICIOS', '', 'NEGATIVO', true);
row('GLUCOSA EN ORINA', 'NEGATIVO', '', 'NEGATIVO', false);

y += 10;
pdf.setFontSize(8.5);
line('(*) FUERA DE VALORES DE REFERENCIA', 12);
line('METODO: ESPECTROFOTOMETRIA / IMPEDANCIA. MUESTRA: SUERO / SANGRE TOTAL / ORINA', 12);
line('OBSERVACIONES: SE SUGIERE CORRELACION CLINICA.', 12);

// "RECIBIDO" stamp, rotated, semi-transparent blue-gray like an ink stamp.
pdf.setTextColor(96, 110, 138);
pdf.setFont('courier', 'bold');
pdf.setFontSize(15);
pdf.setDrawColor(96, 110, 138);
pdf.setLineWidth(1.4);
const sx = W - 205;
const sy = 132;
pdf.text('R E C I B I D O', sx, sy, { angle: -7 });
pdf.setFontSize(9);
pdf.text('23 ABR 2025  CONSULTORIO', sx - 2, sy + 13, { angle: -7 });
pdf.roundedRect(sx - 12, sy - 18, 138, 40, 3, 3, 'S');

// Seeded scan specks.
pdf.setFillColor(120, 118, 112);
for (let i = 0; i < 140; i++) {
  const px = 30 + rand() * (W - 60);
  const py = 30 + rand() * (H - 60);
  const r = rand() * 0.9 + 0.2;
  if (rand() > 0.5) pdf.circle(px, py, r, 'F');
}
// A fold shadow across the lower third.
pdf.setDrawColor(214, 211, 203);
pdf.setLineWidth(2.2);
pdf.line(0, H * 0.68, W, H * 0.665);

pdf.setFont('courier', 'normal');
pdf.setFontSize(7.5);
pdf.setTextColor(130, 128, 122);
pdf.text('Pagina 1 de 1 - Documento digitalizado por el consultorio - DEMO: datos 100% sinteticos', 58, H - 30, { angle: 0.4 });

writeFileSync(join(out, 'doc-lab-3.pdf'), Buffer.from(pdf.output('arraybuffer')));
console.log('wrote public/documents/doc-lab-3.pdf');
