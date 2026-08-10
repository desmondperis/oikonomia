/* Tests for keeping a household's phones in step.
 *
 * Two phones, one household, a stand-in server that behaves as the real one
 * does — including that it only ever holds sealed blobs.
 *
 * The failures being guarded against here are the quiet ones: a record that
 * comes back readable to the wrong household, a deletion that another phone
 * helpfully undoes, an edit that overwrites a newer one. None of those announce
 * themselves.
 */

const PHRASE = 'apple bread cedar dawn eagle fabric garden hammer island jacket ladder lemon';
const OTHER = 'lemon ladder jacket island hammer garden fabric eagle dawn cedar bread apple';
const CODE = 'PERIS19';

/* ---------- a stand-in for the server ---------- */

const server = { records: new Map(), check: null };

function serverGet(since) {
  const rows = [...server.records.values()]
    .filter((row) => row.updatedAt > since)
    .sort((a, b) => a.updatedAt - b.updatedAt);
  return { now: Date.now() + 1, more: false, records: rows };
}

function serverPost(records) {
  let accepted = 0;
  for (const record of records) {
    const existing = server.records.get(record.id);
    // Later wins, exactly as the real endpoint does.
    if (existing && existing.updatedAt >= record.updatedAt) continue;
    server.records.set(record.id, { ...record });
    accepted++;
  }
  return { accepted, now: Date.now() + 1 };
}

/* ---------- a stand-in for a phone ---------- */

function makeDevice() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

let device = makeDevice();

globalThis.localStorage = {
  getItem: (k) => device.getItem(k),
  setItem: (k, v) => device.setItem(k, v),
  removeItem: (k) => device.removeItem(k)
};

globalThis.fetch = async (url, options = {}) => {
  const path = String(url);
  const body = options.body ? JSON.parse(options.body) : null;

  const reply = (value) => ({ ok: true, status: 200, json: async () => value });

  if (path.startsWith('/api/households/check')) {
    if (options.method === 'POST') {
      if (server.check) return reply({ check: server.check, alreadySet: true });
      server.check = body;
      return reply({ check: body, alreadySet: false });
    }
    return reply({ check: server.check });
  }

  if (path.startsWith('/api/records')) {
    if (options.method === 'POST') return reply(serverPost(body.records));
    const since = Number(new URL(path, 'http://x').searchParams.get('since')) || 0;
    return reply(serverGet(since));
  }

  throw new Error(`unexpected request: ${path}`);
};

const { unlock, syncNow, resyncFromScratch, isUnlocked, markChanged } = await import('../public/sync.js');

/* ---------- checking ---------- */

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

/** Move to a fresh phone, with its own empty storage. */
function switchDevice() {
  device = makeDevice();
}

const at = (n) => 1767225600000 + n * 1000;

/* ---------- the head's phone records something ---------- */

let head = [
  { id: 'a1', paise: 62000, note: 'SWIGGY', at: at(1), updatedAt: at(1), direction: 'debit' },
  { id: 'a2', paise: 1800000, note: 'RENT', at: at(2), updatedAt: at(2), direction: 'debit' }
];

{
  const outcome = await unlock(PHRASE, CODE);
  check('the first phone sets the words for the household', outcome, 'first');
  check('and is unlocked', isUnlocked(), true);

  const result = await syncNow(head, (merged) => { head = merged; });
  check('both records go up', result.sent, 2);
  check('and nothing comes back it did not send', result.brought, 0);
  check('the server is holding two', server.records.size, 2);
}

{
  // What the server holds must reveal nothing.
  const stored = JSON.stringify([...server.records.values()]);
  check('the merchant is not in what is stored', stored.includes('SWIGGY'), false);
  check('nor is the rent', stored.includes('RENT'), false);
  check('nor is the amount', stored.includes('62000'), false);
  check('but the server knows there are records', server.records.size, 2);
}

/* ---------- the spouse's phone joins ---------- */

switchDevice();
let spouse = [];

{
  const outcome = await unlock(PHRASE, CODE);
  check('the second phone recognises the words', outcome, 'ready');

  resyncFromScratch();
  const result = await syncNow(spouse, (merged) => { spouse = merged; });

  check('both records arrive', result.brought, 2);
  check('and nothing was unreadable', result.unreadable, 0);
  check('the spouse sees the same two', spouse.length, 2);

  const swiggy = spouse.find((entry) => entry.id === 'a1');
  check('with the merchant intact', swiggy.note, 'SWIGGY');
  check('and the amount intact', swiggy.paise, 62000);
}

/* ---------- a phone with the wrong words ---------- */

switchDevice();
let stranger = [];

{
  const outcome = await unlock(OTHER, CODE);
  check('the wrong words are refused outright', outcome, 'wrong');
  check('and the phone stays locked', isUnlocked(), false);

  const result = await syncNow(stranger, (merged) => { stranger = merged; });
  check('so nothing syncs at all', result.synced, false);
  check('and it holds no records', stranger.length, 0);
}

/* ---------- the spouse adds something, the head sees it ---------- */

switchDevice();
spouse = [];

{
  await unlock(PHRASE, CODE);
  resyncFromScratch();
  await syncNow(spouse, (merged) => { spouse = merged; });

  spouse = [
    ...spouse,
    { id: 'b1', paise: 25000, note: 'BIGBASKET', at: at(10), updatedAt: at(10), direction: 'debit' }
  ];
  markChanged('b1');

  await syncNow(spouse, (merged) => { spouse = merged; });
  check('the new record reaches the server', server.records.size, 3);
}

switchDevice();
{
  await unlock(PHRASE, CODE);
  resyncFromScratch();

  let onHead = [];
  const result = await syncNow(onHead, (merged) => { onHead = merged; });

  check('the head now sees three', onHead.length, 3);
  const groceries = onHead.find((entry) => entry.id === 'b1');
  check("including the spouse's", groceries.note, 'BIGBASKET');
  void result;
}

/* ---------- removing something ---------- */

switchDevice();
{
  await unlock(PHRASE, CODE);
  resyncFromScratch();

  let phone = [];
  await syncNow(phone, (merged) => { phone = merged; });

  // Remove the rent, the way the app does — a marker, not a disappearance.
  phone = phone.map((entry) =>
    entry.id === 'a2' ? { id: 'a2', deleted: true, updatedAt: at(20) } : entry
  );
  markChanged('a2');

  await syncNow(phone, (merged) => { phone = merged; });

  const stored = server.records.get('a2');
  check('the server is told it has gone', stored.deleted, true);
  check('and keeps nothing of what it was', stored.body ?? null, null);
}

switchDevice();
{
  await unlock(PHRASE, CODE);
  resyncFromScratch();

  let other = [];
  await syncNow(other, (merged) => { other = merged; });

  const rent = other.find((entry) => entry.id === 'a2');
  check('the other phone learns it is gone', rent.deleted, true);
  check('rather than helpfully restoring it', rent.note ?? null, null);
  check('and it is not among the records shown',
    other.filter((entry) => !entry.deleted).length, 2);
}

/* ---------- two people editing the same thing ---------- */

switchDevice();
{
  await unlock(PHRASE, CODE);
  resyncFromScratch();

  let phone = [];
  await syncNow(phone, (merged) => { phone = merged; });

  // An older edit must not overwrite what is already there.
  phone = phone.map((entry) =>
    entry.id === 'a1' ? { ...entry, note: 'STALE EDIT', updatedAt: at(0) } : entry
  );
  markChanged('a1');

  await syncNow(phone, (merged) => { phone = merged; });

  let fresh = [];
  switchDevice();
  await unlock(PHRASE, CODE);
  resyncFromScratch();
  await syncNow(fresh, (merged) => { fresh = merged; });

  check('an older edit does not win', fresh.find((entry) => entry.id === 'a1').note, 'SWIGGY');
}

switchDevice();
{
  await unlock(PHRASE, CODE);
  resyncFromScratch();

  let phone = [];
  await syncNow(phone, (merged) => { phone = merged; });

  phone = phone.map((entry) =>
    entry.id === 'a1' ? { ...entry, note: 'SWIGGY DINNER', updatedAt: at(99) } : entry
  );
  markChanged('a1');

  await syncNow(phone, (merged) => { phone = merged; });

  let fresh = [];
  switchDevice();
  await unlock(PHRASE, CODE);
  resyncFromScratch();
  await syncNow(fresh, (merged) => { fresh = merged; });

  check('a newer edit does win', fresh.find((entry) => entry.id === 'a1').note, 'SWIGGY DINNER');
}

/* ---------- report ---------- */

if (failed > 0) {
  console.error(`\n${failed} of ${checks} sync checks failed.\n`);
  process.exit(1);
}

console.log(`✓ ${checks} household sync checks passed.`);
