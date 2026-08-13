/* Give each stewardship principle a key, so both languages can say it.
 *
 * The passages keep their English text and their reference. Rendering decides
 * what to do with that: in English the words are quoted; in Hindi only the
 * reference is given, because translating Scripture is a translator's work and
 * an improvised rendering would be worse than none.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'framework.js');

let source = readFileSync(file, 'utf8');

const KEYS = {
  ownership: 'pr.ownership',
  provision: 'pr.provision',
  planning: 'pr.planning',
  debt: 'pr.debt',
  preparedness: 'pr.preparedness',
  contentment: 'pr.contentment',
  generosity: 'pr.generosity',
  work: 'pr.work'
};

let added = 0;

for (const [id, key] of Object.entries(KEYS)) {
  const marker = `    id: '${id}',`;
  if (!source.includes(marker) || source.includes(`${marker}\n    key: `)) continue;
  source = source.replace(marker, `${marker}\n    key: '${key}',`);
  added++;
}

writeFileSync(file, source, 'utf8');
console.log(`✓ ${added} principles given a key`);
