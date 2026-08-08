/* The financial engine.
 *
 * Every authoritative number in Oikonomia is produced here, by arithmetic, on
 * the household's own device. The assistant reads what this produces and never
 * produces any of it. That separation is the single most important rule in the
 * product: the engine establishes what is true, the assistant only interprets.
 *
 * Everything is in paise, whole numbers, so no total is ever a rounding of a
 * rounding.
 */

import { categoryInfo, isEssential, isSpending } from './framework.js';

/* ---------- months ---------- */

export function monthKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthName(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Every month that has any activity, oldest first. */
export function monthsPresent(entries) {
  return [...new Set(entries.map((entry) => monthKey(entry.at)))].sort();
}

/**
 * A month is only usable for averages if it looks complete.
 *
 * The month a household signs up in is nearly always a partial one, and letting
 * a half month into an average quietly understates everything.
 */
export function completeMonths(entries, now = Date.now()) {
  const months = monthsPresent(entries);
  const current = monthKey(now);
  return months.filter((month) => month !== current);
}

/* ---------- transfers between the household's own accounts ---------- */

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

/**
 * Money moved from one of the household's accounts to another is not income
 * and not spending. Counting it as either inflates both sides of the picture.
 *
 * A transfer is a debit and a credit of the same amount, close in time, on
 * different statements. Returns the set of entry ids involved.
 */
export function findTransfers(entries) {
  const paired = new Set();
  const credits = entries.filter((entry) => entry.direction === 'credit');

  for (const debit of entries) {
    if (debit.direction !== 'debit' || paired.has(debit.id)) continue;

    const match = credits.find((credit) =>
      !paired.has(credit.id) &&
      credit.paise === debit.paise &&
      Math.abs(credit.at - debit.at) <= THREE_DAYS &&
      // Different accounts. Two entries from the same statement cannot be a
      // transfer between accounts.
      (credit.statement || 'a') !== (debit.statement || 'b')
    );

    if (match) {
      paired.add(debit.id);
      paired.add(match.id);
    }
  }

  return paired;
}

/* ---------- the shape of a month ---------- */

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

/**
 * Break the household's records into months, with transfers set aside.
 *
 * Returns a map of month key to { income, spending, byCategory }.
 */
export function byMonth(entries, transfers = findTransfers(entries)) {
  const months = new Map();

  for (const entry of entries) {
    if (transfers.has(entry.id)) continue;

    const key = monthKey(entry.at);
    if (!months.has(key)) {
      months.set(key, { key, income: 0, spending: 0, byCategory: new Map() });
    }

    const month = months.get(key);
    const category = entry.category || 'Other';

    if (entry.direction === 'credit') {
      month.income += entry.paise;
    } else {
      if (isSpending(category)) month.spending += entry.paise;
      month.byCategory.set(category, (month.byCategory.get(category) || 0) + entry.paise);
    }
  }

  return months;
}

/**
 * What a typical month looks like for this household.
 *
 * The median is used rather than the mean, so one festival, one hospital visit
 * or one bonus does not redefine what normal looks like.
 */
export function typicalMonth(entries, now = Date.now()) {
  const transfers = findTransfers(entries);
  const months = byMonth(entries, transfers);
  const usable = completeMonths(entries, now);

  // With no complete month yet, work from what there is rather than nothing.
  const keys = usable.length > 0 ? usable : [...months.keys()];
  const sample = keys.map((key) => months.get(key)).filter(Boolean);

  const categories = new Set();
  for (const month of sample) for (const id of month.byCategory.keys()) categories.add(id);

  const byCategory = new Map();
  for (const id of categories) {
    byCategory.set(id, median(sample.map((month) => month.byCategory.get(id) || 0)));
  }

  const income = median(sample.map((month) => month.income));

  let essential = 0;
  let flexible = 0;
  for (const [id, amount] of byCategory) {
    if (!isSpending(id)) continue;
    if (isEssential(id)) essential += amount;
    else flexible += amount;
  }

  /* Spending is the sum of the category figures, not the median of the monthly
     totals. Those two are not the same number, and a household shown a summary
     whose parts do not add up to its total has every reason to distrust the
     whole thing. The parts win. */
  const spending = essential + flexible;

  return {
    monthsUsed: sample.length,
    monthsComplete: usable.length,
    income,
    spending,
    essential,
    flexible,
    surplus: income - spending,
    byCategory,
    saving: byCategory.get('Savings and investing') || 0,
    debtPayments: byCategory.get('Loan payment') || 0,
    giving: byCategory.get('Giving') || 0
  };
}

/* ---------- things that happen every month ---------- */

/** Strip a description down to something two months apart can be compared on. */
function signature(note) {
  return String(note || '')
    .toLowerCase()
    .replace(/\d+/g, ' ')
    .replace(/[^\p{L}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ');
}

/**
 * Costs that recur — rent, a subscription, an insurance premium.
 *
 * Something appearing in most months at a similar amount is a commitment, not a
 * choice, and a budget that ignores them is fiction.
 */
export function recurringCosts(entries, now = Date.now()) {
  const usable = new Set(completeMonths(entries, now));
  if (usable.size < 2) return [];

  const groups = new Map();

  for (const entry of entries) {
    if (entry.direction !== 'debit') continue;
    if (!usable.has(monthKey(entry.at))) continue;

    const key = signature(entry.note);
    if (!key) continue;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const found = [];

  for (const [key, group] of groups) {
    const months = new Set(group.map((entry) => monthKey(entry.at)));
    if (months.size < Math.min(3, usable.size)) continue;

    const amounts = group.map((entry) => entry.paise);
    const typical = median(amounts);
    if (typical === 0) continue;

    // Allow a bill to drift a little without ceasing to be the same bill.
    const steady = amounts.filter((amount) => Math.abs(amount - typical) <= typical * 0.25);
    if (steady.length < months.size) continue;

    found.push({
      signature: key,
      label: group[group.length - 1].note,
      category: group[group.length - 1].category || 'Other',
      typicalPaise: typical,
      monthsSeen: months.size,
      everyMonth: months.size === usable.size
    });
  }

  return found.sort((a, b) => b.typicalPaise - a.typicalPaise);
}

/* ---------- how a category is moving ---------- */

/**
 * Whether spending in a category is climbing, falling or steady.
 *
 * "Four months in a row" is a far more useful thing to tell a household than
 * "over budget", because it describes a direction rather than a verdict.
 */
export function trend(entries, category, now = Date.now()) {
  const months = byMonth(entries);
  const keys = completeMonths(entries, now).slice(-6);
  if (keys.length < 3) return { direction: 'unknown', run: 0, amounts: [] };

  const amounts = keys.map((key) => months.get(key)?.byCategory.get(category) || 0);

  let rising = 0;
  let falling = 0;
  for (let index = 1; index < amounts.length; index++) {
    if (amounts[index] > amounts[index - 1]) { rising++; falling = 0; }
    else if (amounts[index] < amounts[index - 1]) { falling++; rising = 0; }
    else { rising = 0; falling = 0; }
  }

  if (rising >= 2) return { direction: 'rising', run: rising + 1, amounts };
  if (falling >= 2) return { direction: 'falling', run: falling + 1, amounts };
  return { direction: 'steady', run: 0, amounts };
}

/* ---------- where the household stands ---------- */

/**
 * A private reading of the household's position.
 *
 * Never shown as a label. It decides what Oikonomia suggests next and what tone
 * it takes, and nothing else. Nobody is told they are 'fragile'.
 */
export function financialState(entries, now = Date.now()) {
  const typical = typicalMonth(entries, now);
  const recurring = recurringCosts(entries, now);

  const essentialsPerMonth = typical.essential || 1;
  const savedUp = Math.max(0, typical.byCategory.get('Savings and investing') || 0);
  const bufferMonths = essentialsPerMonth > 0 ? savedUp / essentialsPerMonth : 0;

  const surplusShare = typical.income > 0 ? typical.surplus / typical.income : 0;
  const debtShare = typical.income > 0 ? typical.debtPayments / typical.income : 0;

  let standing = 'stabilising';
  if (typical.income === 0) standing = 'unknown';
  else if (typical.surplus < 0 || debtShare > 0.4) standing = 'fragile';
  else if (surplusShare > 0.2 && bufferMonths >= 3) standing = 'growing';
  else if (surplusShare > 0.1) standing = 'stable';

  const eatingOut = trend(entries, 'Eating out', now);
  const shopping = trend(entries, 'Shopping', now);

  return {
    standing,
    bufferMonths,
    surplusShare,
    debtShare,
    // These feed the stewardship framework, which decides what is worth saying.
    essentialsAtRisk: typical.surplus < 0,
    hasDebt: typical.debtPayments > 0,
    hasIrregularCosts: recurring.some((cost) => !cost.everyMonth),
    lifestyleRising: eatingOut.direction === 'rising' || shopping.direction === 'rising',
    givesRegularly: (typical.byCategory.get('Giving') || 0) > 0,
    incomeTooLow: typical.income > 0 && typical.essential > typical.income
  };
}

/* ---------- this month so far ---------- */

/** What has actually happened in the month now running. */
export function thisMonth(entries, now = Date.now()) {
  const key = monthKey(now);
  const transfers = findTransfers(entries);
  const months = byMonth(entries, transfers);
  const month = months.get(key) || { income: 0, spending: 0, byCategory: new Map() };

  const date = new Date(now);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const dayOfMonth = date.getDate();

  return {
    key,
    income: month.income,
    spending: month.spending,
    byCategory: month.byCategory,
    dayOfMonth,
    daysInMonth,
    daysLeft: daysInMonth - dayOfMonth,
    // Where spending would end up at the current pace. An estimate, and always
    // presented as one.
    projectedSpending: dayOfMonth > 0
      ? Math.round((month.spending / dayOfMonth) * daysInMonth)
      : 0
  };
}
