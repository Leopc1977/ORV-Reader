const stories = {
    orv: { start: 1, end: 551 },
    cont: { start: 553, end: 908 },
    side: { start: 1, end: 4 }
};

function getCachedChapters() {
    const raw = localStorage.getItem('cachedChapters');
    return raw ? JSON.parse(raw) : { orv: [], cont: [], side: [] };
}

function updateLocalProgress(story, chapterId) {
    const cached = getCachedChapters();
    if (!cached[story].includes(chapterId)) {
        cached[story].push(chapterId);
        localStorage.setItem('cachedChapters', JSON.stringify(cached));
    }
}

function updateProgressUI({ done, total }) {
    const progressBar = document.getElementById('cacheProgress');
    progressBar.value = done / total;
    progressBar.textContent = `${Math.round((done / total) * 100)}%`;
}

navigator.serviceWorker.addEventListener('message', event => {
    const { type, story, chapterId, progress } = event.data;
    if (type === 'chapter-cached') {
        updateLocalProgress(story, chapterId);
        updateProgressUI(progress);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('cachingButton');
    const container = document.getElementById('cachingContainer');

    button.addEventListener('click', () => {
        button.disabled = true;
        button.textContent = "Downloading...";

        let cacheProgress = document.getElementById('cacheProgress')
        if (!cacheProgress) {
            cacheProgress = document.createElement('progress');
            cacheProgress.id = 'cacheProgress';
            cacheProgress.max = 1;
            cacheProgress.value = 0;
            container.appendChild(cacheProgress);
        }

        navigator.serviceWorker.controller?.postMessage({
            action: 'startCachingChapters'
        });
    });

    // Register SW
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(reg => console.log("SW registered:", reg.scope))
            .catch(err => console.error("SW registration failed:", err));
    }
});
