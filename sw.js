/* Puente Service Worker v0.4.1
   Strategie:
   - Navigationen: network-first (sonst erreicht kein Update mehr das Geraet),
     bei fehlender Verbindung Fallback auf die gecachte index.html.
   - Eigene statische Dateien: stale-while-revalidate.
   - Fremde Herkunft (CDN fuer Tesseract/PDF.js/JSZip): nicht cachen. */
const CACHE = "puente-v0.4.1";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "loader.js",
  "styles-base.css",
  "styles-workspace.css",
  "styles-mobile.css",
  "icons/icon.svg",
  "icons/maskable.svg",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "chunks/data-01.txt",
  "chunks/data-02.txt",
  "chunks/data-03.txt",
  "chunks/data-04.txt",
  "chunks/data-05.txt",
  "chunks/data-06.txt",
  "chunks/data-07.txt",
  "chunks/data-08.txt",
  "chunks/app-01.txt"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheable(req, res) {
  return res && res.ok && res.type === "basic" && res.status === 200 && req.method === "GET";
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // chrome-extension:, blob:, data: und alle CDNs unangetastet lassen.
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (cacheable(req, res)) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("index.html", copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (cacheable(req, res)) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
