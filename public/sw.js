// Bayou Protocol's service worker (registered by src/main.js on the published site only, never on the dev server).
// Maps, models, textures and sounds are large (a map is 20-120 MB) and keep their names between versions; the
// browser's own cache keeps little of them on phones (Safari drops big files first), so every visit downloaded
// them again. Here they are kept in the origin's storage:
//   - game assets (/game/...): from storage at once, refreshed in the background (a changed file arrives by the
//     next visit, the same as the site's own caching rule: Netlify's stale-while-revalidate)
//   - the code bundles (/assets/..., named by their content): from storage, fetched once
//   - the page itself and everything else: from the network, as before
// Bump VERSION to drop everything stored (a new name: the old store is deleted when this one takes over).
const VERSION = 'bp-v1';
const ASSETS = VERSION + '-game',
  CODE = VERSION + '-code';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) k.startsWith('bp-') && k !== ASSETS && k !== CODE && (await caches.delete(k));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  // (ranged requests, e.g. media seeking, are left to the browser)
  if (r.headers.has('range')) return;
  if (/\/game\//.test(u.pathname)) return void e.respondWith(stale(r, ASSETS, e));
  if (/\/assets\//.test(u.pathname)) return void e.respondWith(first(r, CODE));
});

// from storage at once; the network refreshes the stored copy behind it
async function stale(req, name, e) {
  const c = await caches.open(name),
    hit = await c.match(req, { ignoreSearch: !0 });
  // the refresh asks only whether the file changed (its ETag): an unchanged file costs a tiny 304, not a download
  // (an <img>'s request cannot carry the header: it is refreshed plainly)
  const tag = hit && req.mode !== 'no-cors' && hit.headers.get('etag'),
    net = fetch(tag ? new Request(req, { headers: { 'If-None-Match': tag }, cache: 'no-store' }) : req)
      .then((res) => (res && res.status === 200 && res.type === 'basic' ? (c.put(req, res.clone()).catch(() => {}), res) : res))
      .catch(() => null);
  if (hit) {
    e.waitUntil(net);
    return hit;
  }
  const res = await net;
  return res && res.status !== 304 ? res : Response.error();
}

// content-named: from storage when there, else fetched once and stored
async function first(req, name) {
  const c = await caches.open(name),
    hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  res && res.ok && res.type === 'basic' && c.put(req, res.clone()).catch(() => {});
  return res;
}
