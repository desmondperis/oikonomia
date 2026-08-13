/* Find text a household would read that has not been offered in both languages.
 *
 * Looks for English sentences sitting in the code rather than behind t(), and
 * for phrases marked in the pages that have no translation. Comments are
 * stripped first, since prose explaining the code is not prose anybody reads on
 * a screen.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

/* Files whose words a household actually reads. */
const SCREENS = [
  'survey.js', 'plan.js', 'ask.js', 'import.js', 'shell.js',
  'progress.js', 'allocate.js', 'budget.js', 'phrase.js', 'app.js'
];

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/[^\n]*$/gm, ' ');
}

/* A string is worth flagging if it reads like a sentence: several words, at
   least one of them long, and not obviously a key, class name or identifier. */
function looksLikeProse(text) {
  if (text.length < 14) return false;
  if (/^[a-z-]+(\.[a-z-]+)+$/i.test(text)) return false;      // a key
  if (/^[a-z-]+( [a-z-]+)*$/.test(text) && text.length < 20) return false;
  if (/[<>{}/\\]|^\s|=|\bhttps?:/.test(text)) return false;
  if (!/\s/.test(text)) return false;

  const words = text.split(/\s+/);
  return words.length >= 3 && words.some((word) => /^[A-Za-z]{5,}$/.test(word));
}

const findings = [];

for (const name of SCREENS) {
  let source;
  try { source = withoutComments(readFileSync(join(publicDir, name), 'utf8')); }
  catch { continue; }

  const strings = [...source.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)]
    .map((match) => match[2])
    .filter(looksLikeProse);

  const untranslated = strings.filter((text) => {
    // Already going through the words file if it appears inside t('...')
    const inT = new RegExp(`t\\(\\s*['"\`][^'"\`]*['"\`][^)]*\\)[^;]{0,80}${
      text.slice(0, 12).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    return !inT.test(source);
  });

  if (untranslated.length > 0) {
    findings.push({ name, count: untranslated.length, samples: untranslated.slice(0, 40) });
  }
}

/* Phrases marked up in the pages must exist in the words file. */
const words = readFileSync(join(publicDir, 'i18n.js'), 'utf8');
const known = new Set([...words.matchAll(/'([a-z]+\.[A-Za-z0-9.]+)'\s*:/g)].map((m) => m[1]));

const missing = new Set();
for (const page of ['app.html']) {
  const html = readFileSync(join(publicDir, page), 'utf8');
  for (const [, key] of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) {
    if (!known.has(key)) missing.add(`${page}: ${key}`);
  }
}

/* Every phrase must have both languages filled in. */
const halfDone = [...words.matchAll(/'([a-z]+\.[A-Za-z0-9.]+)'\s*:\s*\[([^\]]*)\]/g)]
  .filter(([, , pair]) => {
    const parts = pair.split(/','|", "|', "|", '/);
    return parts.length < 2 || /^\s*''\s*$/.test(parts[1] || '');
  })
  .map(([, key]) => key);

console.log('=== phrases used on a page but missing from the words file ===');
console.log(missing.size === 0 ? '  none' : [...missing].map((m) => '  ' + m).join('\n'));

console.log('\n=== phrases with no Hindi ===');
console.log(halfDone.length === 0 ? '  none' : halfDone.map((k) => '  ' + k).join('\n'));

console.log('\n=== English sitting in the code, not behind t() ===');
let total = 0;
for (const found of findings) {
  console.log(`\n  ${found.name} — ${found.count}`);
  for (const sample of found.samples) {
    console.log('    ' + JSON.stringify(sample.slice(0, 96)));
  }
  total += found.count;
}
console.log(`\ntotal: ${total}`);
