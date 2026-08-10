/* Tests for changing the plan by saying what you want.
 *
 * Every case is a sentence a household might actually type. The dangerous
 * confusion is "to" against "by" — raising eating out *to* five thousand and
 * raising it *by* five thousand are different instructions, and mixing them up
 * quietly rewrites somebody's grocery budget.
 */

import { readInstruction, categoryIn, amountAfter } from '../public/intent.js';

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

const rupees = (n) => Math.round(n * 100);

/* ---------- everyday words for parts of the plan ---------- */

check('food means groceries', categoryIn('spend less on ration'), 'Groceries');
check('petrol means transport', categoryIn('petrol is costing more'), 'Transport');
check('current bill means bills', categoryIn('the current bill went up'), 'Bills');
check('school means education', categoryIn('school fees next month'), 'Education');
check('emi means the loan', categoryIn('pay more towards the emi'), 'Loan payment');
check('church giving means giving', categoryIn('give more to church'), 'Giving');
check('a category by its own name', categoryIn('increase Eating out'), 'Eating out');
check('a sentence about nothing in particular', categoryIn('we are doing fine'), null);

/* ---------- what the instruction says ---------- */

const CASES = [
  // sentence                                        category        mode     rupees
  ['increase eating out to 5000',                    'Eating out',   'set',    5000],
  ['set groceries to 9000',                          'Groceries',    'set',    9000],
  ['make transport 3000',                            'Transport',    'set',    3000],
  ['increase eating out by 2000',                    'Eating out',   'raise',  2000],
  ['reduce transport by 500',                        'Transport',    'lower',   500],
  ['cut shopping by 1500',                           'Shopping',     'lower',  1500],
  ['we need 15000 for school next month',            'Education',    'set',   15000],
  ['I want to save 10000 every month',               'Savings and investing', 'set', 10000],
  ['put aside 2500 each month',                      'Savings and investing', 'set', 2500],
  ['add 1000 more to groceries',                     'Groceries',    'raise',  1000],
  ['rent is going up to 20000',                      'Rent',         'set',   20000],
  ['spend 500 less on eating out',                   'Eating out',   'lower',   500],
  ['increase giving to 2k',                          'Giving',       'set',    2000],
  ['reduce the emi by one thousand',                 'Loan payment', 'lower',  1000]
];

for (const [sentence, category, mode, amount] of CASES) {
  const read = readInstruction(sentence);

  if (!read) {
    failed++; checks++;
    console.error(`  ✗ "${sentence}" was not understood at all`);
    continue;
  }

  check(`"${sentence}" → part of the plan`, read.category, category);
  check(`"${sentence}" → which way`, read.mode, mode);
  check(`"${sentence}" → how much`, read.paise, rupees(amount));
}

/* ---------- sentences that must not be acted on ---------- */

check('no amount, no change', readInstruction('increase eating out'), null);
check('no category, no change', readInstruction('increase it by 500'), null);
check('an empty sentence', readInstruction(''), null);
check('a question is not an instruction', readInstruction('how much did we spend'), null);

/* ---------- what it comes to ---------- */

{
  const set = readInstruction('set groceries to 9000');
  check('setting replaces the figure', amountAfter(set, rupees(8500)), rupees(9000));

  const raise = readInstruction('increase groceries by 1000');
  check('raising adds to it', amountAfter(raise, rupees(8500)), rupees(9500));

  const lower = readInstruction('reduce groceries by 1000');
  check('lowering takes from it', amountAfter(lower, rupees(8500)), rupees(7500));

  // A household cannot be talked into a negative budget.
  const tooMuch = readInstruction('reduce groceries by 20000');
  check('and never below nothing', amountAfter(tooMuch, rupees(8500)), 0);
}

/* ---------- report ---------- */

if (failed > 0) {
  console.error(`\n${failed} of ${checks} instruction checks failed.\n`);
  process.exit(1);
}

console.log(`✓ ${checks} plan instruction checks passed.`);
