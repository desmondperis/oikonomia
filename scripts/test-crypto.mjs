/* Tests for the household key.
 *
 * These matter more than most. If sealing is wrong, a household's records are
 * readable by someone who should not read them. If unsealing is wrong, they are
 * readable by nobody at all — including the household — and there is no way
 * back from that.
 */

import {
  newPhrase, tidyPhrase, phraseLooksRight, unknownWords,
  deriveKey, seal, unseal, makeCheck, checkPasses
} from '../public/crypto.js';

let failed = 0;
let checks = 0;

function check(label, actual, expected) {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failed++;
    console.error(`  ✗ ${label}`);
    console.error(`      got      ${a}`);
    console.error(`      expected ${e}`);
  }
}

/* ---------- the phrase ---------- */

{
  const phrase = newPhrase();
  const words = phrase.split(' ');

  check('a phrase is twelve words', words.length, 12);
  check('and every word is one we know', phraseLooksRight(phrase), true);

  // Two phrases in a row must not match. If they do, the randomness is broken
  // and every household would share a key.
  const others = new Set();
  for (let index = 0; index < 200; index++) others.add(newPhrase());
  check('every phrase generated is different', others.size, 200);
}

{
  check('spacing and capitals do not matter',
    tidyPhrase('  Apple   BREAD\n cedar  '), 'apple bread cedar');

  check('a phrase of the wrong length is refused', phraseLooksRight('apple bread cedar'), false);
  check('a made-up word is refused', phraseLooksRight(
    'apple bread cedar dawn eagle fabric garden hammer island jacket ladder xyzzy'), false);
  check('and it says which word', unknownWords(
    'apple bread cedar dawn eagle fabric garden hammer island jacket ladder xyzzy'), ['xyzzy']);
}

/* ---------- sealing ---------- */

const PHRASE = 'apple bread cedar dawn eagle fabric garden hammer island jacket ladder lemon';

{
  const key = await deriveKey(PHRASE, 'PERIS19');

  const record = { id: 'x1', paise: 62000, note: 'SWIGGY', at: 1767225600000 };
  const sealed = await seal(key, record);

  check('what is stored is not the record', JSON.stringify(sealed).includes('SWIGGY'), false);
  check('nor is the amount visible', JSON.stringify(sealed).includes('62000'), false);

  const opened = await unseal(key, sealed);
  check('the household gets its record back', opened, record);
}

{
  // The same phrase in the same household always gives the same key.
  const one = await deriveKey(PHRASE, 'PERIS19');
  const two = await deriveKey(PHRASE, 'PERIS19');

  const sealed = await seal(one, { note: 'RENT' });
  check('a second device with the same phrase can read it',
    await unseal(two, sealed), { note: 'RENT' });
}

{
  // A different household with the same phrase must not share a key.
  const ours = await deriveKey(PHRASE, 'PERIS19');
  const theirs = await deriveKey(PHRASE, 'GUPTA07');

  const sealed = await seal(ours, { note: 'RENT' });
  check('another household cannot read it', await unseal(theirs, sealed), null);
}

{
  const right = await deriveKey(PHRASE, 'PERIS19');
  const wrong = await deriveKey(
    'apple bread cedar dawn eagle fabric garden hammer island jacket ladder lime',
    'PERIS19'
  );

  const sealed = await seal(right, { note: 'RENT' });
  check('one wrong word and it will not open', await unseal(wrong, sealed), null);
}

{
  const key = await deriveKey(PHRASE, 'PERIS19');

  // Tampering must be detected rather than producing rubbish.
  const sealed = await seal(key, { paise: 62000 });
  const meddled = { iv: sealed.iv, body: sealed.body.slice(0, -4) + 'AAAA' };

  check('a meddled record does not open', await unseal(key, meddled), null);
}

{
  const key = await deriveKey(PHRASE, 'PERIS19');

  // Sealing the same thing twice must not produce the same bytes, or an
  // onlooker could tell which records repeat.
  const first = await seal(key, { note: 'RENT' });
  const second = await seal(key, { note: 'RENT' });

  check('the same record seals differently each time', first.body === second.body, false);
}

/* ---------- proving the phrase ---------- */

{
  const key = await deriveKey(PHRASE, 'PERIS19');
  const wrong = await deriveKey(
    'lemon ladder jacket island hammer garden fabric eagle dawn cedar bread apple',
    'PERIS19'
  );

  const token = await makeCheck(key);

  check('the right phrase is recognised', await checkPasses(key, token), true);
  check('a wrong phrase is caught at once', await checkPasses(wrong, token), false);
  check('and a missing token is not treated as a pass', await checkPasses(key, null), false);
}

/* ---------- report ---------- */

if (failed > 0) {
  console.error(`\n${failed} of ${checks} key checks failed.\n`);
  process.exit(1);
}

console.log(`✓ ${checks} household key checks passed.`);
