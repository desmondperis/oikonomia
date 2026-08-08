/* Send someone to Google to sign in. */

import { originOf, setCookie, randomId, fail, setting } from '../../../lib/http.js';
import { authoriseUrl } from '../../../lib/google.js';

export async function onRequestGet({ request, env }) {
  const clientId = setting(env.GOOGLE_CLIENT_ID);
  if (!clientId) {
    return fail('Sign-in is not configured yet.', 503);
  }

  // A one-time value, held in a cookie and checked on the way back, so a
  // sign-in cannot be started by somebody else on a household's behalf.
  const state = randomId(16);
  const redirectUri = `${originOf(request)}/api/auth/google/callback`;

  return new Response(null, {
    status: 302,
    headers: {
      location: authoriseUrl({ clientId, redirectUri, state }),
      'set-cookie': setCookie('oik_state', state, { maxAge: 600, request }),
      'cache-control': 'no-store'
    }
  });
}
