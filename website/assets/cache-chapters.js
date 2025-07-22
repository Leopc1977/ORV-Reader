if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(registration => {
                console.log('SW registered with scope:', registration.scope);
            })
            .catch(err => {
                console.error('SW registration error:', err);
            });
    });
}

const stories = {
    orv: { start: 1, end: 551 },
    cont: { start: 553, end: 908 },
    side: { start: 1, end: 4 }
};

let isCaching = false;

async function cacheAllChapters(progressCallback) {
    const cache = await caches.open("orv-reader-cache-v1");

    const total = Object.values(stories)
        .reduce((sum, story) => sum + (story.end - story.start + 1), 0);

    let done = 0;
    let success = 0;

    for (const story in stories) {
        const { start, end } = stories[story];

        for (let i = start; i <= end; i++) {
            const chapterId = String(i);
            const url = `stories/${story}/read/ch_${chapterId}.html`;

            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response.clone());
                    success++;
                }
            } catch (err) {
                console.warn(`❌ Failed to cache ${url}`, err);
            }

            done++;
            if (progressCallback) progressCallback(done, total, success);
        }
    }

    console.log(`✅ Finished caching ${success}/${total} chapters.`);

    if (success < total) {
        throw new Error("Some chapters failed to cache.");
    }
}

function startCaching() {
    if (isCaching) return;
    isCaching = true;
    
    const container = document.getElementById('cachingContainer');

    const progressBar = document.createElement('progress');
    progressBar.id = 'cacheProgress';
    progressBar.value = 0;
    progressBar.max = 1;

    container.appendChild(progressBar);

    cacheAllChapters((done, total, success) => {
        const ratio = done / total;
        progressBar.value = ratio;
        progressBar.textContent = `${Math.round(ratio * 100)}%`;
    })
    .then(() => {
        progressBar.style.accentColor = "lightgreen";
    })
    .catch((error) => {
        progressBar.style.accentColor = "red";
        console.error("Error while caching chapters:", error);
        alert("An error occurred while caching the chapters.");
    })
    .finally(() => {
        isCaching = false;
    });    
}

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('cachingButton');
    button.addEventListener('click', startCaching);
});
