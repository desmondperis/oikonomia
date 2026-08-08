/* Tests for the financial engine and the budget.
 *
 * These are the numbers a household will act on. Every one of them is checked
 * against a figure worked out by hand in the fixture below, so a change that
 * quietly alters someone's surplus cannot ship.
 */

import {
  typicalMonth, recurringCosts, findTransfers, trend, financialState, thisMonth
} from '../public/engine.js';
import { buildBudget, buildFromProfile, adjustLine, compare, review } from '../public/budget.js';

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

const rupees = (amount) => Math.round(amount * 100);
const day = (iso) => Date.parse(`${iso}T12:00:00`);

let counter = 0;
function entry(date, note, amount, category, direction = 'debit', statement = 'HDFC ending 6789') {
  return {
    id: `e${counter++}`, at: day(date), note, paise: rupees(amount),
    category, direction, source: 'statement', statement
  };
}

/* Three complete months for one household. Deliberately uneven: a hospital
   visit in one month, a festival in another, so the median has something to
   prove. "Now" is fixed at 10 April so March is the last complete month. */
const NOW = day('2026-04-10');

const household = [
  // January
  entry('2026-01-01', 'RENT LANDLORD', 18000, 'Rent'),
  entry('2026-01-02', 'SALARY JANUARY', 72000, 'Income', 'credit'),
  entry('2026-01-05', 'BIGBASKET', 8000, 'Groceries'),
  entry('2026-01-07', 'BESCOM ELECTRICITY', 2200, 'Bills'),
  entry('2026-01-12', 'SWIGGY', 1500, 'Eating out'),
  entry('2026-01-18', 'UBER', 2000, 'Transport'),
  entry('2026-01-20', 'HDFC LOAN EMI', 8500, 'Loan payment'),

  // February — a hospital visit
  entry('2026-02-01', 'RENT LANDLORD', 18000, 'Rent'),
  entry('2026-02-02', 'SALARY FEBRUARY', 72000, 'Income', 'credit'),
  entry('2026-02-05', 'BIGBASKET', 9000, 'Groceries'),
  entry('2026-02-07', 'BESCOM ELECTRICITY', 2400, 'Bills'),
  entry('2026-02-11', 'APOLLO HOSPITAL', 15000, 'Health'),
  entry('2026-02-14', 'SWIGGY', 2500, 'Eating out'),
  entry('2026-02-19', 'UBER', 2200, 'Transport'),
  entry('2026-02-20', 'HDFC LOAN EMI', 8500, 'Loan payment'),

  // March
  entry('2026-03-01', 'RENT LANDLORD', 18000, 'Rent'),
  entry('2026-03-02', 'SALARY MARCH', 72000, 'Income', 'credit'),
  entry('2026-03-05', 'BIGBASKET', 8500, 'Groceries'),
  entry('2026-03-07', 'BESCOM ELECTRICITY', 2300, 'Bills'),
  entry('2026-03-15', 'SWIGGY', 3500, 'Eating out'),
  entry('2026-03-17', 'UBER', 2100, 'Transport'),
  entry('2026-03-20', 'HDFC LOAN EMI', 8500, 'Loan payment'),

  // April so far — the month in progress
  entry('2026-04-01', 'RENT LANDLORD', 18000, 'Rent'),
  entry('2026-04-05', 'BIGBASKET', 4000, 'Groceries'),
  entry('2026-04-08', 'SWIGGY', 1200, 'Eating out')
];

/* ---------- a typical month ---------- */

{
  const typical = typicalMonth(household, NOW);

  check('three complete months are used', typical.monthsComplete, 3);
  check('April is left out of the average', typical.monthsUsed, 3);
  check('income is the steady salary', typical.income, rupees(72000));

  // Groceries 8000/9000/8500 -> median 8500. The hospital month does not move it.
  check('groceries use the middle month, not the average', typical.byCategory.Groceries ?? typical.byCategory.get('Groceries'), rupees(8500));
  // Eating out 1500/2500/3500 -> median 2500
  check('eating out median', typical.byCategory.get('Eating out'), rupees(2500));
  // Health appears once: 0/15000/0 -> median 0. One hospital visit is not normal.
  check('a one-off hospital visit does not become normal', typical.byCategory.get('Health'), 0);

  // Essentials: rent 18000 + groceries 8500 + bills 2300 + transport 2100
  //             + loan 8500 + health 0 = 39400
  check('essential spending', typical.essential, rupees(39400));
  check('flexible spending', typical.flexible, rupees(2500));
  check('surplus is income less spending', typical.surplus, rupees(72000 - 41900));
}

/* ---------- transfers are not income ---------- */

{
  const withTransfer = [
    ...household,
    entry('2026-03-25', 'TRANSFER TO JOINT', 20000, 'Other', 'debit', 'HDFC ending 6789'),
    entry('2026-03-25', 'TRANSFER FROM HUSBAND', 20000, 'Other', 'credit', 'SBI ending 4321')
  ];

  const transfers = findTransfers(withTransfer);
  check('both halves of the transfer are spotted', transfers.size, 2);

  const typical = typicalMonth(withTransfer, NOW);
  check('a transfer does not become income', typical.income, rupees(72000));
  check('a transfer does not become spending', typical.flexible, rupees(2500));
}

/* ---------- commitments ---------- */

{
  const recurring = recurringCosts(household, NOW);
  const ids = recurring.map((cost) => cost.category);

  check('rent is recognised as monthly', ids.includes('Rent'), true);
  check('the loan payment is recognised as monthly', ids.includes('Loan payment'), true);
  check('the one-off hospital visit is not', ids.includes('Health'), false);

  const rent = recurring.find((cost) => cost.category === 'Rent');
  check('rent amount', rent.typicalPaise, rupees(18000));
  check('rent seen every month', rent.everyMonth, true);
}

/* ---------- direction of travel ---------- */

{
  // Eating out went 1500 -> 2500 -> 3500
  const eating = trend(household, 'Eating out', NOW);
  check('rising spending is described as rising', eating.direction, 'rising');
  check('and for how many months', eating.run, 3);

  const rent = trend(household, 'Rent', NOW);
  check('steady spending is not called a trend', rent.direction, 'steady');
}

/* ---------- the private reading ---------- */

{
  const state = financialState(household, NOW);
  check('a household living within its income is not called fragile', state.standing !== 'fragile', true);
  check('the debt is noticed', state.hasDebt, true);
  check('rising lifestyle spending is noticed', state.lifestyleRising, true);
  check('essentials are not at risk here', state.essentialsAtRisk, false);
}

{
  // Same household, half the income.
  const struggling = household.map((item) =>
    item.category === 'Income' ? { ...item, paise: rupees(30000) } : item
  );
  const state = financialState(struggling, NOW);
  check('spending beyond income is recognised', state.essentialsAtRisk, true);
  check('and named as an income problem, not a discipline one', state.incomeTooLow, true);
  check('the standing is read as fragile', state.standing, 'fragile');
}

/* ---------- the plan ---------- */

{
  const budget = buildBudget(household, { now: NOW });

  check('the plan is for next month', budget.month, '2026-05');
  check('income carried into the plan', budget.incomePaise, rupees(72000));
  check('the plan does not exceed income', budget.plannedPaise <= budget.incomePaise, true);

  const rent = budget.lines.find((line) => line.id === 'Rent');
  check('rent is planned at what it costs', rent.plannedPaise, rupees(18000));
  check('rent is marked as fixed', rent.fixed, true);

  const savings = budget.lines.find((line) => line.id === 'Savings and investing');
  check('the surplus is given somewhere to go', Boolean(savings), true);
  check('nothing is left unaccounted for', budget.unallocatedPaise, 0);

  check('essentials come before flexible spending', budget.lines[0].id, 'Rent');
}

{
  // A household spending more than it earns must not be handed a fantasy.
  const struggling = household.map((item) =>
    item.category === 'Income' ? { ...item, paise: rupees(30000) } : item
  );
  const budget = buildBudget(struggling, { now: NOW });

  check('the shortfall is stated', budget.notes.some((note) => note.kind === 'shortfall'), true);

  const rent = budget.lines.find((line) => line.id === 'Rent');
  check('rent is never cut to make the sums work', rent.plannedPaise, rupees(18000));

  const groceries = budget.lines.find((line) => line.id === 'Groceries');
  check('nor are groceries', groceries.plannedPaise, rupees(8500));

  const eating = budget.lines.find((line) => line.id === 'Eating out');
  check('flexible spending is trimmed instead', eating.plannedPaise < rupees(2500), true);
  check('but never by more than a third', eating.plannedPaise >= Math.round(rupees(2500) * 0.7), true);
}

/* ---------- changing the plan ---------- */

{
  const budget = buildBudget(household, { now: NOW });
  const eating = budget.lines.find((line) => line.id === 'Eating out');

  const { budget: raised, consequence } = adjustLine(budget, 'Eating out', eating.plannedPaise + rupees(5000));

  check('the change is applied', raised.lines.find((line) => line.id === 'Eating out').plannedPaise, eating.plannedPaise + rupees(5000));
  check('and its cost elsewhere is named', consequence.kind, 'over');
  check('with somewhere for it to come from', consequence.candidates.length > 0, true);
}

/* ---------- plan against reality ---------- */

{
  const budget = buildBudget(household, { now: NOW });

  // April so far: rent 18000, groceries 4000, eating out 1200
  const comparison = compare(budget, household, NOW);

  const rent = comparison.rows.find((row) => row.id === 'Rent');
  check('rent is fully spent', rent.actualPaise, rupees(18000));
  check('with nothing left in it', rent.remainingPaise, 0);

  const groceries = comparison.rows.find((row) => row.id === 'Groceries');
  check('groceries part spent', groceries.actualPaise, rupees(4000));
  check('with the rest still there', groceries.remainingPaise, rupees(4500));

  check('the day of the month is known', comparison.dayOfMonth, 10);

  const summary = review(budget, household, NOW);
  check('the review leads with what went well', summary.wentWell.length > 0, true);
}

/* ---------- a household with no statements at all ---------- */

{
  const profile = {
    incomePaise: rupees(30000),
    savedPaise: rupees(5000),
    commitments: [
      { category: 'Rent',         paise: rupees(7000),  everyMonth: true },
      { category: 'Groceries',    paise: rupees(9000),  everyMonth: true },
      { category: 'Bills',        paise: rupees(1800),  everyMonth: true },
      { category: 'Transport',    paise: rupees(2500),  everyMonth: true },
      { category: 'Education',    paise: rupees(2000),  everyMonth: true },
      { category: 'Loan payment', paise: rupees(3000),  everyMonth: true }
    ]
  };

  const budget = buildFromProfile(profile, { now: NOW });

  check('a plan is made without any statement', budget.lines.length > 0, true);
  check('it is marked as coming from what they said', budget.fromProfile, true);
  check('income is what they said', budget.incomePaise, rupees(30000));

  const stated = 7000 + 9000 + 1800 + 2500 + 2000 + 3000;
  check('nothing is invented on their behalf',
    budget.lines
      .filter((line) => line.id !== 'Savings and investing')
      .reduce((sum, line) => sum + line.plannedPaise, 0),
    rupees(stated));

  check('what is left is given somewhere to go', budget.unallocatedPaise, 0);

  // Within a band the largest commitment leads; what matters is that nothing
  // optional is listed above something that must be paid.
  const firstFlexible = budget.lines.findIndex((line) => line.priority === 'flexible');
  const lastEssential = budget.lines.map((line) => line.priority)
    .lastIndexOf('essentials');
  check('nothing optional is listed above something that must be paid',
    firstFlexible === -1 || firstFlexible > lastEssential, true);

  const savings = budget.lines.find((line) => line.id === 'Savings and investing');
  check('the remainder becomes a cushion', savings.plannedPaise, rupees(30000 - stated));
}

{
  // Told more going out than coming in: say so, do not quietly trim.
  const tight = {
    incomePaise: rupees(12000),
    commitments: [
      { category: 'Rent',      paise: rupees(7000), everyMonth: true },
      { category: 'Groceries', paise: rupees(8000), everyMonth: true }
    ]
  };

  const budget = buildFromProfile(tight, { now: NOW });

  check('the shortfall is stated plainly', budget.notes.some((note) => note.kind === 'shortfall'), true);
  check('rent is not cut to make it balance',
    budget.lines.find((line) => line.id === 'Rent').plannedPaise, rupees(7000));
  check('nor are groceries',
    budget.lines.find((line) => line.id === 'Groceries').plannedPaise, rupees(8000));
  check('and it is named as an income gap', budget.state.incomeTooLow, true);
}

/* ---------- an empty household invents nothing ---------- */

{
  const typical = typicalMonth([], NOW);
  check('no income is claimed', typical.income, 0);
  check('no spending is claimed', typical.spending, 0);

  const budget = buildBudget([], { now: NOW });
  check('and no plan is fabricated', budget.lines.length, 0);
}

/* ---------- report ---------- */

if (failed > 0) {
  console.error(`\n${failed} of ${checks} engine checks failed.\n`);
  process.exit(1);
}

console.log(`✓ ${checks} engine and budget checks passed.`);
