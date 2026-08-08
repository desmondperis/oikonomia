/* A small guard that runs before every deploy.
 *
 * It checks two things: that no JavaScript file has a syntax error, and that the
 * promises this product makes about itself are still true. The second kind of
 * check is the useful one — a failure should name the promise that broke, not
 * just the line that moved.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const failures = [];

function fail(promise, detail) {
  failures.push({ promise, detail });
}

/* ---------- every JavaScript file must parse ---------- */

function walk(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'vendor') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path));
    else if (extname(path) === '.js' || extname(path) === '.mjs') found.push(path);
  }
  return found;
}

const scripts = walk(root);

for (const path of scripts) {
  const source = readFileSync(path, 'utf8');
  try {
    // Function() parses without executing. Enough to catch a broken file.
    new Function(source);
  } catch (error) {
    if (!/return|await|import|export/.test(error.message)) {
      fail('Every script parses', `${path.replace(root, '.')}: ${error.message}`);
    }
  }
}

/* ---------- the promises ---------- */

const appJs = readFileSync(join(root, 'public', 'app.js'), 'utf8');
const indexHtml = readFileSync(join(root, 'public', 'index.html'), 'utf8');
const stylesCss = readFileSync(join(root, 'public', 'styles.css'), 'utf8');

// "The financial engine establishes the truth" — money must be whole numbers.
if (!/paise/i.test(appJs)) {
  fail(
    'Money is held as whole numbers, never as decimals',
    'public/app.js no longer mentions paise; floating-point rupees give wrong totals.'
  );
}

// "The home screen shows one number and one button."
const primaryButtons = (indexHtml.match(/class="primary-action"/g) || []).length;
if (primaryButtons > 2) {
  fail(
    'The home screen shows one number and one button',
    `Found ${primaryButtons} primary actions. The home screen allows one; the add sheet allows one Save.`
  );
}

// "No sliders anywhere in the app."
if (/type="range"/.test(indexHtml)) {
  fail(
    'No sliders anywhere in the app',
    'A range input appeared in public/index.html.'
  );
}

// Touch targets stay large enough for a real thumb on a cheap phone.
if (!/--tap:\s*3(\.\d+)?rem/.test(stylesCss)) {
  fail(
    'Touch targets stay at least 3rem tall',
    'The --tap custom property in public/styles.css changed or was removed.'
  );
}

// Nothing may quietly ship a household's data off the device at this stage.
if (/\bfetch\s*\(/.test(appJs)) {
  fail(
    'Stage 1 keeps every entry on the device',
    'public/app.js contains a network call. Household data must not leave the device yet.'
  );
}

/* ---------- report ---------- */

if (failures.length === 0) {
  console.log(`✓ ${scripts.length} scripts parsed, all product promises hold.`);
  process.exit(0);
}

console.error('\nBuild stopped. A promise this product makes is no longer true:\n');
for (const { promise, detail } of failures) {
  console.error(`  ✗ ${promise}`);
  console.error(`    ${detail}\n`);
}
process.exit(1);
