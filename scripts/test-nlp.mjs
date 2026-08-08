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

  // nothing usable
  ['groceries',                        null,  'Groceries',         'none'],
  ['',                                 null,  '',                  'none']
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

if (failed > 0) {
  console.error(`\n${failed} of ${cases.length} spoken phrases were misread.\n`);
  process.exit(1);
}

console.log(`✓ ${cases.length} spoken phrases read correctly.`);
