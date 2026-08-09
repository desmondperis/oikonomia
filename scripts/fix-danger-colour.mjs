/* Collapse six copies of "red, but lighter in the dark" into one variable.
 *
 * Each was its own media query, which meant an explicit dark-mode choice could
 * not reach them — they only followed the phone. One variable, set wherever the
 * theme is set, follows both.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'styles.css');

let css = readFileSync(file, 'utf8');

// Declare it alongside the other colours.
css = css.replace(
  '  --gold:       #e39a2e;   /* the gold of the mark */',
  '  --gold:       #e39a2e;   /* the gold of the mark */\n' +
  '  --danger:     #a4442f;   /* something has gone wrong, or is about to */'
);

css = css.replaceAll(
  '  --gold:      #e9a94a;\n  --shadow:    0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.28);',
  '  --gold:      #e9a94a;\n  --danger:    #e59a86;\n  --shadow:    0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.28);'
);

// Remove the per-component overrides and point each at the variable.
const REPLACEMENTS = [
  ['@media (prefers-color-scheme: dark) {\n  .row-danger .row-title { color: #e59a86; }\n}\n\n', ''],
  ['@media (prefers-color-scheme: dark) {\n  .status-bad { color: #e59a86; }\n}\n\n', ''],
  ['@media (prefers-color-scheme: dark) {\n  .plan-over { color: #e59a86; }\n}\n\n', ''],
  ['@media (prefers-color-scheme: dark) {\n  .entry-remove[data-armed="true"] { color: #e59a86; }\n}\n\n', ''],
  ['@media (prefers-color-scheme: dark) {\n  .form-error { color: #e59a86; }\n}\n\n', ''],
  ['@media (prefers-color-scheme: dark) {\n  .delete-action { color: #e59a86; }\n}\n\n', ''],

  ['.row-danger .row-title { color: #a4442f; }', '.row-danger .row-title { color: var(--danger); }'],
  ['.status-bad { color: #a4442f; }', '.status-bad { color: var(--danger); }'],
  ['.plan-over  { color: #a4442f; }', '.plan-over  { color: var(--danger); }'],
  ['  color: #a4442f;\n  background: color-mix(in srgb, #a4442f 12%, transparent);',
   '  color: var(--danger);\n  background: color-mix(in srgb, var(--danger) 12%, transparent);'],
  ['  color: #a4442f;\n}', '  color: var(--danger);\n}'],
  ['.meter-fill[data-state="over"]  { background: #a4442f; }',
   '.meter-fill[data-state="over"]  { background: var(--danger); }']
];

let changed = 0;
for (const [from, to] of REPLACEMENTS) {
  if (css.includes(from)) { css = css.replaceAll(from, to); changed++; }
}

writeFileSync(file, css, 'utf8');

const left = (css.match(/#a4442f|#e59a86/g) || []).length;
console.log(`✓ ${changed} replacements; ${left} hard-coded red values left`);
