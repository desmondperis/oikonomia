/* Four type levels, and nothing too small to read.
 *
 * The stylesheet had nine different font sizes. Past about four, a hierarchy
 * stops being a hierarchy: nothing is clearly more important than anything
 * else, and the screen reads as noise even though every individual choice
 * looked reasonable when it was made.
 *
 * It also had text at eleven and twelve pixels. This app is for people using
 * cheap phones in poor light, some of whom are not confident readers. Nothing
 * they have to read should be below fourteen.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'styles.css');

/* rem → the level it belongs to. */
function level(rem) {
  if (rem >= 2) return null;                    // display sizes: left alone
  if (rem >= 1.125) return 'var(--text-heading)';
  if (rem >= 0.9375) return 'var(--text-body)';
  return 'var(--text-caption)';                 // raises 11px and 12px to 14px
}

let css = readFileSync(file, 'utf8');

const before = new Set();
const after = new Set();
let changed = 0;

css = css.replace(/font-size:\s*([^;]+);/g, (whole, value) => {
  if (/clamp\(|var\(|%|inherit/.test(value)) return whole;

  const match = /^(\d*\.?\d+)rem$/.exec(value.trim());
  if (!match) return whole;

  const rem = Number(match[1]);
  before.add(rem);

  const token = level(rem);
  if (token === null) { after.add(rem); return whole; }

  changed++;
  after.add(token);
  return `font-size: ${token};`;
});

writeFileSync(file, css, 'utf8');

console.log(`✓ ${changed} font sizes mapped onto the scale`);
console.log('  before:', [...before].sort((a, b) => a - b).join(', '));
console.log('  after :', [...after].join(', '));
