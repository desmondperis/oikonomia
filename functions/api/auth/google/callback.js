/* Google sends the household back here. */

import { originOf, readCookie, setCookie, clearCookie, setting } from '../../../lib/http.js';
import { exchangeCode, profileFromIdToken } from '../../../lib/google.js';
import { ensureSchema, upsertUser, createSession } from '../../../lib/db.js';

function backToLanding(request, reason) {
  return new Response(null, {
    status: 302,
    headers: {
      location: `${originOf(request)}/?trouble=${encodeURIComponent(reason)}`,
      'set-cookie': clearCookie('oik_state', request),
      'cache-control': 'no-store'
    }
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readCookie(request, 'oik_state');

  if (url.searchParams.get('error')) return backToLanding(request, 'cancelled');
  if (!code || !state || state !== expected) return backToLanding(request, 'expired');

  try {
    const tokens = await exchangeCode({
      code,
      clientId: setting(env.GOOGLE_CLIENT_ID),
      clientSecret: setting(env.GOOGLE_CLIENT_SECRET),
      redirectUri: `${originOf(request)}/api/auth/google/callback`
    });

    const profile = profileFromIdToken(tokens.id_token);

    await ensureSchema(env.DB);
    const userId = await upsertUser(env.DB, profile);
    const sessionId = await createSession(env.DB, userId);

    const headers = new Headers({
      location: `${originOf(request)}/app`,
      'cache-control': 'no-store'
    });
    headers.append('set-cookie', setCookie('oik_session', sessionId, { maxAge: 60 * 24 * 60 * 60, request }));
    headers.append('set-cookie', clearCookie('oik_state', request));

    return new Response(null, { status: 302, headers });
  } catch {
    return backToLanding(request, 'failed');
  }
}
