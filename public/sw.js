// Minimal runtime-caching service worker so the app shell works offline after
// the first visit. Satellite tiles are intentionally NOT cached (they are large
// and external) — the game needs a network connection to fetch imagery.
const CACHE = 'city-from-satellite-v4'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Only handle same-origin requests; let tiles and other cross-origin assets
  // go straight to the network.
  if (url.origin !== self.location.origin) return

  // Always prefer the latest HTML so new hashed app bundles take effect on the
  // first reload after deployment. Fall back to cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const response = await fetch(req)
          if (response.status === 200) cache.put(req, response.clone())
          return response
        } catch {
          return (await cache.match(req)) ?? Response.error()
        }
      }),
    )
    return
  }

  // Stale-while-revalidate: serve cache fast, refresh in the background.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
