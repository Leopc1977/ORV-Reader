const CACHE_NAME = "orv-reader-cache-v3"

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

// Fetch: try network first, fall back to cache (or 404 page for navigations)
self.addEventListener('fetch', event => {
    event.respondWith(handleFetch(event));
});

async function handleFetch(event) {
    try {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, networkResponse.clone());
        return networkResponse;
    } catch {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
            return caches.match('/404.html');
        }
        return Promise.reject('No cache match and no network available');
    }
}
