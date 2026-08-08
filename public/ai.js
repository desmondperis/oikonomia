/* Talking to OpenRouter.
 *
 * Two rules govern everything here.
 *
 * First, the AI never produces a number. It is asked what kind of thing a
 * merchant is, and nothing else. Totals, balances and budgets are arithmetic,
 * done on the device, and the AI is never allowed near them.
 *
 * Second, it only ever sees a merchant name — "SWIGGY", "APOLLO PHARMACY" —
 * with no amount, no date, no balance and nothing about the household. A shop
 * name on its own says nothing about anyone's finances, which is what makes it
 * safe to send to a free model whose provider may keep what it receives.
 */

const KEY_STORE = 'oikonomia.openrouter.key.v1';
const MODEL_STORE = 'oikonomia.openrouter.model.v1';
const LEARNED_STORE = 'oikonomia.categories.v1';

const ENDPOINT = 'https://openrouter.ai/api/v1';

/* Models known to follow instructions well and return clean short answers.
   The first that OpenRouter currently offers free is used. If none are on
   offer, any free instruction-following model is tried instead, so this keeps
   working as models come and go. */
const PREFERRED = [
  'deepseek/deepseek-chat-v3-0324:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.2-24b-instruct:free'
];

/* ---------- the household's key ---------- */

export function getKey() {
  try { return localStorage.getItem(KEY_STORE) || null; } catch { return null; }
}

export function setKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORE, key.trim());
    else localStorage.removeItem(KEY_STORE);
    return true;
  } catch { return false; }
}

export function hasKey() {
  return Boolean(getKey());
}

export function getModel() {
  try { return localStorage.getItem(MODEL_STORE) || null; } catch { return null; }
}

function setModel(slug) {
  try { localStorage.setItem(MODEL_STORE, slug); } catch { /* fine */ }
}

/* ---------- choosing a model ---------- */

/**
 * Ask OpenRouter what it currently offers and pick a free model.
 *
 * Doing this rather than naming one model in the code means the app keeps
 * working when a model is retired, which happens often on the free tier.
 */
export async function chooseModel(force = false) {
  const remembered = getModel();
  if (remembered && !force) return remembered;

  const response = await fetch(`${ENDPOINT}/models`);
  if (!response.ok) throw new Error(`OpenRouter did not answer (${response.status}).`);

  const { data } = await response.json();
  const free = new Set(
    (data || [])
      .filter((model) => /:free$/.test(model.id))
      .map((model) => model.id)
  );

  const chosen =
    PREFERRED.find((slug) => free.has(slug)) ||
    [...free].find((slug) => /instruct|chat|it:free/i.test(slug)) ||
    [...free][0];

  if (!chosen) throw new Error('OpenRouter has no free models available right now.');

  setModel(chosen);
  return chosen;
}

/* ---------- what the household has already been told ---------- */

function loadLearned() {
  try { return JSON.parse(localStorage.getItem(LEARNED_STORE) || '{}') || {}; }
  catch { return {}; }
}

function saveLearned(map) {
  try { localStorage.setItem(LEARNED_STORE, JSON.stringify(map)); } catch { /* fine */ }
}

/* Common Indian merchants, so the majority of transactions never need asking
   about at all. Free, instant, and it costs nothing to be wrong here because
   the household can always correct a category. */
const KNOWN = [
  [/swiggy|zomato|dominos|pizza|mcdonald|kfc|burger|restaurant|cafe|dhaba/i, 'Eating out'],
  [/bigbasket|blinkit|zepto|dmart|d-mart|grofers|kirana|grocer|super ?market|reliance fresh|more retail/i, 'Groceries'],
  [/uber|ola|rapido|auto|taxi|cab|metro|irctc|redbus|petrol|fuel|hp ?petro|indian oil|bharat petro/i, 'Transport'],
  [/apollo|pharmac|medical|hospital|clinic|doctor|medplus|netmeds|1mg|diagnostic/i, 'Health'],
  [/school|college|tuition|fees|academy|university|byju|unacademy/i, 'Education'],
  [/electricity|bescom|water|gas|lpg|indane|broadband|airtel|jio|vodafone|vi |bsnl|recharge|dth|tata ?play/i, 'Bills'],
  [/rent|landlord|maintenance|society/i, 'Rent'],
  [/salary|payroll|stipend|wages/i, 'Income'],
  [/lic |insurance|premium|policy/i, 'Insurance'],
  [/emi|loan|repayment|credit ?card|cc ?payment/i, 'Loan payment'],
  [/atm|cash ?w|self ?wdl|cash withdrawal/i, 'Cash withdrawn'],
  [/sip|mutual fund|zerodha|groww|upstox|nps|ppf|rd |fd |deposit/i, 'Savings and investing'],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|shop/i, 'Shopping'],
  [/temple|church|offering|donation|charity|tithe/i, 'Giving'],
  [/netflix|prime|hotstar|spotify|youtube|subscription/i, 'Subscriptions']
];

/** Everything the app can work out for itself, before the AI is troubled. */
export function categoriseLocally(description) {
  const text = String(description || '');
  if (!text.trim()) return null;

  const learned = loadLearned();
  const key = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (learned[key]) return learned[key];

  for (const [pattern, category] of KNOWN) {
    if (pattern.test(text)) return category;
  }

  return null;
}

/** Remember what the household said, so it is never asked twice. */
export function rememberCategory(description, category) {
  const learned = loadLearned();
  learned[String(description).toLowerCase().replace(/\s+/g, ' ').trim()] = category;
  saveLearned(learned);
}

/* ---------- asking the model ---------- */

const CATEGORIES = [
  'Eating out', 'Groceries', 'Transport', 'Health', 'Education', 'Bills',
  'Rent', 'Income', 'Insurance', 'Loan payment', 'Cash withdrawn',
  'Savings and investing', 'Shopping', 'Giving', 'Subscriptions', 'Other'
];

/**
 * Reduce a bank description to the merchant inside it.
 *
 * "UPI-SWIGGY-SWIGGY@YBL-YESB-418512345678" carries a payment address and a
 * reference number. Neither is any of a model's business, and stripping them
 * also makes the question shorter and the answer better.
 */
export function merchantOf(description) {
  return String(description || '')
    .replace(/\b\d{6,}\b/g, ' ')                 // reference numbers
    .replace(/[\w.-]+@[\w.-]+/g, ' ')            // UPI addresses
    .replace(/\b(upi|imps|neft|rtgs|dr|cr|ref|txn|no|to transfer|by transfer)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s&'-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/**
 * Ask the model to sort a list of merchant names.
 *
 * Only the names go. Returns a map of name to category; anything the model
 * returns that is not one of our categories is discarded rather than trusted.
 */
export async function categoriseWithAi(merchants, { signal } = {}) {
  const key = getKey();
  if (!key) throw new Error('No OpenRouter key has been added yet.');
  if (merchants.length === 0) return {};

  const model = await chooseModel();

  const prompt =
    'Sort each shop or payment name into exactly one category.\n\n' +
    `Categories: ${CATEGORIES.join(', ')}\n\n` +
    'Answer with one line per name, formatted exactly as: name = category\n' +
    'Do not add any other text.\n\n' +
    merchants.join('\n');

  const response = await fetch(`${ENDPOINT}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': location.origin,
      'X-Title': 'Oikonomia'
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 20 * merchants.length + 200,
      messages: [
        { role: 'system', content: 'You sort shop names into categories. You never invent numbers.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 401) throw new Error('That OpenRouter key was not accepted.');
    if (response.status === 429) throw new Error('OpenRouter is rate limiting the free model. Try again shortly.');
    throw new Error(`OpenRouter returned ${response.status}. ${detail.slice(0, 120)}`);
  }

  const body = await response.json();
  const text = body?.choices?.[0]?.message?.content || '';

  const known = new Set(CATEGORIES.map((c) => c.toLowerCase()));
  const result = {};

  for (const line of text.split('\n')) {
    const match = /^\s*(.+?)\s*=\s*(.+?)\s*$/.exec(line);
    if (!match) continue;

    const name = match[1].replace(/^[-*\d.\s]+/, '').trim();
    const category = match[2].trim();

    // Only categories we asked for are accepted. A model that invents one is
    // ignored rather than allowed to introduce a category nobody defined.
    if (known.has(category.toLowerCase()) && merchants.includes(name)) {
      result[name] = CATEGORIES.find((c) => c.toLowerCase() === category.toLowerCase());
    }
  }

  return result;
}

/** A quick round trip, to tell the household their key works. */
export async function testConnection() {
  const model = await chooseModel(true);
  const answer = await categoriseWithAi(['SWIGGY', 'APOLLO PHARMACY']);
  return {
    model,
    understood: Object.keys(answer).length,
    sample: answer
  };
}
