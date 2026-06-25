// Service Worker — Mundial 2026
// Estrategia: app shell cacheada (offline) + data.json siempre desde la red.
const CACHE = "mundial2026-v1";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // data.json: red primero (para ver la actualización diaria), cache como respaldo offline
  if (url.pathname.endsWith("data.json")) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Resto: cache primero, red como respaldo
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
