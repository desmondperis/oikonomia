/* Keeping a household's devices in step.
 *
 * Records are sealed here, on the device, before anything is sent. What travels
 * is unreadable to the server and to whoever runs it. What comes back is
 * unsealed here too.
 *
 * Nothing about this is required. A household that never signs in has a working
 * app; sync is what makes two phones show the same figures, and it stays out of
 * the way until somebody asks for it.
 */

import { deriveKey, seal, unseal, makeCheck, checkPasses, newPhrase, tidyPhrase } from './crypto.js';

const SINCE_KEY = 'oikonomia.syncedAt.v1';
const PHRASE_KEY = 'oikonomia.phrase.v1';

let key = null;
let householdCode = null;
let running = false;

/* ---------- the phrase, held on this device ---------- */

/* Kept so the app opens without asking every time. It is on the household's own
   phone, alongside the records it opens — a lock and its key in the same house.
   What it buys is that the server never has either. */
export function storedPhrase() {
  try { return localStorage.getItem(PHRASE_KEY); } catch { return null; }
}

function keepPhrase(phrase) {
  try { localStorage.setItem(PHRASE_KEY, tidyPhrase(phrase)); } catch { /* fine */ }
}

export function forgetPhrase() {
  try {
    localStorage.removeItem(PHRASE_KEY);
    localStorage.removeItem(SINCE_KEY);
  } catch { /* fine */ }
  key = null;
}

export function makePhrase() {
  return newPhrase();
}

export function isUnlocked() {
  return key !== null;
}

/* ---------- opening the household ---------- */

/**
 * Work out the key from a phrase, and check it against the household's token.
 *
 * Returns 'ready' when the phrase is right, 'wrong' when it is not, and
 * 'first' when this household has no token yet — meaning this device is
 * setting the phrase for everyone.
 */
export async function unlock(phrase, code) {
  householdCode = code;
  const candidate = await deriveKey(phrase, code);

  let token = null;
  try {
    const response = await fetch('/api/households/check');
    if (response.ok) token = (await response.json()).check;
  } catch {
    // Offline. Trust the phrase for now; the token is checked on the next sync.
    key = candidate;
    keepPhrase(phrase);
    return 'offline';
  }

  if (!token) {
    const made = await makeCheck(candidate);
    const response = await fetch('/api/households/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(made)
    });

    // Somebody else set it first. Check against theirs rather than assume.
    const answer = response.ok ? await response.json() : null;
    if (answer?.alreadySet && !(await checkPasses(candidate, answer.check))) return 'wrong';

    key = candidate;
    keepPhrase(phrase);
    return 'first';
  }

  if (!(await checkPasses(candidate, token))) return 'wrong';

  key = candidate;
  keepPhrase(phrase);
  return 'ready';
}

/* ---------- moving records ---------- */

function lastSynced() {
  try { return Number(localStorage.getItem(SINCE_KEY)) || 0; } catch { return 0; }
}

function rememberSynced(when) {
  try { localStorage.setItem(SINCE_KEY, String(when)); } catch { /* fine */ }
}

/**
 * Send up what has changed here, then bring down what changed elsewhere.
 *
 * `entries` is the household's records; `save` is handed the merged set. Later
 * wins, per record, by the time it was last touched.
 */
export async function syncNow(entries, save) {
  if (!key || running) return { synced: false, reason: 'not-ready' };
  running = true;

  try {
    const since = lastSynced();

    // Only what this device has touched since it last spoke to the server.
    const changed = entries.filter((entry) => (entry.updatedAt || entry.at || 0) > since);

    if (changed.length > 0) {
      const sealed = [];
      for (const entry of changed.slice(0, 400)) {
        if (entry.deleted) {
          sealed.push({ id: entry.id, updatedAt: entry.updatedAt, deleted: true });
        } else {
          const body = await seal(key, entry);
          sealed.push({
            id: entry.id,
            updatedAt: entry.updatedAt || entry.at,
            deleted: false,
            iv: body.iv,
            body: body.body
          });
        }
      }

      const push = await fetch('/api/records', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ records: sealed })
      });

      if (!push.ok) return { synced: false, reason: `push-${push.status}` };
    }

    const pull = await fetch(`/api/records?since=${since}`);
    if (!pull.ok) return { synced: false, reason: `pull-${pull.status}` };

    const { records, now, more } = await pull.json();

    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    let brought = 0;
    let unreadable = 0;

    for (const record of records) {
      const mine = byId.get(record.id);
      const mineAt = mine ? (mine.updatedAt || mine.at || 0) : 0;

      // Ours is newer. It will go up on the next push.
      if (mine && mineAt >= record.updatedAt) continue;

      if (record.deleted) {
        byId.set(record.id, { id: record.id, updatedAt: record.updatedAt, deleted: true });
        brought++;
        continue;
      }

      const opened = await unseal(key, record);

      if (!opened) {
        // Sealed with a different phrase than this device holds. Left alone
        // rather than dropped, so it is still there for whoever can open it.
        unreadable++;
        continue;
      }

      byId.set(record.id, { ...opened, id: record.id, updatedAt: record.updatedAt });
      brought++;
    }

    rememberSynced(now);
    save([...byId.values()]);

    return { synced: true, brought, sent: changed.length, unreadable, more };
  } catch (error) {
    return { synced: false, reason: String(error?.message || error).slice(0, 80) };
  } finally {
    running = false;
  }
}

/** Start again from the beginning — after joining, or changing phrase. */
export function resyncFromScratch() {
  rememberSynced(0);
}
