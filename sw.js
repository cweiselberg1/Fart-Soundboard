// Service Worker for offline support
const CACHE_NAME = 'fartboard-v22';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/icon-192.png',
    '/fartboarduilogo.png',
    '/js/audio-engine.js',
    '/js/knob.js',
    '/js/app.js',
    '/sounds/classic.wav',
    '/sounds/squeaker.wav',
    '/sounds/rumbler.wav',
    '/sounds/machinegun.wav',
    '/sounds/bubbly.wav',
    '/sounds/thunderclap.wav',
    '/sounds/ripper.wav'
];

// Install - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
