/* Reading the individual cells of a bank statement.
 *
 * Amounts and dates are where a statement reader quietly goes wrong. An amount
 * off by a factor of a hundred, or a date read as 7 April instead of 4 July,
 * produces a statement that looks perfectly reasonable and is wrong. So both
 * are strict here: anything that does not clearly parse returns null, and the
 * caller has to deal with not knowing.
 *
 * Everything is in paise. Whole numbers only.
 */

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
  sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Read a money cell.
 *
 * Handles "1,250.00", "1250", "1,250.00 Dr", "(1,250.00)", "1250.00-",
 * "₹1,250.00" and the Indian grouping "1,20,250.50".
 *
 * Returns { paise, direction } where direction is 'debit', 'credit' or null
 * when the cell itself does not say. Returns null when this is not money.
 */
export function readAmount(text) {
  if (text === null || text === undefined) return null;

  let raw = String(text).trim();
  if (!raw) return null;

  let direction = null;

  // Trailing or leading Dr/Cr markers.
  const marker = /\b(dr|cr)\b\.?/i.exec(raw);
  if (marker) {
    direction = marker[1].toLowerCase() === 'dr' ? 'debit' : 'credit';
    raw = raw.replace(marker[0], ' ');
  }

  // Accountants' parentheses, and a trailing minus.
  let negative = false;
  if (/^\(.*\)$/.test(raw.trim())) {
    negative = true;
    raw = raw.trim().slice(1, -1);
  }
  if (/-\s*$/.test(raw)) {
    negative = true;
    raw = raw.replace(/-\s*$/, '');
  }
  if (/^\s*-/.test(raw)) {
    negative = true;
    raw = raw.replace(/^\s*-/, '');
  }

  raw = raw.replace(/[₹]/g, '').replace(/\brs\.?\b/gi, '').replace(/\binr\b/gi, '');
  raw = raw.replace(/\s+/g, '');

  if (!raw) return null;

  // A number with optional grouping commas and at most two decimal places.
  if (!/^\d{1,3}(,\d{2,3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(raw)) return null;

  const plain = raw.replace(/,/g, '');
  const value = Number(plain);
  if (!Number.isFinite(value)) return null;

  // Round on the string to avoid binary floating point creeping in.
  const [whole, fraction = ''] = plain.split('.');
  const paise = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));

  if (!Number.isSafeInteger(paise)) return null;

  if (negative && !direction) direction = 'debit';

  return { paise, direction };
}

/**
 * Read a date cell as it appears on an Indian bank statement.
 *
 * Indian statements are always day-first: 04/07/2026 is the fourth of July.
 * Getting this backwards silently reorders someone's whole year, so numeric
 * dates are only ever read day-first, never guessed at.
 *
 * Handles 04/07/2026, 04-07-26, 4 Jul 2026, 04-JUL-2026, 2026-07-04.
 * Returns 'YYYY-MM-DD', or null.
 */
export function readDate(text) {
  if (text === null || text === undefined) return null;

  const raw = String(text).trim().toLowerCase();
  if (!raw) return null;

  let day = null;
  let month = null;
  let year = null;

  // 2026-07-04 — the only sensible year-first form.
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(raw);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  }

  // 4 Jul 2026, 04-jul-2026, 4/july/26
  if (day === null) {
    match = /^(\d{1,2})[\s\-/.]*([a-z]{3,9})[\s\-/.,]*(\d{2,4})$/.exec(raw);
    if (match && MONTHS[match[2]]) {
      day = Number(match[1]);
      month = MONTHS[match[2]];
      year = Number(match[3]);
    }
  }

  // Jul 4 2026 — rare on Indian statements but harmless to accept.
  if (day === null) {
    match = /^([a-z]{3,9})[\s\-/.]*(\d{1,2})[\s\-/.,]*(\d{2,4})$/.exec(raw);
    if (match && MONTHS[match[1]]) {
      month = MONTHS[match[1]];
      day = Number(match[2]);
      year = Number(match[3]);
    }
  }

  // 04/07/2026 — day first, always.
  if (day === null) {
    match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(raw);
    if (match) {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    }
  }

  if (day === null || month === null || year === null) return null;

  if (year < 100) year += year < 70 ? 2000 : 1900;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1990 || year > 2100) return null;

  // Reject impossible days rather than letting the calendar roll them over.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;

  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

/* ---------- what a column is for ---------- */

/* Every heading these five banks use for the same thing. Matching is on the
   heading text, so one reader serves every bank whose statement has headings. */
const COLUMN_ROLES = [
  ['date',        ['txn date', 'transaction date', 'tran date', 'date', 'post date', 'posting date']],
  ['valueDate',   ['value date', 'value dt', 'val date']],
  ['description', ['description', 'narration', 'particulars', 'transaction details',
                   'transaction remarks', 'remarks', 'details', 'transaction']],
  ['reference',   ['ref no', 'reference', 'cheque', 'chq', 'instrument', 'ref']],
  ['debit',       ['debit', 'withdrawal', 'withdrawals', 'withdrawal amt',
                   'withdrawal (dr)', 'paid out', 'dr']],
  ['credit',      ['credit', 'deposit', 'deposits', 'deposit amt',
                   'deposit (cr)', 'paid in', 'cr']],
  ['amount',      ['amount', 'transaction amount', 'amt']],
  // 'bal' because Axis heads the column exactly that.
  ['balance',     ['balance', 'closing balance', 'running balance', 'balance (inr)', 'bal']]
];

/** Work out what a heading means. Returns a role name, or null. */
export function readColumnRole(heading) {
  const text = String(heading || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;

  let best = null;
  let bestLength = 0;

  for (const [role, aliases] of COLUMN_ROLES) {
    for (const alias of aliases) {
      // Longest matching alias wins, so "value date" beats "date" and
      // "withdrawal amt" beats "amt".
      if (text === alias || text.startsWith(alias + ' ') || text.includes(alias)) {
        if (alias.length > bestLength) {
          best = role;
          bestLength = alias.length;
        }
      }
    }
  }

  return best;
}

/** Does this row of cells look like the heading row of a statement table? */
export function looksLikeHeader(cells) {
  const roles = new Set(
    cells.map((cell) => readColumnRole(cell)).filter(Boolean)
  );

  // A statement table always names a date, some money, and a balance.
  const hasDate = roles.has('date');
  const hasMoney = roles.has('debit') || roles.has('credit') || roles.has('amount');
  const hasBalance = roles.has('balance');

  return hasDate && hasMoney && hasBalance;
}
