// Drug Drill offline support: try the network first so updates arrive, fall back to the saved copy with no signal.
const CACHE = 'drugdrill-v5';
const SHELL = ['./', './index.html', './app.css', './app.js', './data.json', './manifest.webmanifest', './icon-192.png', './icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('drugdrill-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && res.ok) cache.put(new Request(new URL(req.url).pathname), res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(new URL(req.url).pathname) || await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') { const idx = await cache.match('./index.html'); if (idx) return idx; }
      throw err;
    }
  })());
});
