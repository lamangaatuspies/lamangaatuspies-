// Service Worker de "La Manga a tus pies"
// Estrategia: solo se ocupa de la "carcasa" de la app (HTML, manifest, iconos).
// Todo lo demás -GeoJSON con cache-busting, feeds de 112 Murcia, farmacias,
// temperatura del agua, fuentes/Leaflet de CDN- se deja pasar sin tocar,
// tal como ya lo gestiona el propio index.html.

const CACHE_NAME = 'lamanga-shell-v1';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/favicon.ico',
  '/favicon.png'
];

// --- Instalación: precachea la carcasa ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => console.warn('SW precache falló:', err))
  );
  self.skipWaiting();
});

// --- Activación: limpia cachés de versiones anteriores ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// --- Fetch: network-first solo para la carcasa; todo lo demás, intacto ---
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCoreAsset = isSameOrigin && CORE_ASSETS.includes(url.pathname);
  const isNavigation = request.mode === 'navigate';

  // Cualquier otra petición (datos en vivo, CDNs externos, fuentes, etc.)
  // se deja pasar tal cual, sin intervención del Service Worker.
  if (!isNavigation && !isCoreAsset) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(isNavigation ? '/index.html' : request)
      )
  );
});
