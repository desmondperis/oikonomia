/* Tests for the spoken-expense reader.
 *
 * Every case here is a phrase a real person might actually say into a phone.
 * When voice entry gets something wrong, add the phrase here first, then fix it.
 */

import { parseExpense } from '../public/nlp.js';

const cases = [
  // phrase                          rupees   note                 confidence
  ['Had burger 250',                    250,  'Burger',            'high'],
  ['Took a cab 170',                    170,  'Cab',               'high'],
  ['Milk 80',                            80,  'Milk',              'high'],
  ['School books 850',                  850,  'School books',      'high'],
  ['Dinner with family 900',            900,  'Dinner with family','high'],
  ['spent 1200 on groceries',          1200,  'Groceries',         'high'],
  ['paid 450 rupees for medicine',      450,  'Medicine',          'high'],
  ['₹250 swiggy',                       250,  'Swiggy',            'high'],
  ['rs 60 auto',                         60,  'Auto',              'high'],
  ['petrol 1,250',                     1250,  'Petrol',            'high'],
  ['recharge 239.50',               239.50,   'Recharge',          'high'],
  ['2k rent advance',                  2000,  'Rent advance',      'high'],
  ['1.5 lakh school fees',           150000,  'School fees',       'high'],

  // spoken numbers
  ['milk eighty rupees',                 80,  'Milk',              'medium'],
  ['cab two fifty',                     250,  'Cab',               'medium'],
  ['two hundred fifty for lunch',       250,  'Lunch',             'medium'],
  ['one lakh for the wedding',       100000,  'Wedding',           'medium'],
  ['eighty five rupees vegetables',      85,  'Vegetables',        'medium'],

  // several numbers — the price is the marked one, or the last
  ['2 dosa 120',                        120,  '2 dosa',            'medium'],
  ['3 shirts rs 1500',                 1500,  '3 shirts',          'high'],

  // currency stuck to the number, as phone dictation and Indian receipts write it
  ['burger 350rs',                      350,  'Burger',            'high'],
  ['350/- vegetables',                  350,  'Vegetables',        'high'],
  ['rs1200 groceries',                 1200,  'Groceries',         'high'],
  ['medicine 89.50rs',                89.50,  'Medicine',          'high'],

  // Hindi — amounts and descriptions, in both Devanagari and Latin digits.
  // Hindi number words ("तीन सौ") belong with the Hindi version of the app.
  ['सब्जी ३५० रुपये',                    350,  'सब्जी',              'high'],
  ['दूध 80 रुपये',                        80,  'दूध',               'high'],
  ['ऑटो 60 रु',                           60,  'ऑटो',               'high'],

  // nothing usable
  ['groceries',                        null,  'Groceries',         'none'],
  ['',                                 null,  '',                  'none']
];

/* Phrases as the phone actually dictates them — where a spoken word arrives as
   a digit. These are only corrected for speech, never for typing. */
const spokenCases = [
  // phrase                          rupees   note
  ['8 burgers for 350rs',               350,  'Burgers'],
  ['8 a burger for 350 rs',             350,  'Burger'],
  ['4 milk 80 rupees',                   80,  'Milk'],
  ['2 samosa 40rs',                      40,  'Samosa'],
  // a genuine quantity must survive when it is not opening the phrase
  ['bought 3 shirts rs 1500',          1500,  '3 shirts']
];

let failed = 0;

for (const [phrase, rupees, note, confidence] of cases) {
  const result = parseExpense(phrase);
  const expectedPaise = rupees === null ? null : Math.round(rupees * 100);

  const problems = [];
  if (result.paise !== expectedPaise) {
    problems.push(`amount ${result.paise} (expected ${expectedPaise})`);
  }
  if (result.note !== note) {
    problems.push(`note "${result.note}" (expected "${note}")`);
  }
  if (result.confidence !== confidence) {
    problems.push(`confidence ${result.confidence} (expected ${confidence})`);
  }

  if (problems.length > 0) {
    failed++;
    console.error(`  ✗ "${phrase}"`);
    for (const problem of problems) console.error(`      ${problem}`);
  }
}

for (const [phrase, rupees, note] of spokenCases) {
  const result = parseExpense(phrase, { spoken: true });
  const expectedPaise = Math.round(rupees * 100);

  const problems = [];
  if (result.paise !== expectedPaise) {
    problems.push(`amount ${result.paise} (expected ${expectedPaise})`);
  }
  if (result.note !== note) {
    problems.push(`note "${result.note}" (expected "${note}")`);
  }

  if (problems.length > 0) {
    failed++;
    console.error(`  ✗ spoken: "${phrase}"`);
    for (const problem of problems) console.error(`      ${problem}`);
  }
}

const total = cases.length + spokenCases.length;

if (failed > 0) {
  console.error(`\n${failed} of ${total} phrases were misread.\n`);
  process.exit(1);
}

console.log(`✓ ${total} phrases read correctly.`);
