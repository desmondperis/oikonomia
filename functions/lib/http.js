/* Small helpers shared by every endpoint. */

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  });
}

export function fail(message, status = 400) {
  return json({ error: message }, status);
}

/** The site's own origin, taken from the request rather than configuration. */
export function originOf(request) {
  return new URL(request.url).origin;
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function setCookie(name, value, { maxAge = 0, request }) {
  const secure = originOf(request).startsWith('https') ? ' Secure;' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie(name, request) {
  return setCookie(name, '', { maxAge: 0, request });
}

/** Random, unguessable, and short enough to sit in a cookie. */
export function randomId(bytes = 24) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
