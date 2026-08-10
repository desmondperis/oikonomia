/* Building a first plan without asking what somebody already spends.
 *
 * The old survey asked "about how much goes on groceries?" — which assumes the
 * very answer the tool exists to uncover. Most households genuinely do not know,
 * and the ones who guess, guess low. Asking defeated the purpose.
 *
 * So nothing is asked that a household cannot honestly answer. What people do
 * know are their fixed commitments — rent, the EMI, school fees, the insurance
 * premium — because those arrive as the same figure every time. Everything else
 * is openly estimated from their income and who lives in the house, using the
 * allocation this household's own guidance sets out:
 *
 *     50% necessary living · 30% saving, investing and protection · 20% the rest
 *     with giving, saving and investing each around a tenth of income
 *
 * Every estimate is marked as an estimate. It is a starting hypothesis, not a
 * finding — and the month's actual spending is what turns it into knowledge.
 * The gap between the two is the point of the whole exercise.
 */

import { categoryInfo } from './framework.js';

export const SOURCE_KNOWN = 'known';       // the household told us
export const SOURCE_ESTIMATE = 'estimate'; // we worked it out; reality will correct it

/* Shares of income, from the household's own budgeting guidance. Every one of
   these can be changed; they are where a plan starts, not where it must end. */
export const SHARES = {
  giving: 0.10,
  saving: 0.10,
  investing: 0.10,
  necessary: 0.50,
  discretionary: 0.20
};

/* Roughly how a household's day-to-day money divides once the fixed bills are
   out. Used only to spread the necessary-living envelope into categories that
   mean something on a screen, never to assert what anybody actually spends. */
const EVERYDAY_SHAPE = [
  ['Groceries',  0.42],
  ['Transport',  0.18],
  ['Bills',      0.18],
  ['Health',     0.12],
  ['Other',      0.10]
];

const FUN_SHAPE = [
  ['Eating out',    0.45],
  ['Shopping',      0.35],
  ['Subscriptions', 0.20]
];

/** More mouths cost more, but not proportionally — a household shares a kitchen. */
function householdWeight(people, children) {
  const adults = Math.max(1, Number(people) || 1);
  const young = Math.max(0, Number(children) || 0);
  return 1 + (adults - 1) * 0.6 + young * 0.4;
}

/* A guess presented to the paisa pretends to a precision it does not have.
   "About ₹1,100 for travel" is honest; "₹1,095.43" invites someone to believe a
   number nobody computed. Estimates are rounded to the nearest ten rupees;
   figures a household stated are kept exactly as given. */
const ROUND_ESTIMATES_TO = 1000;

function line(id, paise, source, basis) {
  const info = categoryInfo(id);

  const amount = source === SOURCE_ESTIMATE
    ? Math.round(paise / ROUND_ESTIMATES_TO) * ROUND_ESTIMATES_TO
    : Math.round(paise);

  return {
    id,
    priority: info.priority,
    need: info.need,
    fixed: source === SOURCE_KNOWN && info.fixed,
    plannedPaise: Math.max(0, amount),
    typicalPaise: Math.max(0, amount),
    source,
    basis
  };
}

/**
 * Turn what a household told us into a first plan.
 *
 * `answers` holds only things people can answer honestly: income, who lives
 * there, and the commitments that arrive as a fixed figure.
 */
export function allocate(answers) {
  const income = Math.max(0, Number(answers.incomePaise) || 0);

  const lines = [];
  const notes = [];

  /* ---- what they told us, taken as fact ---- */

  const commitments = [
    ['Rent', answers.rentPaise, 'What you told us your home costs each month.'],
    ['Loan payment', answers.loanPaise, 'The loan payments you told us about.'],
    ['Education', answers.feesPaise, 'School or college fees, spread across the year.'],
    ['Insurance', answers.insurancePaise, 'Your premiums, spread across the year.']
  ];

  let committed = 0;
  for (const [id, paise, basis] of commitments) {
    const amount = Math.max(0, Number(paise) || 0);
    if (amount === 0) continue;
    lines.push(line(id, amount, SOURCE_KNOWN, basis));
    committed += amount;
  }

  /* ---- giving, if this household gives ---- */

  const givingShare = answers.givingShare === undefined ? SHARES.giving : Number(answers.givingShare);
  const giving = Math.round(income * Math.max(0, givingShare));
  if (giving > 0) {
    lines.push(line('Giving', giving, SOURCE_KNOWN,
      'The share of your income you said you want to give.'));
  }

  /* ---- what is left has to cover everything else ---- */

  let remaining = income - committed - giving;

  if (remaining <= 0) {
    notes.push({
      kind: 'shortfall',
      paise: Math.abs(remaining),
      text: 'What you have already committed to comes to more than your income. ' +
        'That is worth looking at together, and it is a gap in income rather than a lapse ' +
        'in discipline.'
    });

    return finish(lines, notes, income, answers);
  }

  /* Protection and the future come before discretion — but only from what is
     actually left, so a household with heavy commitments is not handed a plan
     that pretends otherwise. */
  const wantSaving = Math.round(income * SHARES.saving);
  const wantInvesting = Math.round(income * SHARES.investing);

  const forFuture = Math.min(remaining * 0.4, wantSaving + wantInvesting);
  const saving = Math.round(forFuture * (wantSaving / (wantSaving + wantInvesting || 1)));
  const investing = Math.round(forFuture - saving);

  if (saving + investing > 0) {
    lines.push(line('Savings and investing', saving + investing, SOURCE_ESTIMATE,
      forFuture < wantSaving + wantInvesting
        ? 'As much as your commitments leave room for. A cushion first, then the longer term.'
        : 'About a fifth of your income, set aside — a cushion first, then the longer term.'));
  }

  remaining -= saving + investing;

  /* ---- everything nobody knows yet ---- */

  const weight = householdWeight(answers.adults, answers.children);
  const everydayShare = SHARES.necessary / (SHARES.necessary + SHARES.discretionary);

  const everyday = Math.round(remaining * everydayShare);
  const fun = remaining - everyday;

  const people = `${Math.max(1, Number(answers.adults) || 1)} adult${(Number(answers.adults) || 1) === 1 ? '' : 's'}` +
    (Number(answers.children) > 0 ? ` and ${answers.children} child${Number(answers.children) === 1 ? '' : 'ren'}` : '');

  for (const [id, share] of EVERYDAY_SHAPE) {
    const amount = Math.round(everyday * share);
    if (amount <= 0) continue;
    lines.push(line(id, amount, SOURCE_ESTIMATE,
      `A starting figure for ${people}. Oikonomia does not know what you really spend here yet — ` +
      'record what you actually spend and this will be replaced by the truth.'));
  }

  for (const [id, share] of FUN_SHAPE) {
    const amount = Math.round(fun * share);
    if (amount <= 0) continue;
    lines.push(line(id, amount, SOURCE_ESTIMATE,
      'A starting figure. What you actually spend will replace it.'));
  }

  void weight;
  return finish(lines, notes, income, answers);
}

function finish(lines, notes, income, answers) {
  /* Splitting an envelope into shares leaves a paisa or two on the floor, and a
     plan totalling one paisa more than the income would read as being over it.
     The remainder is settled against the largest estimate, never against a
     figure the household stated. */
  const shortfall = notes.some((note) => note.kind === 'shortfall');

  if (income > 0 && !shortfall) {
    const total = lines.reduce((sum, item) => sum + item.plannedPaise, 0);
    const drift = total - income;

    if (drift !== 0) {
      const adjustable = lines
        .filter((item) => item.source === SOURCE_ESTIMATE)
        .sort((a, b) => b.plannedPaise - a.plannedPaise)[0];

      if (adjustable) {
        // Whole rupees: the residual need not be round, but it must not have
        // paise in it either.
        const settled = Math.max(0, Math.round((adjustable.plannedPaise - drift) / 100) * 100);
        adjustable.plannedPaise = settled;
        adjustable.typicalPaise = settled;
      }
    }
  }

  const planned = lines.reduce((sum, item) => sum + item.plannedPaise, 0);

  const estimated = lines.filter((item) => item.source === SOURCE_ESTIMATE).length;
  if (estimated > 0) {
    notes.push({
      kind: 'estimates',
      count: estimated,
      text: `${estimated} of these are Oikonomia's estimates, not your figures. They are a ` +
        'starting point. As you record what you actually spend, each one is replaced by what ' +
        'is true — and that is the whole point of the first month.'
    });
  }

  return {
    incomePaise: income,
    lines,
    notes,
    plannedPaise: planned,
    unallocatedPaise: Math.max(0, income - planned),
    fromProfile: true,
    answers
  };
}

/**
 * How much of the plan is still guesswork.
 *
 * Shown so a household can see their own picture coming into focus month by
 * month — the estimates falling away as real figures take their place.
 */
export function howMuchIsKnown(budget) {
  const spending = (budget.lines || []).filter((item) => item.id !== 'Income');
  if (spending.length === 0) return { known: 0, estimated: 0, share: 0 };

  const known = spending.filter((item) => item.source !== SOURCE_ESTIMATE).length;

  return {
    known,
    estimated: spending.length - known,
    share: known / spending.length
  };
}
