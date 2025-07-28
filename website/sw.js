const ASSETS_CACHE = "orv-assets-cache-v1"; // Do not change unless "filesToCache" is modified.
const CHAPTER_CACHE = "orv-chapter-cache-v1";  // Do not change unless chapter structure changes.

const filesToCache = [
    // -- Core files --
    '/', // Homepage
    '/404.html', // 404 page fallback
    '/assets/manifest.json',
    '/assets/favicon.ico',

    // -- Main story pages --
    '/stories/index.html',
    '/stories/orv/index.html',
    '/stories/cont/index.html',
    '/stories/side/index.html',

    // -- CSS styles --
    '/assets/information.css',
    '/assets/landing.css',
    '/assets/stories.css',
    '/assets/reader.css',
    '/assets/reader-rich-text.css',

    // -- JS scripts --
    '/assets/information.js',
    '/assets/reader.js',
    '/assets/cache-chapters.js',

    // -- Icons --
    '/assets/icon512_maskable.png',
    '/assets/icon512_rounded.png',

    // -- Background images --
    '/assets/background-stars.jpg',
    '/assets/background-stars-mobile.jpg',

    // -- Story covers --
    '/assets/covers/orv.webp',
    '/assets/covers/cont.webp',
    '/assets/covers/side.webp',
    '/assets/od-stigma.webp',

    // -- Metadata files --
    '/meta/orv.json',
    '/meta/orv_meta.json',
    '/meta/cont.json',
    '/meta/cont_meta.json',
    '/meta/side.json',
    '/meta/side_meta.json',
];

// Install event: Pre-cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(ASSETS_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(filesToCache);
            })
            .then(() => self.skipWaiting())
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
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                    return null;
                })
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch event: Network First strategy
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    const isChapterWithoutHtml = url.pathname.match(/\/stories\/[^/]+\/read\/ch_\d+$/);
    const formattedUrl = isChapterWithoutHtml
        ? new URL(url.href + '.html')
        : url;

    event.respondWith(
        fetch(formattedUrl)
            .then(networkResponse => {
                if (networkResponse.ok && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    const isChapter = formattedUrl.pathname.match(/\/stories\/[^/]+\/read\/ch_\d+\.html$/);
                    const cacheName = isChapter ? CHAPTER_CACHE : ASSETS_CACHE;

                    caches.open(cacheName).then(cache => {
                        cache.put(formattedUrl.href, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(formattedUrl.href);
                if (cachedResponse) return cachedResponse;

                if (event.request.mode === 'navigate') {
                    return await caches.match('/404.html');
                }

                return Response.error();
            })
    );
});

const stories = {
    orv: { start: 1, end: 551 },
    cont: { start: 553, end: 908 },
    side: { start: 1, end: 4 }
};

self.addEventListener('message', async event => {
    if (event.data?.action === 'startCachingChapters') {
      cacheChaptersInBackground();
    }
});

async function cacheChaptersInBackground() {
    const cache = await caches.open(CHAPTER_CACHE);

    const chaptersToCache = [];
    for (const story in stories) {
        const { start, end } = stories[story];
        for (let i = start; i <= end; i++) {
            chaptersToCache.push({ story, chapterId: i });
        }
    }

    const total = chaptersToCache.length;
    let done = 0;
    let success = 0;

    for (const { story, chapterId } of chaptersToCache) {
        const url = `stories/${story}/read/ch_${chapterId}.html`;
        try {
            const res = await fetch(url);
            if (res.ok) {
                await cache.put(url, res.clone());
                success++;
                console.log(url, "cached")
                broadcastProgress({ story, chapterId, done, total, success });
            }
        } catch (_) { }

        done++;
        broadcastProgress({ story, chapterId, done, total, success });
    }
}

function broadcastProgress({ story, chapterId, done, total, success }) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'chapter-cached',
                story,
                chapterId,
                progress: { done, total, success }
            });
        });
    });
}
