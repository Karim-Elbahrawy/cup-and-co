/* Cup & Co — service worker
 *
 * Phase 8.1 of UPGRADE-PLAN.md.
 *
 * Caching strategy (kept minimal — we don't want to fight Next.js's
 * own asset optimization):
 *
 *   - /api/catalog       → stale-while-revalidate, 1h TTL on the
 *                           cached body so a refresh after offline
 *                           shows fresh data within an hour of being
 *                           back online
 *   - /products/:id      → same as /api/catalog
 *   - /images/products/* → cache-first, 7d TTL — images are content-
 *                           hashed by the customer-web build so this
 *                           is safe; CDN images (Phase 3.4) get the
 *                           same treatment via their immutable URLs
 *
 *   Everything else hits the network normally. We don't try to
 *   serve the app shell offline (Next.js dynamic routing makes this
 *   fragile); the OfflineIndicator UI handles the missing-shell case.
 */

const VERSION = 'v1';
const CATALOG_CACHE = `cup-co-catalog-${VERSION}`;
const IMAGE_CACHE = `cup-co-images-${VERSION}`;

const CATALOG_TTL_MS = 60 * 60 * 1000;       // 1 hour
const IMAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

self.addEventListener('install', (event) => {
  // Activate immediately on first install — no waiting on tabs to close.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old version caches.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.endsWith(VERSION) && k.startsWith('cup-co-'))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCatalogRequest(url) {
  // Match the API host + path. The fetch URL is the absolute URL.
  return /\/(catalog|products\/[^/]+)(\?.*)?$/.test(url.pathname);
}

function isImageRequest(url) {
  return (
    /\/images\/products\//.test(url.pathname) ||
    url.hostname === 'imagedelivery.net'
  );
}

function isFresh(response, ttlMs) {
  const dateHeader = response.headers.get('sw-cached-at');
  if (!dateHeader) return false;
  const age = Date.now() - Number(dateHeader);
  return age < ttlMs;
}

function withCacheTimestamp(response) {
  // Re-pack the response so we can attach our own header (the original
  // is immutable). We clone the body stream once.
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));
  return response.blob().then(
    (body) =>
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (isCatalogRequest(url)) {
    event.respondWith(handleCatalog(req));
    return;
  }
  if (isImageRequest(url)) {
    event.respondWith(handleImage(req));
    return;
  }
  // Everything else: pass through.
});

async function handleCatalog(req) {
  const cache = await caches.open(CATALOG_CACHE);
  const cached = await cache.match(req);

  // Stale-while-revalidate: serve cache immediately if fresh; kick off
  // a network refresh in the background regardless.
  const networkFetch = fetch(req)
    .then(async (res) => {
      if (res.ok) {
        const stamped = await withCacheTimestamp(res.clone());
        await cache.put(req, stamped);
      }
      return res;
    })
    .catch(() => null);

  if (cached && isFresh(cached, CATALOG_TTL_MS)) {
    // Fire-and-forget the refresh.
    networkFetch.catch(() => {});
    return cached;
  }

  // Stale or missing — wait on network. Fall back to stale cache if
  // network fails (offline mode).
  const fresh = await networkFetch;
  if (fresh && fresh.ok) return fresh;
  if (cached) return cached;
  return new Response(JSON.stringify({ error: 'offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleImage(req) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(req);
  if (cached && isFresh(cached, IMAGE_TTL_MS)) {
    return cached;
  }
  try {
    const fresh = await fetch(req);
    if (fresh.ok) {
      const stamped = await withCacheTimestamp(fresh.clone());
      cache.put(req, stamped).catch(() => {});
    }
    return fresh;
  } catch {
    if (cached) return cached;
    throw new Error('offline image');
  }
}
