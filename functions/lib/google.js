/* Signing in with Google.
 *
 * Only three permissions are asked for: who you are, your email, and your name.
 * Nothing about Google Drive is requested here — that comes later, separately,
 * and only if a household chooses to keep its documents there. Asking for less
 * at the front door is the whole point.
 */

const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';

export const SCOPES = ['openid', 'email', 'profile'];

export function authoriseUrl({ clientId, redirectUri, state }) {
  const parameters = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    // We do not need offline access to sign somebody in, so we do not ask for
    // it. A refresh token we never use is a refresh token we cannot leak.
    access_type: 'online',
    prompt: 'select_account'
  });

  return `${AUTH}?${parameters}`;
}

export async function exchangeCode({ code, clientId, clientSecret, redirectUri }) {
  const response = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error(`Google refused the sign-in (${response.status}).`);
  }

  return response.json();
}

/**
 * Read the identity out of Google's reply.
 *
 * The token comes straight from Google over TLS in a request we made, so the
 * claims are read rather than re-verified. Nothing is trusted from the browser.
 */
export function profileFromIdToken(idToken) {
  const [, payload] = String(idToken || '').split('.');
  if (!payload) throw new Error('Google did not return an identity.');

  const decoded = JSON.parse(
    atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  );

  if (!decoded.sub || !decoded.email) throw new Error('Google did not return an identity.');

  return {
    sub: decoded.sub,
    email: decoded.email,
    name: decoded.name || decoded.given_name || null,
    picture: decoded.picture || null
  };
}
