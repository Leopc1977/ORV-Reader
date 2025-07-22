const CACHE_NAME = "orv-reader-cache-v1"

const filesToCache = [
    // -- Core files --
    '/', // Homepage
    '/404.html', // 404 page
    '/assets/manifest.json',
    '/assets/favicon.ico',

    // -- Main story pages --
    '/stories/orv/index.html',
    '/stories/cont/index.html',
    '/stories/side/index.html',
  
    // -- CSS styles --
    '/assets/information.css',
    '/assets/reader.css',
    '/assets/reader-rich-text.css',
  
    // -- JS scripts --
    '/assets/information.js',
    '/assets/reader.js',
  
    // -- Images and media --
    '/assets/covers/orv.webp',
    '/assets/covers/cont.webp',
    '/assets/covers/side.webp',
    '/assets/od-stigma.webp',
];

// Installation: pre-cache essential files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache opened');
                return cache.addAll(filesToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation: delete old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.map(name => {
                    if (!cacheWhitelist.includes(name)) {
                        return caches.delete(name);
                    }
                    return null;
                })
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: serve cached content when available, else fetch from network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }
            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('/404.html');
                }
                return Promise.reject('no-match-in-cache-and-no-network');
            });
        })
    );
});
