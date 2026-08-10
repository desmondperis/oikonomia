/* Copy the pinned reading libraries into public/vendor.
 *
 * They are served from our own origin rather than someone else's, so the app
 * keeps working offline and no third party ever learns that a household opened
 * a bank statement.
 *
 * The text reader is loaded only when somebody opens a PDF. The scanned-page
 * reader is far larger and is loaded only when a PDF turns out to have no text
 * in it at all — most households will never download it.
 */

import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = join(root, 'node_modules');
const to = join(root, 'public', 'vendor');

const FILES = [
  // Reading a PDF that contains real text.
  ['pdfjs-dist/build/pdf.min.mjs', 'pdf.min.mjs'],
  ['pdfjs-dist/build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'],

  // Reading a spreadsheet. Indian banks all call their download "Excel" and
  // mean three different things by it, so the full reader is needed: real old
  // Excel files, modern ones, and HTML tables wearing an .xls name.
  ['xlsx/xlsx.mjs', 'xlsx.mjs'],

  // Hearing an expense without the recording leaving the phone. The library is
  // ours; the model weights are fetched from Hugging Face when somebody turns
  // this on, because a file that size cannot be served from our own hosting.
  // The bundled build, not the "web" one: that names its dependencies rather
  // than including them, and a browser loading it directly cannot resolve them.
  ['@huggingface/transformers/dist/transformers.min.js', 'transformers.min.js'],

  // Reading a scanned page, character by character.
  ['tesseract.js/dist/tesseract.esm.min.js', 'tesseract.esm.min.js'],
  ['tesseract.js/dist/worker.min.js', 'tesseract-worker.min.js'],
  // The reader chooses one of these at runtime according to what the phone's
  // browser supports. All three are kept so whichever it picks is there; only
  // the chosen one is ever downloaded.
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],

  // The English model. The compact one: accurate enough for printed bank
  // statements, and a third the size of the full one on a metered connection.
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz']
];

mkdirSync(to, { recursive: true });

let total = 0;
const missing = [];

for (const [from, name] of FILES) {
  const source = join(modules, from);
  if (!existsSync(source)) { missing.push(from); continue; }
  copyFileSync(source, join(to, name));
  total += statSync(source).size;
}

if (missing.length > 0) {
  console.error('Missing from node_modules — run npm install:\n  ' + missing.join('\n  '));
  process.exit(1);
}

console.log(`✓ reading libraries copied into public/vendor (${FILES.length} files, ${Math.round(total / 1024 / 1024)} MB)`);
