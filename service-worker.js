// service-worker.js — cache-first shell, network-first for API calls
const CACHE_NAME = 'qualifood-shell-v2';
const SHELL_FILES = [
  '/', '/index.html', '/style.css', '/manifest.json',

  // CSS (all files @imported by style.css)
  '/css/variables.css', '/css/reset.css', '/css/components.css', '/css/splash.css',
  '/css/login.css', '/css/dashboard.css', '/css/inspection.css', '/css/analytics.css',
  '/css/ai.css', '/css/reports.css', '/css/laboratory.css', '/css/inventory.css',
  '/css/profile.css', '/css/settings.css', '/css/animations.css', '/css/responsive.css',

  // JS (all files loaded by index.html, in load order)
  '/js/utils.js', '/js/api.js', '/js/database.js', '/js/offline.js',
  '/js/language.js', '/js/theme.js', '/js/auth.js', '/js/splash.js',
  '/js/dashboard.js', '/js/haccp.js', '/js/risk-calculator.js', '/js/inspection.js',
  '/js/camera.js', '/js/barcode.js', '/js/voice.js', '/js/gps.js',
  '/js/rag.js', '/js/ai.js', '/js/charts.js', '/js/analytics.js',
  '/js/laboratory.js', '/js/inventory.js', '/js/supplier.js', '/js/recall.js',
  '/js/reports.js', '/js/notifications.js', '/js/profile.js', '/js/settings.js',
  '/js/pwa.js', '/js/app.js',

  // Icons referenced by manifest.json
  '/icons/icon-72.png', '/icons/icon-96.png', '/icons/icon-128.png', '/icons/icon-144.png',
  '/icons/icon-152.png', '/icons/icon-192.png', '/icons/icon-384.png', '/icons/icon-512.png',
  '/icons/maskable-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache files individually so one missing/renamed asset doesn't fail the whole install.
      Promise.all(
        SHELL_FILES.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] failed to cache', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.url.includes('/api/')) {
    // Network-first for API/AI calls, falling back to a friendly offline signal
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }
  // Cache-first for the app shell, with a network fallback that also
  // updates the cache so the shell stays fresh across deploys.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      });
    })
  );
});
