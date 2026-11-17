// KIZUNA Progressive Web App (PWA) Service Worker - Offline Ready v4
const CACHE_NAME = 'kizuna-pwa-v4';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Bỏ qua các kết nối WebChannel / API của Firestore, Chrome Extension, và Probe kiểm tra mạng thực tế
  if (
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.searchParams.has('_t') ||
    url.searchParams.has('_probe')
  ) {
    return;
  }

  // Đối với request tải trang (navigate): Ưu tiên mạng, nếu mất mạng thì trả về index.html từ cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone).catch(() => {}));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/index.html');
          if (rootCached) return rootCached;
          return new Response('Offline', { status: 200, headers: { 'Content-Type': 'text/html' } });
        })
    );
    return;
  }

  // Đối với các static assets (js, css, images, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === self.location.origin || url.pathname.includes('/assets/') || url.pathname.endsWith('.json') || url.pathname.endsWith('.webp'))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Khi mất mạng và asset chưa có trong cache:
          // Không trả về JSON 503 làm vỡ cú pháp script/css
          if (request.destination === 'style') {
            return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
          }
          if (request.destination === 'script') {
            return new Response('/* offline */', { status: 200, headers: { 'Content-Type': 'application/javascript' } });
          }
          return new Response('', { status: 404 });
        });
    })
  );
});
