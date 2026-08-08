/* Sign out. The session row goes, so it really is over. */

import { json, readCookie, clearCookie } from '../../lib/http.js';
import { endSession } from '../../lib/db.js';

export async function onRequestPost({ request, env }) {
  if (env.DB) await endSession(env.DB, readCookie(request, 'oik_session'));

  return json({ signedOut: true }, 200, {
    'set-cookie': clearCookie('oik_session', request)
  });
}
