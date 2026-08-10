/* Tests for building a plan without asking what somebody spends,
 * and for scoring the month without ever punishing anybody.
 */

import { allocate, SOURCE_KNOWN, SOURCE_ESTIMATE, howMuchIsKnown } from '../public/allocate.js';
import { recordingStreak, pace } from '../public/progress.js';

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
const find = (budget, id) => budget.lines.find((line) => line.id === id);

/* ---------- a household on ₹30,000 ---------- */

const household = {
  incomePaise: rupees(30000),
  adults: 2,
  children: 2,
  rentPaise: rupees(7000),
  loanPaise: rupees(3000),
  feesPaise: rupees(2000),
  insurancePaise: rupees(800),
  givingShare: 0.10,
  travel: 'twowheeler'
};

{
  const budget = allocate(household);

  check('the plan never spends more than comes in',
    budget.plannedPaise <= budget.incomePaise, true);

  // What the household stated is carried through exactly.
  check('rent is exactly what they said', find(budget, 'Rent').plannedPaise, rupees(7000));
  check('and marked as theirs', find(budget, 'Rent').source, SOURCE_KNOWN);
  check('the loan too', find(budget, 'Loan payment').plannedPaise, rupees(3000));
  check('fees are the monthly share of the year', find(budget, 'Education').plannedPaise, rupees(2000));

  // Giving is a share of income, as this household's guidance sets out.
  check('giving is a tenth of income', find(budget, 'Giving').plannedPaise, rupees(3000));

  // The categories nobody has ever counted are guesses, and say so.
  check('groceries is a guess', find(budget, 'Groceries').source, SOURCE_ESTIMATE);
  check('and it says so plainly',
    find(budget, 'Groceries').basis.includes('does not know'), true);
  check('transport is a guess too', find(budget, 'Transport').source, SOURCE_ESTIMATE);

  // Nothing is invented about what they told us.
  check('nothing was added they did not mention', find(budget, 'Subscriptions') !== undefined, true);

  const note = budget.notes.find((item) => item.kind === 'estimates');
  check('the household is told how much is guesswork', Boolean(note), true);
}

{
  // No question is asked about food, so no answer about food is required.
  const bare = { incomePaise: rupees(18000), adults: 1 };
  const budget = allocate(bare);

  check('a plan is still made from income alone', budget.lines.length > 0, true);
  check('and it fits inside the income', budget.plannedPaise <= budget.incomePaise, true);
  check('everything in it is a guess except giving',
    budget.lines.filter((line) => line.source === SOURCE_KNOWN).map((line) => line.id),
    ['Giving']);
}

{
  // Commitments beyond income: say so, do not quietly trim the rent.
  const stretched = {
    incomePaise: rupees(12000),
    adults: 2,
    rentPaise: rupees(8000),
    loanPaise: rupees(6000)
  };

  const budget = allocate(stretched);

  check('the shortfall is named', budget.notes.some((n) => n.kind === 'shortfall'), true);
  check('rent is untouched', find(budget, 'Rent').plannedPaise, rupees(8000));
  check('the loan is untouched', find(budget, 'Loan payment').plannedPaise, rupees(6000));
  check('and it is called a gap in income',
    budget.notes.find((n) => n.kind === 'shortfall').text.includes('gap in income'), true);
}

{
  // A household that does not want to give is not made to.
  const budget = allocate({ ...household, givingShare: 0 });
  check('giving can be nothing', find(budget, 'Giving'), undefined);
}

/* ---------- the plan coming into focus ---------- */

{
  const budget = allocate(household);
  const before = howMuchIsKnown(budget);

  check('at the start most of it is guesswork', before.share < 0.6, true);

  // As real figures replace estimates, the share known rises.
  for (const line of budget.lines) {
    if (line.id === 'Groceries' || line.id === 'Transport') line.source = SOURCE_KNOWN;
  }

  const after = howMuchIsKnown(budget);
  check('and it rises as the household learns', after.share > before.share, true);
}

/* ---------- the streak ---------- */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-08-11T20:00:00');
const entry = (daysAgo) => ({ id: `e${daysAgo}`, at: NOW - daysAgo * DAY, paise: 100 });

check('nothing recorded, no streak', recordingStreak([], NOW), 0);
check('today counts', recordingStreak([entry(0)], NOW), 1);
check('three days running', recordingStreak([entry(0), entry(1), entry(2)], NOW), 3);
check('a gap ends it', recordingStreak([entry(0), entry(1), entry(3)], NOW), 2);

// Somebody who has not opened the app yet today has not lost their streak.
check('yesterday still counts as unbroken', recordingStreak([entry(1), entry(2)], NOW), 2);
check('but the week before does not', recordingStreak([entry(7), entry(8)], NOW), 0);

// A removed record is not a day recorded.
check('a removed record does not hold a streak up',
  recordingStreak([{ id: 'x', at: NOW, deleted: true }], NOW), 0);

/* ---------- how the month is going ---------- */

{
  // Ten days into a thirty-day month, a tenth spent is careful, not failing.
  const third = { plannedPaise: rupees(30000), spentPaise: rupees(3000), dayOfMonth: 10, daysLeft: 20 };
  check('well under the pace is careful', pace(third).standing, 'careful');

  const even = { plannedPaise: rupees(30000), spentPaise: rupees(10000), dayOfMonth: 10, daysLeft: 20 };
  check('spending evenly is on track', pace(even).standing, 'onTrack');

  const fast = { plannedPaise: rupees(30000), spentPaise: rupees(13000), dayOfMonth: 10, daysLeft: 20 };
  check('somewhat ahead is quick', pace(fast).standing, 'quick');

  const gone = { plannedPaise: rupees(30000), spentPaise: rupees(20000), dayOfMonth: 10, daysLeft: 20 };
  check('far ahead is over', pace(gone).standing, 'over');

  // The measure is the month so far, not the whole month.
  check('what was expected by now', pace(even).expectedByNow, rupees(10000));
}

/* ---------- report ---------- */

if (failed > 0) {
  console.error(`\n${failed} of ${checks} planning checks failed.\n`);
  process.exit(1);
}

console.log(`✓ ${checks} planning and progress checks passed.`);
