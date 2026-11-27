// Call Questions offline support. Everything is saved on first visit and served from the phone,
// so the app opens instantly with or without signal. A new build has a new cache name and replaces the old one.
const CACHE = 'calls-9ece4e0df5';
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-180.png", "./icon-512.png", "./fonts/atkinson-hyperlegible-400.woff2", "./fonts/atkinson-hyperlegible-700.woff2", "./fonts/barlow-condensed-600.woff2", "./fonts/barlow-condensed-700.woff2"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('calls-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') { const idx = await cache.match('./index.html'); if (idx) return idx; }
      throw err;
    }
  })());
});
