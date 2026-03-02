// SMARTCOT - SERVICE WORKER
const CACHE_NAME = 'smartcot-v1';
const urlsToCache = ['./', './index.html', './login.html', './styles.css', './app.js', './db.js', './calculator.js', './auth.js', './manifest.json'];

self.addEventListener('install', function(event) {
    console.log('🔧 SW: Instalando SmartCot...');
    event.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(urlsToCache); }).then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(event) {
    console.log('🔧 SW: Activando SmartCot...');
    event.waitUntil(caches.keys().then(function(cacheNames) { return Promise.all(cacheNames.map(function(cacheName) { if (cacheName !== CACHE_NAME && cacheName.startsWith('smartcot')) { return caches.delete(cacheName); } })); }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    event.respondWith(caches.match(event.request).then(function(response) {
        if (response) { return response; }
        return fetch(event.request).then(function(response) {
            if (!response || response.status !== 200) { return response; }
            var responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, responseToCache); });
            return response;
        });
    }));
});

console.log('✅ Service Worker SmartCot cargado');
