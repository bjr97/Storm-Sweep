// Sweeper app service worker (scope /sweeper/). Network-first: pages always
// come fresh from the server; only when a page can't load at all (no signal)
// is the cached offline page shown. Nothing else is cached.
const CACHE = 'sweeper-offline-v1'
const OFFLINE_URL = '/sweeper-offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
})
