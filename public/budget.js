/* Building a plan, and comparing it with what actually happened.
 *
 * The budget is arithmetic, not a guess: it starts from what this household
 * genuinely spends, protects what has to be paid, and only then decides what is
 * left over. The assistant may explain it and may suggest changes to it, but
 * every figure in it is produced here.
 *
 * A plan that ignores what a household actually does is not a plan. So the
 * starting point is always their own typical month, never a rule of thumb about
 * what people ought to spend.
 */

import { categoryInfo, isEssential, isSpending, PRIORITIES } from './framework.js';
import { typicalMonth, recurringCosts, thisMonth, financialState, monthKey } from './engine.js';

/* How far a flexible category may be cut in one go. Halving someone's food
   budget produces a plan they abandon in a fortnight. */
const MOST_WE_CUT = 0.3;

/* What a cushion is aiming at, in months of essential spending. Not a universal
   number — 3.5 of the specification is explicit that there isn't one — but a
   starting point the household can change. */
const BUFFER_TARGET_MONTHS = 3;

/**
 * Build a tentative plan for the coming month.
 *
 * Returns categories with the reasoning attached, so nothing in the plan is
 * unexplained. The household changes whatever they disagree with.
 */
export function buildBudget(entries, options = {}) {
  const now = options.now || Date.now();
  const typical = typicalMonth(entries, now);
  const recurring = recurringCosts(entries, now);
  const state = financialState(entries, now);

  const income = options.incomePaise ?? typical.income;

  const lines = [];

  for (const [id, amount] of typical.byCategory) {
    if (!isSpending(id) && id !== 'Savings and investing') continue;
    if (amount === 0) continue;

    const info = categoryInfo(id);
    const commitment = recurring.find((cost) => cost.category === id && cost.everyMonth);

    lines.push({
      id,
      priority: info.priority,
      need: info.need,
      fixed: info.fixed || Boolean(commitment),
      typicalPaise: amount,
      plannedPaise: amount,
      basis: commitment
        ? `You pay this every month — about ${'₹'}${Math.round(commitment.typicalPaise / 100)}.`
        : `What you usually spend across ${typical.monthsUsed} month${typical.monthsUsed === 1 ? '' : 's'}.`
    });
  }

  // Order the plan the way the household's obligations actually fall.
  const rankOf = (line) =>
    PRIORITIES.findIndex((priority) => priority.id === line.priority) + 1 || 99;
  lines.sort((a, b) => rankOf(a) - rankOf(b) || b.plannedPaise - a.plannedPaise);

  const planned = () => lines.reduce((sum, line) => sum + line.plannedPaise, 0);

  const notes = [];
  let shortfall = planned() - income;

  if (income > 0 && shortfall > 0) {
    // Spending more than comes in. Trim what can be trimmed, gently, and say
    // so plainly rather than producing a plan that cannot work.
    const trimmable = lines
      .filter((line) => !line.fixed && !isEssential(line.id))
      .sort((a, b) => rankOf(b) - rankOf(a));

    for (const line of trimmable) {
      if (shortfall <= 0) break;
      const room = Math.round(line.plannedPaise * MOST_WE_CUT);
      const cut = Math.min(room, shortfall);
      if (cut <= 0) continue;

      line.plannedPaise -= cut;
      line.adjustedPaise = -cut;
      line.basis += ' Trimmed to keep the month in balance.';
      shortfall -= cut;
    }

    notes.push(
      shortfall > 0
        ? {
            kind: 'shortfall',
            paise: shortfall,
            text: 'Even after trimming what can be trimmed, this plan spends more than comes in. That is a gap in income, not a lapse in discipline.'
          }
        : {
            kind: 'trimmed',
            text: 'Some flexible spending is planned lower than usual so the month balances.'
          }
    );
  }

  let leftOver = income - planned();

  if (income > 0 && leftOver > 0) {
    // What is left has somewhere to go, in the order that protects a household:
    // a cushion first, then debt, then longer-term saving.
    const bufferGap = Math.max(
      0,
      typical.essential * BUFFER_TARGET_MONTHS - (typical.byCategory.get('Savings and investing') || 0)
    );

    const toBuffer = bufferGap > 0 ? Math.min(leftOver, Math.round(leftOver * 0.6)) : 0;
    const toDebt = state.hasDebt ? Math.min(leftOver - toBuffer, Math.round(leftOver * 0.3)) : 0;
    const toSaving = leftOver - toBuffer - toDebt;

    if (toBuffer > 0) {
      addTo(lines, 'Savings and investing', toBuffer,
        'Building a cushion, so an unexpected cost does not become a loan.');
    }
    if (toDebt > 0) {
      addTo(lines, 'Loan payment', toDebt,
        'Extra against what you owe, which shortens how long you carry it.');
    }
    if (toSaving > 0) {
      addTo(lines, 'Savings and investing', toSaving, 'Set aside towards what you are working towards.');
    }

    leftOver = 0;
  }

  return {
    month: nextMonthKey(now),
    incomePaise: income,
    lines,
    notes,
    plannedPaise: planned(),
    unallocatedPaise: Math.max(0, income - planned()),
    basedOnMonths: typical.monthsUsed,
    state
  };
}

/* ---------- a plan for a household with no statements ---------- */

/**
 * Build a plan from what a household tells us directly.
 *
 * Plenty of households cannot produce a year of PDFs — the statements are
 * posted, or scanned, or there is no net banking at all. Their money is no less
 * worth planning, so everything the engine would have worked out from records
 * is instead asked for plainly, once.
 *
 * Every figure here comes from the household. Nothing is estimated on their
 * behalf, because a budget containing a number nobody said is a budget nobody
 * will trust.
 */
export function buildFromProfile(profile, options = {}) {
  const now = options.now || Date.now();
  const income = Number(profile.incomePaise) || 0;

  const lines = [];

  for (const stated of profile.commitments || []) {
    const paise = Number(stated.paise) || 0;
    if (paise <= 0) continue;

    const id = stated.category || 'Other';
    const info = categoryInfo(id);
    const existing = lines.find((line) => line.id === id);

    if (existing) {
      existing.plannedPaise += paise;
      continue;
    }

    lines.push({
      id,
      priority: info.priority,
      need: info.need,
      fixed: stated.everyMonth !== false && info.fixed,
      typicalPaise: paise,
      plannedPaise: paise,
      basis: stated.everyMonth === false
        ? 'What you told us this comes to, month to month.'
        : 'What you told us you pay every month.'
    });
  }

  const rankOf = (line) =>
    PRIORITIES.findIndex((priority) => priority.id === line.priority) + 1 || 99;
  lines.sort((a, b) => rankOf(a) - rankOf(b) || b.plannedPaise - a.plannedPaise);

  const planned = () => lines.reduce((sum, line) => sum + line.plannedPaise, 0);
  const notes = [];

  const shortfall = planned() - income;

  if (income > 0 && shortfall > 0) {
    notes.push({
      kind: 'shortfall',
      paise: shortfall,
      text: 'What you have told us adds up to more than comes in. That is worth ' +
        'looking at together, and it is a gap in income rather than a lapse in discipline.'
    });
  }

  let leftOver = income - planned();

  if (income > 0 && leftOver > 0) {
    // Essentials as stated, so the cushion target is grounded in their figures.
    const essentials = lines
      .filter((line) => isEssential(line.id))
      .reduce((sum, line) => sum + line.plannedPaise, 0);

    const bufferGap = Math.max(0, essentials * BUFFER_TARGET_MONTHS - (Number(profile.savedPaise) || 0));
    const toBuffer = bufferGap > 0 ? Math.min(leftOver, Math.round(leftOver * 0.6)) : 0;
    const toSaving = leftOver - toBuffer;

    if (toBuffer > 0) {
      addTo(lines, 'Savings and investing', toBuffer,
        'Building a cushion, so an unexpected cost does not become a loan.');
    }
    if (toSaving > 0) {
      addTo(lines, 'Savings and investing', toSaving,
        'Set aside towards what you are working towards.');
    }

    leftOver = 0;
  }

  return {
    month: nextMonthKey(now),
    incomePaise: income,
    lines,
    notes,
    plannedPaise: planned(),
    unallocatedPaise: Math.max(0, income - planned()),
    basedOnMonths: 0,
    fromProfile: true,
    state: {
      standing: income === 0 ? 'unknown' : shortfall > 0 ? 'fragile' : 'stabilising',
      essentialsAtRisk: shortfall > 0,
      hasDebt: lines.some((line) => line.id === 'Loan payment'),
      hasIrregularCosts: (profile.commitments || []).some((item) => item.everyMonth === false),
      bufferMonths: 0,
      lifestyleRising: false,
      givesRegularly: lines.some((line) => line.id === 'Giving'),
      incomeTooLow: income > 0 && shortfall > 0
    }
  };
}

function addTo(lines, id, paise, why) {
  const existing = lines.find((line) => line.id === id);
  if (existing) {
    existing.plannedPaise += paise;
    existing.addedPaise = (existing.addedPaise || 0) + paise;
    existing.basis += ` ${why}`;
    return;
  }

  const info = categoryInfo(id);
  lines.push({
    id,
    priority: info.priority,
    need: info.need,
    fixed: false,
    typicalPaise: 0,
    plannedPaise: paise,
    addedPaise: paise,
    basis: why
  });
}

function nextMonthKey(now) {
  const date = new Date(now);
  return monthKey(new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime());
}

/* ---------- changing the plan ---------- */

/**
 * Move an amount into one category, and say what it costs elsewhere.
 *
 * A budget where one figure can rise without another falling teaches a
 * household nothing. Every change names its consequence.
 */
export function adjustLine(budget, id, newPlannedPaise) {
  const next = structuredClone(budget);
  const line = next.lines.find((entry) => entry.id === id);
  if (!line) return { budget: next, consequence: null };

  const difference = newPlannedPaise - line.plannedPaise;
  line.plannedPaise = Math.max(0, newPlannedPaise);
  line.editedByHousehold = true;

  if (difference === 0) return { budget: next, consequence: null };

  const total = next.lines.reduce((sum, entry) => sum + entry.plannedPaise, 0);
  const over = total - next.incomePaise;

  next.plannedPaise = total;
  next.unallocatedPaise = Math.max(0, next.incomePaise - total);

  if (over <= 0) {
    return {
      budget: next,
      consequence: {
        kind: 'fits',
        text: difference > 0
          ? 'That fits — it comes out of what was left unspoken for.'
          : 'That leaves more unspoken for this month.'
      }
    };
  }

  // Where the money would have to come from, named rather than silently taken.
  const candidates = next.lines
    .filter((entry) => entry.id !== id && !entry.fixed && !isEssential(entry.id))
    .sort((a, b) => b.plannedPaise - a.plannedPaise);

  return {
    budget: next,
    consequence: {
      kind: 'over',
      paise: over,
      candidates: candidates.slice(0, 3).map((entry) => entry.id),
      text: candidates.length > 0
        ? `That puts the month over by ₹${Math.round(over / 100)}. It would need to come out of ${candidates.slice(0, 2).map((entry) => entry.id.toLowerCase()).join(' or ')}.`
        : `That puts the month over by ₹${Math.round(over / 100)}, and there is no flexible spending left to take it from.`
    }
  };
}

/* ---------- plan against reality ---------- */

/**
 * How the month is going.
 *
 * Reports what is left, not what was overspent, because a household checking
 * mid-month wants to know what they still have.
 */
export function compare(budget, entries, now = Date.now()) {
  const month = thisMonth(entries, now);

  const rows = budget.lines.map((line) => {
    const actual = month.byCategory.get(line.id) || 0;
    const remaining = line.plannedPaise - actual;
    const share = line.plannedPaise > 0 ? actual / line.plannedPaise : 0;
    const monthShare = month.daysInMonth > 0 ? month.dayOfMonth / month.daysInMonth : 0;

    let standing = 'fine';
    if (remaining < 0) standing = 'over';
    else if (share > monthShare + 0.2) standing = 'quick';

    return {
      id: line.id,
      plannedPaise: line.plannedPaise,
      actualPaise: actual,
      remainingPaise: remaining,
      standing,
      // Only meaningful once enough of the month has passed to mean anything.
      projectedPaise: month.dayOfMonth >= 5
        ? Math.round((actual / month.dayOfMonth) * month.daysInMonth)
        : null
    };
  });

  const plannedTotal = budget.lines.reduce((sum, line) => sum + line.plannedPaise, 0);
  const spentTotal = rows.reduce((sum, row) => sum + row.actualPaise, 0);

  return {
    month: month.key,
    dayOfMonth: month.dayOfMonth,
    daysLeft: month.daysLeft,
    plannedPaise: plannedTotal,
    spentPaise: spentTotal,
    remainingPaise: plannedTotal - spentTotal,
    projectedPaise: month.projectedSpending,
    rows: rows.sort((a, b) => b.actualPaise - a.actualPaise)
  };
}

/* ---------- the month just gone ---------- */

/**
 * A short, honest review. Things that went well first, because a household that
 * only ever hears what went wrong stops opening the app.
 */
export function review(budget, entries, now = Date.now()) {
  const comparison = compare(budget, entries, now);

  const wentWell = comparison.rows
    .filter((row) => row.plannedPaise > 0 && row.remainingPaise >= 0)
    .sort((a, b) => b.remainingPaise - a.remainingPaise)
    .slice(0, 3);

  const worthWatching = comparison.rows
    .filter((row) => row.standing === 'over')
    .sort((a, b) => a.remainingPaise - b.remainingPaise)
    .slice(0, 3);

  return { comparison, wentWell, worthWatching };
}
