/* Remove test fixtures before a deploy.
 *
 * The generated sample statements live under public/ so a browser can load them
 * during testing. They are invented data, but they have no business being on
 * the household's site, so they are cleared on the way out.
 */

import { rmSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = join(root, 'public', 'test-fixtures');

if (existsSync(fixtures)) {
  rmSync(fixtures, { recursive: true, force: true });
  console.log('✓ test fixtures removed from public/');
} else {
  console.log('✓ no test fixtures to remove');
}
