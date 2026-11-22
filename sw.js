/* Service worker: la app funciona sin cobertura (gimnasios con sótano, parques…).
   Red primero con límite de 2,5 s; si no hay red, usa la copia guardada. */
const CACHE = 'cuaderno-gym-v1';
const FILES = ['./', 'index.html', 'app.js', 'exercises.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (req.method !== 'GET' || (url.origin !== location.origin && !isFont)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; });
    const timeout = new Promise(res => setTimeout(() => res(null), 2500));
    const fast = await Promise.race([net.catch(() => null), timeout]);
    if (fast) return fast;
    const cached = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
    return cached || net;
  })());
});
