/* Oikonomia service worker.
 *
 * Its job is to make the app open on a bad connection or none at all. It caches
 * the shell and nothing else; household data lives in the device's own storage,
 * never in here.
 *
 * One rule matters more than the rest: a failed request for a script or an
 * image must fail. Handing back index.html instead — which an earlier version
 * did — means a module import silently receives a web page, and the failure
 * surfaces somewhere far away and makes no sense. That is exactly how statement
 * reading broke on a phone.
 */

const CACHE = 'oikonomia-shell-v14';

/* Pages are cached at the addresses they are actually visited at — Cloudflare
   serves /app rather than /app.html, and caching the redirect instead of the
   page would leave the app unopenable offline. */
const SHELL = [
  './',
  'app',
  'about',
  'privacy',
  'terms',
  'contact',
  'styles.css',
  'app.js',
  'shell.js',
  'ask.js',
  'nlp.js',
  'money.js',
  'import.js',
  'ai.js',
  'survey.js',
  'i18n.js',
  'framework.js',
  'engine.js',
  'budget.js',
  'plan.js',
  'statements/fields.js',
  'statements/table.js',
  'statements/csv.js',
  'statements/statement.js',
  'statements/banks.js',
  'statements/pdf.js',
  'statements/ocr.js',
  'statements/spreadsheet.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

/* The PDF reader is over a megabyte, so it is fetched after the app is already
   usable rather than holding up the first load. Being cached before anyone
   uploads a statement is what makes reading one work on a weak connection.

   The scanned-page reader is six megabytes and most households will never need
   it, so it is deliberately not fetched here. It is cached the first time
   somebody opens a statement that turns out to be a picture. */
const HEAVY = [
  'vendor/pdf.min.mjs',
  'vendor/pdf.worker.min.mjs'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();

    // Quietly, and never fatally: missing this only costs one slow first read.
    const cache = await caches.open(CACHE);
    await Promise.allSettled(HEAVY.map((path) => cache.add(path)));
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);

      // Only keep good responses. A 404 cached is a 404 for ever.
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }

      return response;
    } catch (networkError) {
      const hit = await caches.match(request);
      if (hit) return hit;

      // Opening the app offline should still show the app.
      if (request.mode === 'navigate') {
        const path = new URL(request.url).pathname;
        const wanted = path === '/' || path === '/index.html' ? './' : 'app';
        const shell = await caches.match(wanted) || await caches.match('app');
        if (shell) return shell;
      }

      // Anything else must fail honestly rather than pretend to be a page.
      throw networkError;
    }
  })());
});
