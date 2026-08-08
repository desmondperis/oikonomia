/* Turning ordinary speech into an expense.
 *
 * "Had a burger for 250"  ->  ₹250,  "Burger"
 * "took a cab two fifty"  ->  ₹250,  "Cab"
 * "milk eighty rupees"    ->  ₹80,   "Milk"
 *
 * This is deliberately ordinary code rather than an AI call. It runs instantly,
 * offline, at no cost, and — most importantly — it is predictable. Whatever it
 * works out is always shown for confirmation before anything is saved.
 */

const UNITS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

const MULTIPLIERS = {
  hundred: 100, hundreds: 100,
  thousand: 1000, thousands: 1000, k: 1000,
  lakh: 100000, lakhs: 100000, lac: 100000, lacs: 100000,
  crore: 10000000, crores: 10000000
};

const CURRENCY = /^(₹|rs|rs\.|rupee|rupees|inr|bucks|रु|रुपये|रुपए|रुपया)$/;

/* Devanagari digits, so a Hindi dictation of "३५०" reads as 350. Hindi number
   words are a larger job and belong with the Hindi version of the app. */
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

/* Words that carry no meaning once the amount is removed. Order matters only in
   that these are stripped from anywhere in the remaining phrase. */
const FILLER = new Set([
  'spent', 'spend', 'paid', 'pay', 'bought', 'buy', 'had', 'have', 'took',
  'take', 'got', 'get', 'gave', 'give', 'cost', 'costs', 'was', 'were', 'is',
  'for', 'on', 'of', 'at', 'to', 'a', 'an', 'the', 'some', 'about', 'around',
  'just', 'today', 'rupees', 'rupee', 'rs', 'inr', 'bucks', 'only', 'please',
  'add', 'record', 'expense', 'i', 'we', 'my', 'our', 'me', 'us'
]);

/** Normalise for matching without losing the original for display.
 *
 * Phone dictation writes "350rs" when you say "three hundred fifty rupees", and
 * "350/-" is how the amount is written on half the receipts in India. Both have
 * to come apart into a number and a currency word before anything else works.
 */
function tokenise(text) {
  return String(text)
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)))
    .replace(/[₹]/g, ' ₹ ')
    .replace(/(\d)\s*\/-/g, '$1 rs ')                       // 350/-
    .replace(/(\d)\s*(rs|rupees|rupee|inr)\b/g, '$1 $2 ')   // 350rs
    .replace(/\b(rs|rupees|rupee|inr)\s*(\d)/g, '$1 $2')    // rs350
    // \p{M} keeps Devanagari vowel marks attached; without it "सब्जी" loses its
    // matras and becomes unreadable.
    .replace(/[^\p{L}\p{M}\p{N}.,₹]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/* Digits that phone dictation writes when a person said an ordinary word.
   "ate a burger" becomes "8 a burger"; "for 350" becomes "4 350". Only applied
   to speech — someone typing "2 dosa 120" means the 2. */
const SPOKEN_HOMOPHONES = new Set(['8', '4', '2', '1']);

/** "1,250.50" -> 1250.5 ; returns null if not a plain number. */
function readDigits(token) {
  const cleaned = token.replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * Find every plausible amount in the token list.
 * Returns [{ value, from, to, marked }] where `marked` means a currency word
 * sat beside it — a strong signal that this number is the price.
 */
function findAmounts(tokens) {
  const found = [];

  for (let i = 0; i < tokens.length; i++) {
    // "2k", "1.5lakh" — a number and its multiplier written closed up
    const closed = /^(\d+(?:,\d+)*(?:\.\d+)?)(k|thousand|lakh|lakhs|lac|lacs|crore|crores)$/
      .exec(tokens[i]);

    const digits = closed
      ? Number(closed[1].replace(/,/g, ''))
      : readDigits(tokens[i]);

    if (digits === null || !Number.isFinite(digits)) continue;

    let value = closed ? digits * MULTIPLIERS[closed[2]] : digits;
    let to = i;

    // "1.5 k", "2 lakh" — multiplier as a separate word
    const next = tokens[i + 1];
    if (!closed && next && MULTIPLIERS[next]) {
      value *= MULTIPLIERS[next];
      to = i + 1;
    }

    const before = tokens[i - 1];
    const after = tokens[to + 1];
    const marked = Boolean(
      (before && CURRENCY.test(before)) || (after && CURRENCY.test(after))
    );

    found.push({ value, from: i, to, marked });
  }

  if (found.length > 0) return found;

  // No digits at all — try number words.
  for (let i = 0; i < tokens.length; i++) {
    if (!(tokens[i] in UNITS)) continue;

    let value = UNITS[tokens[i]];
    let to = i;

    // "two hundred", "three lakh"
    if (tokens[to + 1] && MULTIPLIERS[tokens[to + 1]]) {
      value *= MULTIPLIERS[tokens[to + 1]];
      to += 1;

      // "two hundred fifty"
      if (tokens[to + 1] && tokens[to + 1] in UNITS) {
        value += UNITS[tokens[to + 1]];
        to += 1;
      }
    } else if (
      value >= 1 && value <= 9 &&
      tokens[to + 1] && tokens[to + 1] in UNITS && UNITS[tokens[to + 1]] >= 10
    ) {
      // "two fifty" — how people actually say 250
      value = value * 100 + UNITS[tokens[to + 1]];
      to += 1;
    } else if (value >= 20 && tokens[to + 1] && UNITS[tokens[to + 1]] < 10) {
      // "eighty five"
      value += UNITS[tokens[to + 1]];
      to += 1;
    }

    const before = tokens[i - 1];
    const after = tokens[to + 1];
    const marked = Boolean(
      (before && CURRENCY.test(before)) || (after && CURRENCY.test(after))
    );

    found.push({ value, from: i, to, marked, spelled: true });
    i = to;
  }

  return found;
}

/** Choose which number is the price when a phrase contains several. */
function chooseAmount(candidates) {
  if (candidates.length === 0) return null;

  const marked = candidates.filter((c) => c.marked);
  if (marked.length > 0) return marked[marked.length - 1];

  // Otherwise the last number spoken is nearly always the price:
  // "2 dosa 120", "three books 850".
  return candidates[candidates.length - 1];
}

/** What is left once the amount is taken out becomes the description. */
function buildNote(tokens, amount, spoken) {
  // "ate a burger for 350 rs" arrives as "8 a burger for 350 rs". A stray digit
  // opening a spoken phrase, when the real amount sits elsewhere, is almost
  // always a misheard word rather than a quantity.
  const strayLeadingDigit =
    spoken &&
    SPOKEN_HOMOPHONES.has(tokens[0]) &&
    amount && amount.from > 0;

  const kept = tokens.filter((token, index) => {
    if (strayLeadingDigit && index === 0) return false;
    if (amount && index >= amount.from && index <= amount.to) return false;
    if (CURRENCY.test(token)) return false;
    if (FILLER.has(token)) return false;
    return true;
  });

  const note = kept.join(' ').replace(/\s*[.,]\s*$/, '').trim();
  if (!note) return '';
  return note.charAt(0).toUpperCase() + note.slice(1);
}

/**
 * Read a spoken or typed phrase.
 *
 * Returns { paise, note, confidence, heard }.
 *   paise      — whole paise, or null when no amount could be found
 *   confidence — 'high'   digits, clearly marked or unambiguous
 *                'medium' a number spelled out in words
 *                'none'   no amount found; the person must fill it in
 */
export function parseExpense(text, options = {}) {
  const spoken = options.spoken === true;
  const heard = String(text || '').trim();
  const tokens = tokenise(heard);

  const candidates = findAmounts(tokens);
  const amount = chooseAmount(candidates);
  const note = buildNote(tokens, amount, spoken);

  if (!amount || amount.value <= 0 || amount.value > 10_000_000) {
    return { paise: null, note, confidence: 'none', heard };
  }

  let confidence = amount.spelled ? 'medium' : 'high';
  if (!amount.spelled && candidates.length > 1 && !amount.marked) {
    confidence = 'medium';
  }

  return {
    paise: Math.round(amount.value * 100),
    note,
    confidence,
    heard
  };
}
