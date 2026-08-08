/* Creating a household, or joining one with its code. */

import { json, fail, readCookie } from '../../lib/http.js';
import { ensureSchema, userForSession, createHousehold, joinHousehold, householdFor } from '../../lib/db.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return fail('Households are not available yet.', 503);

  await ensureSchema(env.DB);

  const user = await userForSession(env.DB, readCookie(request, 'oik_session'));
  if (!user) return fail('Please sign in first.', 401);

  let body;
  try { body = await request.json(); } catch { return fail('Could not read that request.'); }

  const existing = await householdFor(env.DB, user.id);
  if (existing) return json({ household: existing });

  if (body.action === 'join') {
    const joined = await joinHousehold(env.DB, user.id, body.code);
    if (!joined) return fail('No household has that code. Check it with whoever shared it.', 404);
    return json({ household: joined });
  }

  const name = String(body.name || '').trim().slice(0, 40);
  if (!name) return fail('Please give your household a name.');

  const created = await createHousehold(env.DB, user.id, name);
  return json({ household: created });
}
