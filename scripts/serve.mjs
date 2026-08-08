/* A dependency-free static server for local development.
 *
 * Deliberately plain: no install, no network, nothing to break on a slow
 * connection. Cloudflare Pages serves `public/` in production; this serves the
 * same directory the same way while working locally.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const port = Number(process.env.PORT) || 4188;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');

  let file = join(root, path);

  // Refuse anything that escapes the served directory.
  if (!file.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    let info = await stat(file).catch(() => null);

    // Cloudflare Pages serves /app as app.html. Match that here, so a link that
    // works in production is not broken only while developing.
    if (!info && !extname(file)) {
      const asPage = `${file}.html`;
      const pageInfo = await stat(asPage).catch(() => null);
      if (pageInfo) { file = asPage; info = pageInfo; }
    }

    if (!info || info.isDirectory()) file = join(root, 'index.html');

    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}).listen(port, () => {
  console.log(`Oikonomia is running at http://localhost:${port}`);
});
