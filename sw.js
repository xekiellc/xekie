const CACHE_NAME = 'xekie-v1';

// Core shell — cache these on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/request.html',
  '/dashboard.html',
  '/radar.html',
  '/login.html',
  '/categories.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap'
];

// Install — cache shell assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first for API/Supabase, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network for Supabase, Netlify functions, analytics
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/.netlify/functions') ||
    url.hostname.includes('googletagmanager') ||
    url.hostname.includes('google-analytics') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Cache first for fonts and icons
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Network first with cache fallback for HTML pages
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
