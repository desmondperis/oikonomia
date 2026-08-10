/* Changing the plan by saying what you want.
 *
 *   "increase eating out to 5000"
 *   "we need 15000 for school next month"
 *   "cut transport by 500"
 *   "I want to save 10000 every month"
 *
 * The sentence is understood here; not one figure in the result comes from a
 * model. What a change costs elsewhere is worked out by the budget engine, as
 * it already is when somebody types a number into a box.
 *
 * Ordinary rules go first and handle nearly everything, so this works offline
 * and costs nothing. The assistant is asked only about a sentence the rules
 * cannot make sense of — and is asked to name a category and an amount, never
 * to decide what a household can afford.
 */

import { parseExpense } from './nlp.js';
import { CATEGORIES } from './framework.js';
import { getKey, chooseModel } from './ai.js';

/* Everyday words for the categories. A household says "food" and "petrol", not
   "Groceries" and "Transport". */
const NAMES = [
  ['Eating out',            /eating ?out|restaurant|hotel|swiggy|zomato|order(ing)? food|outside food/],
  ['Groceries',             /grocer|ration|vegetable|kirana|food shopping|provisions|sabzi|milk/],
  ['Transport',             /transport|petrol|diesel|fuel|travel|auto|bus|train|cab|taxi|uber|ola/],
  ['Bills',                 /bill|electric|current|water|gas|phone|mobile|internet|recharge|dth/],
  // \b matters here: without it "current bill" reads as rent, because the
  // letters are inside "current". A household saying "the current bill went up"
  // means electricity.
  ['Rent',                  /\brent\b|house payment|home loan/],
  ['Health',                /health|medical|medicine|doctor|hospital|clinic/],
  ['Education',             /education|school|college|tuition|fees|books|study/],
  ['Insurance',             /insurance|premium|policy|lic/],
  ['Loan payment',          /loan|emi|instal?ment|debt|repay/],
  ['Giving',                /giving|church|charity|donat|offering|tithe|help(ing)? (people|family)/],
  ['Savings and investing', /saving|save|invest|sip|deposit|put aside|set aside/],
  ['Shopping',              /shopping|clothes|clothing|dress|gadget/],
  ['Subscriptions',         /subscription|netflix|prime|hotstar|spotify/],
  ['Cash withdrawn',        /cash|atm|withdraw/]
];

/** Which part of the plan a sentence is about. */
export function categoryIn(text) {
  const said = String(text).toLowerCase();

  /* An exact category name wins over a loose word for one — but it has to be
     the whole word. Checking whether the sentence merely contains the letters
     reads "the current bill" as rent. */
  for (const category of CATEGORIES) {
    const name = category.id.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${name}\\b`).test(said)) return category.id;
  }

  for (const [id, pattern] of NAMES) {
    if (pattern.test(said)) return id;
  }

  return null;
}

/* Which way the sentence points. "Increase to 5000" and "increase by 5000" are
   different instructions and confusing them is somebody's grocery budget. */
const RAISE = /\b(increase|raise|more|up|add|extra|higher|bump)\b/;
const LOWER = /\b(reduce|cut|lower|less|decrease|down|trim|drop)\b/;
const BY = /\bby\b/;

/* The difference between "increase eating out **to** 5000" and "add 1000 more
   **to** groceries" is which word the amount hangs off. In the first it follows
   "to" and names the new total; in the second "to" points at the category and
   the amount is an addition. Getting this backwards rewrites somebody's budget,
   so it is decided by where the number sits, not by the word being present. */
const AMOUNT_AFTER_TO =
  /\b(?:to|at|make it|set (?:it )?(?:to|at)?)\s*(?:₹|rs\.?|inr)?\s*(?:\d|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh)/;

/**
 * Read an instruction.
 *
 * Returns { category, mode, paise } where mode is 'set', 'raise' or 'lower',
 * or null when the sentence does not say enough to act on.
 */
export function readInstruction(text) {
  const said = String(text || '').trim();
  if (!said) return null;

  const category = categoryIn(said);
  if (!category) return null;

  // The amount is read by the same code that reads a spoken expense, so
  // "five thousand", "5k" and "5,000" all work here too.
  const amount = parseExpense(said);
  if (amount.paise === null) return null;

  const lowered = said.toLowerCase();
  let mode = 'set';

  if (BY.test(lowered) && (RAISE.test(lowered) || LOWER.test(lowered))) {
    mode = LOWER.test(lowered) ? 'lower' : 'raise';
  } else if (AMOUNT_AFTER_TO.test(lowered)) {
    mode = 'set';
  } else if (LOWER.test(lowered)) {
    mode = 'lower';
  } else if (RAISE.test(lowered)) {
    mode = 'raise';
  }

  return { category, mode, paise: amount.paise, said };
}

/**
 * Ask the assistant about a sentence the rules could not read.
 *
 * It is given the sentence and the list of categories, and asked for a category
 * and an amount — nothing about the household's money, and no say over whether
 * the change is wise. If it answers with anything outside the list, the answer
 * is discarded.
 */
export async function readWithAssistant(text) {
  const key = getKey();
  if (!key) return null;

  try {
    const model = await chooseModel();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Oikonomia'
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 60,
        messages: [
          {
            role: 'system',
            content:
              'You turn a sentence about a household budget into three fields and nothing else.\n' +
              `category: one of ${CATEGORIES.map((c) => c.id).join(', ')}\n` +
              'mode: set, raise or lower\n' +
              'amount: the number of rupees, digits only\n' +
              'Answer exactly as: category | mode | amount\n' +
              'If the sentence does not name a category and an amount, answer: none'
          },
          { role: 'user', content: String(text).slice(0, 200) }
        ]
      })
    });

    if (!response.ok) return null;

    const body = await response.json();
    const said = body?.choices?.[0]?.message?.content?.trim() || '';

    const parts = said.split('|').map((part) => part.trim());
    if (parts.length !== 3) return null;

    const category = CATEGORIES.find(
      (item) => item.id.toLowerCase() === parts[0].toLowerCase()
    );
    if (!category) return null;

    const mode = ['set', 'raise', 'lower'].includes(parts[1].toLowerCase())
      ? parts[1].toLowerCase()
      : 'set';

    const rupees = Number(String(parts[2]).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(rupees) || rupees <= 0 || rupees > 10_000_000) return null;

    return { category: category.id, mode, paise: Math.round(rupees * 100), said: text };
  } catch {
    return null;
  }
}

/** What the instruction means for a line that currently holds `plannedPaise`. */
export function amountAfter(instruction, plannedPaise) {
  const current = Number(plannedPaise) || 0;

  if (instruction.mode === 'raise') return current + instruction.paise;
  if (instruction.mode === 'lower') return Math.max(0, current - instruction.paise);
  return instruction.paise;
}
