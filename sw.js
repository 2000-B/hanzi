const CACHE_NAME = 'hanzi-v5.2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/data/hsk1.json',
  '/data/hsk2.json',
  '/data/cedict.json',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// Install: cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Some assets failed to cache:', err);
        // Cache what we can — don't fail install on CDN issues
        return Promise.allSettled(ASSETS.map(url => cache.add(url)));
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app assets, network-first for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls (Anthropic, etc.)
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses for future offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — if it's a navigation, return the cached index
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
