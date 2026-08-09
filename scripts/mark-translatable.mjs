/* Mark the interface's fixed words for translation.
 *
 * Run once. It adds data-i18n attributes to public/app.html so every phrase a
 * household reads can be looked up in both languages.
 *
 * Done in Node rather than a shell, because a shell on Windows will happily
 * read a UTF-8 file as something else and turn ₹ and हिन्दी into rubbish — which
 * is exactly what happened the first time.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'app.html');

const PAIRS = [
  // first run
  ['<h2 id="welcome-title" class="welcome-title">Which language will you speak?</h2>',
   '<h2 id="welcome-title" class="welcome-title" data-i18n="welcome.title">Which language would you like?</h2>'],
  ['<p class="welcome-note">For adding expenses with your voice. You can change this any time.</p>',
   '<p class="welcome-note" data-i18n="welcome.note">This changes the whole app, and how it listens when you speak. You can change it any time.</p>'],

  // home
  ['<span aria-hidden="true">+</span> Add expense',
   '<span aria-hidden="true">+</span> <span data-i18n="tab.add">Add expense</span>'],
  ['<span class="add-total-label">Spent</span>',
   '<span class="add-total-label" data-i18n="home.spentShort">Spent</span>'],
  ['<h3 class="dash-heading">This month</h3>',
   '<h3 class="dash-heading" data-i18n="home.thisMonth">This month</h3>'],
  ['<h3 class="dash-heading">Next step</h3>',
   '<h3 class="dash-heading" data-i18n="home.nextStep">Next step</h3>'],
  ['<h3 id="entries-heading" class="dash-heading">Recent</h3>',
   '<h3 id="entries-heading" class="dash-heading" data-i18n="home.recent">Recent</h3>'],
  ['<p id="entries-empty" class="entries-empty">',
   '<p id="entries-empty" class="entries-empty" data-i18n="home.recentEmpty">'],

  // screen titles
  ['<h2 id="plan-title" class="screen-title">Your plan</h2>',
   '<h2 id="plan-title" class="screen-title" data-i18n="plan.title">Your plan</h2>'],
  ['<h2 id="ask-title" class="screen-title">Ask Oikonomia</h2>',
   '<h2 id="ask-title" class="screen-title" data-i18n="ask.title">Ask Oikonomia</h2>'],
  ['<h2 id="records-title" class="screen-title">Bank statements</h2>',
   '<h2 id="records-title" class="screen-title" data-i18n="records.title">Bank statements</h2>'],
  ['<h2 id="more-title" class="screen-title">More</h2>',
   '<h2 id="more-title" class="screen-title" data-i18n="more.title">More</h2>'],

  // tab bar
  ['<span class="tab-label">Home</span>', '<span class="tab-label" data-i18n="tab.home">Home</span>'],
  ['<span class="tab-label">Plan</span>', '<span class="tab-label" data-i18n="tab.plan">Plan</span>'],
  ['<span class="tab-label">Ask</span>',  '<span class="tab-label" data-i18n="tab.ask">Ask</span>'],
  ['<span class="tab-label">More</span>', '<span class="tab-label" data-i18n="tab.more">More</span>'],
  ['data-tab="add" aria-label="Add expense"', 'data-tab="add" data-i18n-aria="tab.add" aria-label="Add expense"'],

  // statements
  ['<strong>Choose statements</strong>', '<strong data-i18n="records.choose">Choose statements</strong>'],
  ['<span>PDF, Excel or CSV, from any Indian bank</span>',
   '<span data-i18n="records.formats">PDF, Excel or CSV, from any Indian bank</span>'],
  ['<span class="field-label">Password</span>',
   '<span class="field-label" data-i18n="records.passwordLabel">Password</span>'],
  ['<button type="button" id="password-submit" class="primary-action">Open statement</button>',
   '<button type="button" id="password-submit" class="primary-action" data-i18n="records.open">Open statement</button>'],
  ['<button type="button" id="password-skip" class="secondary-action full">Skip this one</button>',
   '<button type="button" id="password-skip" class="secondary-action full" data-i18n="records.skip">Skip this one</button>'],
  ['<button type="button" id="import-retry" class="primary-action">Try another file</button>',
   '<button type="button" id="import-retry" class="primary-action" data-i18n="records.tryAnother">Try another file</button>'],

  // more
  ['<h3 class="section-heading">Your household</h3>', '<h3 class="section-heading" data-i18n="more.household">Your household</h3>'],
  ['<h3 class="section-heading">The assistant</h3>',  '<h3 class="section-heading" data-i18n="more.assistant">The assistant</h3>'],
  ['<h3 class="section-heading">Preferences</h3>',    '<h3 class="section-heading" data-i18n="more.preferences">Preferences</h3>'],
  ['<h3 class="section-heading">Your data</h3>',      '<h3 class="section-heading" data-i18n="more.yourData">Your data</h3>'],
  ["<span class=\"row-title\">Oikonomia's assistant</span>",
   "<span class=\"row-title\" data-i18n=\"more.assistantName\">Oikonomia's assistant</span>"],
  ['<span class="row-title">Voice language</span>', '<span class="row-title" data-i18n="more.language">Language</span>'],
  ['<span class="row-note">Used when you speak an expense</span>',
   '<span class="row-note" data-i18n="more.languageNote">Changes the whole app, and how it listens when you speak</span>'],
  ['<span class="field-label">Your OpenRouter key</span>',
   '<span class="field-label" data-i18n="more.keyLabel">Your OpenRouter key</span>'],
  ['<button type="button" id="api-save" class="primary-action">Save and test</button>',
   '<button type="button" id="api-save" class="primary-action" data-i18n="more.saveTest">Save and test</button>'],
  ['<button type="button" id="api-remove" class="secondary-action full" hidden>Remove key</button>',
   '<button type="button" id="api-remove" class="secondary-action full" data-i18n="more.removeKey" hidden>Remove key</button>'],
  ['<span class="row-title">Erase everything on this device</span>',
   '<span class="row-title" data-i18n="more.erase">Erase everything on this device</span>'],
  ['<span class="row-note">Records, plan, categories and key</span>',
   '<span class="row-note" data-i18n="more.eraseNote">Records, plan, categories and key</span>'],
  ['<span class="row-title">Sign out</span>', '<span class="row-title" data-i18n="more.signOut">Sign out</span>'],

  // adding an expense
  ['<button type="submit" id="save-button" class="primary-action">Save</button>',
   '<button type="submit" id="save-button" class="primary-action" data-i18n="add.save">Save</button>'],
  ['<button type="button" id="cancel-button" class="secondary-action">Cancel</button>',
   '<button type="button" id="cancel-button" class="secondary-action" data-i18n="add.cancel">Cancel</button>'],
  ['<span class="field-label">How much?</span>', '<span class="field-label" data-i18n="add.howMuch">How much?</span>'],
  ['<span class="field-label">What was it?</span>', '<span class="field-label" data-i18n="add.whatWas">What was it?</span>'],
  ['<span id="voice-label">Say it instead</span>', '<span id="voice-label" data-i18n="add.speak">Say it instead</span>'],
  ['<label for="language">Speaking in</label>', '<label for="language" data-i18n="add.speakingIn">Speaking in</label>'],
  ['<span>or type it</span>', '<span data-i18n="add.orType">or type it</span>'],
  ['placeholder="Milk, cab, school books…"',
   'data-i18n-placeholder="add.placeholder" placeholder="Milk, cab, school books…"'],
  ['placeholder="How are we doing this month?"',
   'data-i18n-placeholder="ask.placeholder" placeholder="How are we doing this month?"'],
  ['<button type="button" id="erase-all" class="row row-action row-danger">',
   '<button type="button" id="erase-all" class="row row-action row-danger">'],

  // load the words before anything else needs them
  ['<script type="module" src="app.js"></script>',
   '<script type="module" src="app.js"></script>']
];

let text = readFileSync(file, 'utf8');

const missed = [];
let done = 0;

for (const [from, to] of PAIRS) {
  if (from === to) continue;
  if (text.includes(from)) { text = text.replaceAll(from, to); done++; }
  else missed.push(from.slice(0, 70));
}

writeFileSync(file, text, 'utf8');

console.log(`✓ ${done} phrases marked for translation`);
if (missed.length > 0) {
  console.log('not found:');
  for (const line of missed) console.log('  ' + line);
}
