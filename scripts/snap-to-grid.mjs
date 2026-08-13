/* Put every margin, padding and gap on the eight-point grid.
 *
 * The stylesheet had grown by eye: six pixels here, ten there, fourteen
 * somewhere else. Individually invisible, together it is exactly what makes an
 * interface feel almost right and subtly cheap — nothing lines up with anything
 * else, and the reader cannot say why it looks wrong.
 *
 * Only spacing is touched. Sizes, radii, borders and hairline gaps inside
 * controls are left alone, because those are deliberate.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'styles.css');

/* rem → the nearest step on the grid. Values under half a step are decorative
   (hairlines, optical nudges) and are left as they are. */
const GRID = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

function snap(rem) {
  if (rem < 0.25) return null;
  let best = GRID[0];
  for (const step of GRID) {
    if (Math.abs(step - rem) < Math.abs(best - rem)) best = step;
  }
  return best;
}

const SPACING = /\b(margin|padding|gap|row-gap|column-gap)(-top|-right|-bottom|-left)?\s*:\s*([^;]+);/g;

let css = readFileSync(file, 'utf8');
let changed = 0;

css = css.replace(SPACING, (whole, property, side, value) => {
  // Leave anything clever alone: calc(), var(), env(), auto.
  if (/calc\(|var\(|env\(|auto|%/.test(value)) return whole;

  let touched = false;

  const next = value.replace(/(\d*\.?\d+)rem/g, (match, number) => {
    const rem = Number(number);
    const snapped = snap(rem);
    if (snapped === null || snapped === rem) return match;
    touched = true;
    return `${snapped}rem`;
  });

  if (!touched) return whole;
  changed++;
  return `${property}${side || ''}: ${next};`;
});

writeFileSync(file, css, 'utf8');
console.log(`✓ ${changed} spacing declarations snapped to the grid`);
