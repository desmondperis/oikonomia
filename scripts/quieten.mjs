/* Stop the interface shouting.
 *
 * Seven all-caps letter-spaced labels render on the home screen at once:
 * GOOD EVENING · AUGUST, LEFT FOR THIS MONTH, SPENT, DAY STREAK, POINTS,
 * WELL WITHIN PLAN, THIS MONTH. Each looked deliberate on its own. Together
 * they read like a control panel, and all-caps is measurably slower to read —
 * which matters most for the people this is for.
 *
 * A label earns its place by being quiet and getting out of the way. Rank
 * comes from size, weight and colour, which are already doing the work.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'styles.css');

let css = readFileSync(file, 'utf8');
let removed = 0;

/* Drop the uppercase, and the wide letter-spacing that only exists to make
   uppercase legible. Everything else about the rule stays. */
css = css.replace(/\n[ \t]*text-transform:\s*uppercase;/g, () => {
  removed++;
  return '';
});

css = css.replace(/\n[ \t]*letter-spacing:\s*\.(0[46]|08|1)e?m?[^;]*;/g, '');

writeFileSync(file, css, 'utf8');
console.log(`✓ ${removed} shouting labels quietened`);
