const CACHE_NAME = 'ick-factor-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/i18n.js',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    './js/locales/ko.json',
    './js/locales/en.json',
    './js/locales/zh.json',
    './js/locales/hi.json',
    './js/locales/ru.json',
    './js/locales/ja.json',
    './js/locales/es.json',
    './js/locales/pt.json',
    './js/locales/id.json',
    './js/locales/tr.json',
    './js/locales/de.json',
    './js/locales/fr.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).then(response => {
            if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
            }
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
