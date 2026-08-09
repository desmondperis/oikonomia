/* The household's sealed check token.
 *
 * A small known phrase, sealed with the household's key. It lets a phone joining
 * a household say "that recovery phrase is wrong" straight away, rather than
 * downloading records it cannot open and leaving somebody staring at an empty
 * app wondering what went wrong.
 *
 * It gives nothing away: the same known words for every household, sealed with
 * a key this server does not have.
 */

import { json, fail, readCookie } from '../../lib/http.js';
import { ensureSchema, userForSession, householdFor } from '../../lib/db.js';

async function whoAndWhere(request, env) {
  await ensureSchema(env.DB);

  const user = await userForSession(env.DB, readCookie(request, 'oik_session'));
  if (!user) return { error: fail('Please sign in first.', 401) };

  const household = await householdFor(env.DB, user.id);
  if (!household) return { error: fail('Create or join a household first.', 409) };

  return { user, household };
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ check: null });

  const { error, household } = await whoAndWhere(request, env);
  if (error) return error;

  const row = await env.DB
    .prepare('SELECT iv, body FROM household_check WHERE household_id = ?')
    .bind(household.id)
    .first();

  return json({ check: row ? { iv: row.iv, body: row.body } : null });
}

/**
 * Set the token, once.
 *
 * It is never replaced. Overwriting it would let anyone in the household lock
 * everybody else out of records they can no longer open, by setting a token for
 * a phrase only they know.
 */
export async function onRequestPost({ request, env }) {
  if (!env.DB) return fail('Syncing is not available yet.', 503);

  const { error, household } = await whoAndWhere(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail('Could not read that request.'); }

  const iv = String(body.iv || '').slice(0, 64);
  const sealed = String(body.body || '').slice(0, 1024);
  if (!iv || !sealed) return fail('That is not a usable check token.');

  const existing = await env.DB
    .prepare('SELECT iv, body FROM household_check WHERE household_id = ?')
    .bind(household.id)
    .first();

  if (existing) {
    return json({ check: { iv: existing.iv, body: existing.body }, alreadySet: true });
  }

  await env.DB
    .prepare('INSERT INTO household_check (household_id, iv, body, set_at) VALUES (?, ?, ?, ?)')
    .bind(household.id, iv, sealed, Date.now())
    .run();

  return json({ check: { iv, body: sealed }, alreadySet: false });
}
