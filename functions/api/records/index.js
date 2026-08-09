/* Syncing a household's records.
 *
 * Everything passing through here is already sealed. This endpoint moves opaque
 * blobs between a household's devices and cannot read one of them — the key is
 * derived on those devices from a phrase this server has never seen and has no
 * way to obtain.
 *
 * What it does see, and must, is which record changed and when. Sync needs that
 * to work at all. It does not see what any record says.
 */

import { json, fail, readCookie } from '../../lib/http.js';
import { ensureSchema, userForSession, householdFor } from '../../lib/db.js';

/* Enough for a year of a busy household in one go, without letting a single
   request become unbounded. */
const MOST_AT_ONCE = 500;

async function whoAndWhere(request, env) {
  await ensureSchema(env.DB);

  const user = await userForSession(env.DB, readCookie(request, 'oik_session'));
  if (!user) return { error: fail('Please sign in first.', 401) };

  const household = await householdFor(env.DB, user.id);
  if (!household) return { error: fail('Create or join a household first.', 409) };

  return { user, household };
}

/** Everything that has changed since the caller last looked. */
export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail('Syncing is not available yet.', 503);

  const { error, household } = await whoAndWhere(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const since = Number(url.searchParams.get('since')) || 0;

  const { results } = await env.DB
    .prepare(`SELECT id, updated_at, deleted, iv, body
              FROM records
              WHERE household_id = ? AND updated_at > ?
              ORDER BY updated_at
              LIMIT ?`)
    .bind(household.id, since, MOST_AT_ONCE + 1)
    .all();

  const rows = results || [];
  const more = rows.length > MOST_AT_ONCE;
  const page = more ? rows.slice(0, MOST_AT_ONCE) : rows;

  return json({
    // The server's own clock, so devices with wrong clocks still sync sanely.
    now: Date.now(),
    more,
    records: page.map((row) => ({
      id: row.id,
      updatedAt: row.updated_at,
      deleted: row.deleted === 1,
      iv: row.iv,
      body: row.body
    }))
  });
}

/**
 * Take in what a device has changed.
 *
 * Later always wins. Two people editing the same expense on the same day is
 * rare; silently losing one of their evenings' work would not be.
 */
export async function onRequestPost({ request, env }) {
  if (!env.DB) return fail('Syncing is not available yet.', 503);

  const { error, household } = await whoAndWhere(request, env);
  if (error) return error;

  let body;
  try { body = await request.json(); } catch { return fail('Could not read that request.'); }

  const incoming = Array.isArray(body.records) ? body.records : [];
  if (incoming.length > MOST_AT_ONCE) {
    return fail(`Too many records at once — send at most ${MOST_AT_ONCE}.`, 413);
  }

  const statements = [];

  for (const record of incoming) {
    const id = String(record.id || '').slice(0, 64);
    const updatedAt = Number(record.updatedAt);

    if (!id || !Number.isFinite(updatedAt)) continue;

    const deleted = record.deleted ? 1 : 0;

    // A deleted record keeps its place but loses its contents. There is no
    // reason for the server to hold a sealed body nobody will ever open.
    const iv = deleted ? null : String(record.iv || '').slice(0, 64);
    const sealed = deleted ? null : String(record.body || '').slice(0, 64000);

    if (!deleted && (!iv || !sealed)) continue;

    statements.push(
      env.DB
        .prepare(`INSERT INTO records (household_id, id, updated_at, deleted, iv, body)
                  VALUES (?, ?, ?, ?, ?, ?)
                  ON CONFLICT (household_id, id) DO UPDATE SET
                    updated_at = excluded.updated_at,
                    deleted = excluded.deleted,
                    iv = excluded.iv,
                    body = excluded.body
                  WHERE excluded.updated_at > records.updated_at`)
        .bind(household.id, id, updatedAt, deleted, iv, sealed)
    );
  }

  if (statements.length > 0) await env.DB.batch(statements);

  return json({ accepted: statements.length, now: Date.now() });
}
