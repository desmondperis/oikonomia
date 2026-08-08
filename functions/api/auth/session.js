/* Who is signed in, and which household they belong to. */

import { json, readCookie } from '../../lib/http.js';
import { ensureSchema, userForSession, householdFor, membersOf } from '../../lib/db.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ signedIn: false, configured: false });

  await ensureSchema(env.DB);

  const user = await userForSession(env.DB, readCookie(request, 'oik_session'));
  if (!user) return json({ signedIn: false, configured: Boolean(env.GOOGLE_CLIENT_ID) });

  const household = await householdFor(env.DB, user.id);
  const members = household ? await membersOf(env.DB, household.id) : [];

  return json({
    signedIn: true,
    configured: true,
    user: { name: user.name, email: user.email, picture: user.picture },
    household: household
      ? { code: household.code, name: household.name, role: household.role }
      : null,
    members: members.map((member) => ({
      name: member.name, email: member.email, picture: member.picture, role: member.role
    }))
  });
}
