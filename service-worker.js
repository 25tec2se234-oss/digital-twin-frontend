const CACHE_NAME = 'app-cache-8f3a9b1c5e7d2f40'; // Updated to bust cache

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Cache-first for hashed assets
  if (url.pathname.includes('/dist/') || url.pathname.match(/\.[0-9a-f]{8}\.(js|css)$/)) {
    e.respondWith(
      caches.match(e.request).then((response) => {
        return response || fetch(e.request).then((res) => {
          // Only cache successful responses
          if (res && res.status === 200 && res.type === 'basic') {
            const resToCache = res.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, resToCache);
            });
          }
          return res;
        });
      })
    );
  } else {
    // For HTML, API, and other dynamic content, always bypass cache
    e.respondWith(fetch(e.request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
