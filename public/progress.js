/* How the month is going, and why that should feel like something.
 *
 * A budget nobody returns to is a budget that failed. So the month is scored —
 * but carefully, because scoring money badly does real harm.
 *
 * Three rules govern everything here.
 *
 * Nothing is ever taken away. A household that has a bad week must not open the
 * app and find itself punished; the specification is explicit that poverty and
 * unavoidable cost are never to be treated as failure. Points only go up.
 *
 * Recording is rewarded before restraint. In the first month the plan is mostly
 * Oikonomia's guesswork, so praising somebody for staying under a figure nobody
 * knew is meaningless. What deserves reward is showing up and writing things
 * down, because that is what turns guesses into knowledge.
 *
 * And the strongest reward is for discovery. Every estimate replaced by a real
 * figure is the household learning something true about itself, which is the
 * entire purpose of the exercise.
 */

import { monthKey } from './engine.js';

const STORE = 'oikonomia.progress.v1';

export const POINTS = {
  recorded: 5,          // an expense written down
  dayComplete: 10,      // any day with something recorded
  weekKept: 25,         // a week where spending stayed near the plan
  estimateSettled: 40,  // a guess replaced by a real figure
  monthFinished: 100    // a month seen through to its review
};

/* ---------- what has been earned ---------- */

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE);
    const saved = raw ? JSON.parse(raw) : null;
    return { points: 0, awarded: {}, ...(saved || {}) };
  } catch {
    return { points: 0, awarded: {} };
  }
}

function saveProgress(progress) {
  try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* fine */ }
}

/**
 * Award something once and once only.
 *
 * `token` names the thing being rewarded — a particular day, a particular
 * estimate — so opening the app twice never earns twice.
 */
export function award(kind, token) {
  const progress = loadProgress();
  const key = `${kind}:${token}`;

  if (progress.awarded[key]) return { earned: 0, points: progress.points };

  const value = POINTS[kind] || 0;
  progress.awarded[key] = true;
  progress.points += value;
  saveProgress(progress);

  return { earned: value, points: progress.points };
}

/* ---------- the streak ---------- */

const DAY = 24 * 60 * 60 * 1000;

function dayOf(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * How many days in a row something was recorded, counting back from today.
 *
 * Yesterday still counts as unbroken, so somebody who has not opened the app
 * yet this morning is not told their streak is gone.
 */
export function recordingStreak(entries, now = Date.now()) {
  const days = new Set(
    entries.filter((entry) => !entry.deleted).map((entry) => dayOf(entry.at))
  );

  if (days.size === 0) return 0;

  let streak = 0;
  let cursor = now;

  if (!days.has(dayOf(cursor))) {
    cursor -= DAY;
    if (!days.has(dayOf(cursor))) return 0;
  }

  while (days.has(dayOf(cursor))) {
    streak++;
    cursor -= DAY;
  }

  return streak;
}

/* ---------- how close to the plan ---------- */

/**
 * Where the month stands against the plan, allowing for how much of it has gone.
 *
 * Judging a household on the tenth against a whole month's budget would tell
 * them they are wonderfully under every time, and then that they have failed on
 * the last day. So spending is compared against the share of the plan the month
 * has actually used up.
 */
export function pace(comparison) {
  const throughMonth = comparison.dayOfMonth /
    (comparison.dayOfMonth + comparison.daysLeft || 1);

  const expectedByNow = Math.round(comparison.plannedPaise * throughMonth);
  const spent = comparison.spentPaise;

  if (expectedByNow <= 0) {
    return { standing: 'early', share: 0, expectedByNow, aheadBy: 0 };
  }

  const share = spent / expectedByNow;

  let standing = 'onTrack';
  if (share > 1.15) standing = 'quick';
  if (share > 1.4) standing = 'over';
  if (share < 0.75) standing = 'careful';

  return {
    standing,
    share,
    expectedByNow,
    aheadBy: expectedByNow - spent
  };
}

/**
 * Everything the home screen needs to say how the month is going.
 *
 * Deliberately returns facts and a standing, never a verdict on the household.
 */
export function monthProgress(entries, comparison, now = Date.now()) {
  const key = monthKey(now);

  const thisMonth = entries.filter(
    (entry) => !entry.deleted && monthKey(entry.at) === key
  );

  const daysRecorded = new Set(thisMonth.map((entry) => dayOf(entry.at))).size;

  return {
    points: loadProgress().points,
    streak: recordingStreak(entries, now),
    daysRecorded,
    recorded: thisMonth.length,
    pace: comparison ? pace(comparison) : null
  };
}

/**
 * Notice everything worth rewarding, quietly, and say what was earned.
 *
 * Called after anything is recorded. Returns the messages worth showing — often
 * none, because a reward that arrives every time stops meaning anything.
 */
export function noticeProgress(entries, budget, comparison, now = Date.now()) {
  const said = [];

  const today = dayOf(now);
  const recordedToday = entries.some(
    (entry) => !entry.deleted && dayOf(entry.at) === today
  );

  if (recordedToday) {
    const day = award('dayComplete', today);
    if (day.earned > 0) {
      const streak = recordingStreak(entries, now);
      said.push(streak >= 3
        ? { kind: 'streak', text: `${streak} days in a row`, points: day.earned }
        : { kind: 'day', text: 'Written down for today', points: day.earned });
    }
  }

  /* A category whose figure was Oikonomia's guess, and which now has enough
     real spending behind it to be believed, is the household learning something
     true about itself. That is worth more than restraint. */
  if (budget && comparison) {
    for (const line of budget.lines || []) {
      if (line.source !== 'estimate') continue;

      const row = comparison.rows.find((item) => item.id === line.id);
      if (!row || row.actualPaise <= 0) continue;

      const enough = entries.filter(
        (entry) => !entry.deleted && entry.category === line.id
      ).length;

      if (enough < 3) continue;

      const earned = award('estimateSettled', `${budget.month}:${line.id}`);
      if (earned.earned > 0) {
        said.push({
          kind: 'discovery',
          text: `You now know what ${line.id.toLowerCase()} really costs you`,
          points: earned.earned
        });
      }
    }
  }

  return said;
}
