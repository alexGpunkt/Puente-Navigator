/* Puente Service Worker v0.7.0
   - Navigationen: network-first, Offline-Fallback auf index.html.
   - Eigene statische Dateien: stale-while-revalidate.
   - Same-origin Antworten erhalten COOP/COEP, damit lokales whisper.cpp/WASM
     mit SharedArrayBuffer auf statischem Hosting (z. B. GitHub Pages) laeuft.
   - Externe Urspruenge werden nicht vom Service Worker gecacht. */
const CACHE = "puente-v0.7.0";
const ASSETS = [
  "./", "index.html", "styles.css", "storage.js", "voice.js", "capture.js",
  "data.js", "features.js", "app.js", "manifest.webmanifest",
  "vendor/pdf-lib.min.js", "vendor/qrcode.min.js", "vendor/jszip.min.js",
  "vendor/pdfjs/pdf.min.js", "vendor/pdfjs/pdf.worker.min.js",
  "vendor/tesseract/tesseract.min.js", "vendor/tesseract/worker.min.js",
  "icons/icon.svg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(a => c.add(a)))).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

function isolated(res){
  if(!res || !res.ok || res.status===0)return res;
  try{
    const h=new Headers(res.headers);
    h.set("Cross-Origin-Opener-Policy","same-origin");
    h.set("Cross-Origin-Embedder-Policy","require-corp");
    h.set("Cross-Origin-Resource-Policy","same-origin");
    return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
  }catch(_){return res;}
}
function cacheable(req,res){return !!(res && res.ok && res.status===200 && req.method==="GET");}
async function cachedIsolated(key){const r=await caches.match(key);return r?isolated(r):null;}

self.addEventListener("fetch", e => {
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;

  if(req.mode==="navigate"){
    e.respondWith(fetch(req).then(res=>isolated(res)).then(res=>{
      if(cacheable(req,res))caches.open(CACHE).then(c=>c.put("index.html",res.clone())).catch(()=>{});
      return res;
    }).catch(()=>cachedIsolated("index.html").then(r=>r||cachedIsolated("./"))));
    return;
  }

  e.respondWith(caches.match(req).then(cached=>{
    const ciso=cached?isolated(cached):null;
    const network=fetch(req).then(res=>isolated(res)).then(res=>{
      if(cacheable(req,res))caches.open(CACHE).then(c=>c.put(req,res.clone())).catch(()=>{});
      return res;
    }).catch(()=>ciso);
    return ciso||network;
  }));
});
