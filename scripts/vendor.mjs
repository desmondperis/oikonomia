/* Copy the pinned PDF library into public/vendor.
 *
 * It is served from our own origin rather than someone else's, so the app keeps
 * working offline and no third party ever learns that a household opened a bank
 * statement.
 */

import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'pdfjs-dist', 'build');
const to = join(root, 'public', 'vendor');

const FILES = ['pdf.min.mjs', 'pdf.worker.min.mjs'];

if (!existsSync(from)) {
  console.error('pdfjs-dist is not installed. Run: npm install');
  process.exit(1);
}

mkdirSync(to, { recursive: true });

for (const name of FILES) {
  copyFileSync(join(from, name), join(to, name));
}

console.log(`✓ PDF library copied into public/vendor (${FILES.length} files).`);
