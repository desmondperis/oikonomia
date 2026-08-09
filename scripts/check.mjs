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
const indexHtml = readFileSync(join(root, 'public', 'app.html'), 'utf8');
const landingHtml = readFileSync(join(root, 'public', 'index.html'), 'utf8');
const stylesCss = readFileSync(join(root, 'public', 'styles.css'), 'utf8');

// "The financial engine establishes the truth" — money must be whole numbers.
if (!/paise/i.test(appJs)) {
  fail(
    'Money is held as whole numbers, never as decimals',
    'public/app.js no longer mentions paise; floating-point rupees give wrong totals.'
  );
}

// "The home screen shows one number and one button."
const home = /<section id="home"[^>]*>([\s\S]*?)<\/section>\s*<!-- Plan -->/.exec(indexHtml);
if (!home) {
  fail('The home screen shows one number and one button', 'The home panel was not found in public/app.html.');
} else {
  const homeButtons = (home[1].match(/<button\b/g) || []).length;
  const homeFigures = (home[1].match(/class="headline-figure"/g) || []).length;
  if (homeButtons !== 1) {
    fail(
      'The home screen shows one number and one button',
      `The home screen has ${homeButtons} buttons. It is allowed exactly one.`
    );
  }
  if (homeFigures !== 1) {
    fail(
      'The home screen shows one number and one button',
      `The home screen has ${homeFigures} headline figures. It is allowed exactly one.`
    );
  }
}

// "No sliders anywhere in the app."
if (/type="range"/.test(indexHtml)) {
  fail(
    'No sliders anywhere in the app',
    'A range input appeared in public/index.html.'
  );
}

// Anything marked hidden must actually be hidden. A class that sets `display`
// silently defeats the hidden attribute, which once left an overlay covering
// the whole app and swallowing every tap.
if (!/\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(stylesCss)) {
  fail(
    'Anything marked hidden is actually hidden',
    'The [hidden] { display: none !important } rule is missing from public/styles.css. ' +
    'Without it, any class setting `display` leaves hidden elements on screen.'
  );
}

// The mark is the "O". Nothing else may stand in for it.
if (/icon\.svg/.test(indexHtml) || /icon\.svg/.test(landingHtml)) {
  fail(
    'The app uses the Oikonomia mark',
    'A page still references icon.svg, which is not the brand mark.'
  );
}

// Signing in must be offered before anything is asked of anybody.
if (!/\/api\/auth\/google\/start/.test(landingHtml)) {
  fail(
    'The landing page offers a way in',
    'public/index.html no longer links to sign-in.'
  );
}

// A household is entitled to read what it is agreeing to.
for (const page of ['about', 'privacy', 'terms', 'contact']) {
  if (!landingHtml.includes(`/${page}.html`)) {
    fail(
      'The landing page links to what a household needs to read',
      `public/index.html no longer links to ${page}.html.`
    );
  }
}

// The privacy page must keep saying the thing that matters most.
const privacyHtml = readFileSync(join(root, 'public', 'privacy.html'), 'utf8');
if (!/No amount, transaction, balance or budget figure is stored on the\s+server/.test(privacyHtml)) {
  fail(
    'The privacy page states what is never stored',
    'The promise that no financial figure reaches the server has gone from privacy.html. ' +
    'If that stopped being true, the architecture changed and this is the wrong fix.'
  );
}

// Only the three identity permissions are requested at the front door. The
// declared list is what matters, not what the surrounding prose mentions.
const googleJs = readFileSync(join(root, 'functions', 'lib', 'google.js'), 'utf8');
const scopes = /export const SCOPES\s*=\s*\[([^\]]*)\]/.exec(googleJs);

if (!scopes) {
  fail('Sign-in asks for as little as possible', 'No SCOPES list found in functions/lib/google.js.');
} else {
  const asked = scopes[1].match(/'([^']+)'/g)?.map((s) => s.replace(/'/g, '')) || [];
  const allowed = new Set(['openid', 'email', 'profile']);
  const extra = asked.filter((scope) => !allowed.has(scope));

  if (extra.length > 0) {
    fail(
      'Sign-in asks for as little as possible',
      `Sign-in requests ${extra.join(', ')}. Only identity belongs at the front door — ` +
      'Drive access is a separate, later request a household can decline.'
    );
  }
}

// Touch targets stay large enough for a real thumb on a cheap phone.
if (!/--tap:\s*3(\.\d+)?rem/.test(stylesCss)) {
  fail(
    'Touch targets stay at least 3rem tall',
    'The --tap custom property in public/styles.css changed or was removed.'
  );
}

// The assistant may see a shop name and nothing else. If any of these words
// appear in ai.js, something about the household's money is being sent.
const aiJs = readFileSync(join(root, 'public', 'ai.js'), 'utf8');
const FORBIDDEN_IN_PROMPTS = /(?:^|\W)(paise|balance|\.amount|total|income|budget|salary\b(?!\|))/;

const promptSection = aiJs.slice(aiJs.indexOf('categoriseWithAi'));
if (FORBIDDEN_IN_PROMPTS.test(promptSection)) {
  fail(
    'The assistant only ever sees a shop name',
    'public/ai.js mentions household figures where it builds its request. Amounts, dates, ' +
    'balances and totals must never be sent to a model.'
  );
}

// Only the household's own key is ever used, and only from their own device.
if (!/localStorage/.test(aiJs) || /oikonomia\.openrouter\.key[^]*?(?:console\.log|analytics)/.test(aiJs)) {
  fail(
    "The household's key stays on the household's device",
    'public/ai.js no longer keeps the key locally, or logs it.'
  );
}

// Authoritative figures are arithmetic, never asked for.
if (/\bfetch\s*\(/.test(appJs)) {
  fail(
    'Totals are calculated on the device, never fetched',
    'public/app.js makes a network call. Every authoritative figure must be arithmetic ' +
    'done here; anything needing the network belongs in ai.js.'
  );
}

/* ---------- the readers must still read ---------- */

const { spawnSync } = await import('node:child_process');

function runSuite(file, promise) {
  const run = spawnSync(process.execPath, [join(root, 'scripts', file)], {
    encoding: 'utf8'
  });
  if (run.status !== 0) {
    fail(promise, (run.stderr || run.stdout || '').trim());
  }
  return run;
}

const nlp = runSuite('test-nlp.mjs', 'Spoken expenses are read correctly');
const statements = runSuite('test-statements.mjs', 'Bank statements are read correctly');
const engine = runSuite('test-engine.mjs', 'The financial engine calculates correctly');
const keys = runSuite('test-crypto.mjs', "A household's records are sealed to that household");

// The server may never be handed a readable record. If any of these appear in
// what sync sends, something is leaving the device in the clear.
const syncJs = readFileSync(join(root, 'public', 'sync.js'), 'utf8');
if (!/seal\(key,/.test(syncJs) || !/unseal\(key,/.test(syncJs)) {
  fail(
    'Records are sealed before they leave the device',
    'public/sync.js no longer seals what it sends or unseals what it receives.'
  );
}

// The server must have no means of opening what it stores. Comments are
// stripped first, so an explanation of why it cannot is not mistaken for it
// doing so — which is exactly what tripped this check when it was written.
const recordsApi = readFileSync(join(root, 'functions', 'api', 'records', 'index.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/[^\n]*/g, ' ');

if (/crypto\.subtle|deriveKey|decrypt|importKey|PBKDF2/i.test(recordsApi)) {
  fail(
    'The server never holds the means to open a record',
    'functions/api/records/index.js does cryptography. It moves sealed blobs between a ' +
    "household's own devices and must have no way to open one."
  );
}

// Every passage the app can quote must be written down here. Nothing else may
// be cited, which is what stops a model inventing a verse.
const frameworkJs = readFileSync(join(root, 'public', 'framework.js'), 'utf8');
if (!/PRINCIPLES/.test(frameworkJs) || !/World English Bible/.test(frameworkJs)) {
  fail(
    'Scripture is quoted only from the written framework',
    'public/framework.js no longer holds the reviewed set of passages, or its ' +
    'public-domain translation note has gone.'
  );
}

// The engine, not the assistant, produces figures.
const engineJs = readFileSync(join(root, 'public', 'engine.js'), 'utf8');
if (/openrouter|categoriseWithAi|\bfetch\s*\(/i.test(engineJs)) {
  fail(
    'The engine never asks a model for a number',
    'public/engine.js reaches for the assistant. Every authoritative figure must be arithmetic.'
  );
}

// An HTML table wearing an .xls name must not go through the spreadsheet
// reader. Handed 04/07/2026 it decides that is a date, reads it American
// fashion as the seventh of April, and returns a value already wrong — which
// nothing downstream can detect.
const sheetJs = readFileSync(join(root, 'public', 'statements', 'spreadsheet.js'), 'utf8');
if (!/looksLikeHtml/.test(sheetJs) || !/readHtmlTable/.test(sheetJs)) {
  fail(
    'A bank statement dated 04/07 is read as the fourth of July',
    'public/statements/spreadsheet.js no longer routes HTML tables around the spreadsheet ' +
    'reader. Without that, SBI-style exports come back with the day and month swapped.'
  );
}

// A statement is never trusted on its own say-so.
const statementJs = readFileSync(join(root, 'public', 'statements', 'statement.js'), 'utf8');
if (!/verifyAgainstBalance/.test(statementJs)) {
  fail(
    "Every import is checked against the bank's own balance",
    'verifyAgainstBalance has gone from public/statements/statement.js. Without it, a misread ' +
    'amount would be imported silently.'
  );
}

// The password to a protected statement must stay on the device.
const pdfJs = readFileSync(join(root, 'public', 'statements', 'pdf.js'), 'utf8');
if (/localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest/.test(pdfJs)) {
  fail(
    'Statement passwords never leave the device',
    'public/statements/pdf.js stores or transmits something. The password and the file ' +
    'must exist only in memory, for as long as it takes to read them.'
  );
}

/* ---------- report ---------- */

if (failures.length === 0) {
  console.log(`✓ ${scripts.length} scripts parsed, all product promises hold.`);
  console.log((nlp.stdout || '').trim());
  console.log((statements.stdout || '').trim());
  console.log((engine.stdout || '').trim());
  console.log((keys.stdout || '').trim());
  process.exit(0);
}

console.error('\nBuild stopped. A promise this product makes is no longer true:\n');
for (const { promise, detail } of failures) {
  console.error(`  ✗ ${promise}`);
  console.error(`    ${detail}\n`);
}
process.exit(1);
