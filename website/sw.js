const ASSETS_CACHE = "orv-assets-cache-v1"; // Do not change unless "filesToCache" is modified. 
const CHAPTER_CACHE = "orv-chapter-cache"; // Do not change unless the chapter structure is modified.

const filesToCache = [
    // -- Core files --
    '/', // Homepage
    '/404.html', // 404 page fallback
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

// Install event: Pre-cache essential files for offline usage
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache opened');
                return cache.addAll(filesToCache);
            })
            .then(() => self.skipWaiting()) // Activate worker immediately after installation
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [ASSETS_CACHE, CHAPTER_CACHE];

    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.map(name => {
                    if (!cacheWhitelist.includes(name)) {
                        // Delete caches that are not in whitelist
                        return caches.delete(name);
                    }
                    return null;
                })
            )
        ).then(() => self.clients.claim()) // Take control of clients immediately
    );
});

// Fetch event: Use Network First strategy
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Only cache valid responses (status 200 and basic type)
                if (networkResponse.ok && networkResponse.type === 'basic') {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            })
            .catch(async () => {
                const cached = await caches.match(event.request);
                if (cached) return cached;

                if (event.request.mode === 'navigate') {
                    return caches.match('/404.html');
                }

                return Response.error(); // Or your own fallback
            })
    );
});

