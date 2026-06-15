const CACHE_NAME = 'skulmanager-v2';
const STATIC_ASSETS = ['/', '/index.html'];

// Never cache requests to these external domains (avoids tracking-prevention warnings)
const SKIP_CACHE_DOMAINS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com',
  'onrender.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Skip non-http(s) schemes (e.g. chrome-extension://) — Cache API rejects them
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // Skip API calls — always go to network
  if (url.includes('/api/')) return;

  // Skip external CDN and API domains to avoid tracking-prevention issues
  if (SKIP_CACHE_DOMAINS.some(domain => url.includes(domain))) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        // For SPA navigation requests, fall back to cached index.html
        if (event.request.mode === 'navigate') {
          const cached = await caches.match('/index.html');
          return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
        const cached = await caches.match(event.request);
        return cached || new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
