// Lightweight High-Speed Cache Service Worker
const CACHE_NAME = 'sky-logistics-v1';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

    // Fast Cache-First Strategy for static CSS/JS/Fonts/Images
    if (url.pathname.includes('/build/') || url.pathname.includes('/images/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.woff2')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
                    }
                    return networkResponse;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
    }
});
