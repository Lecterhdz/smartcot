// ─────────────────────────────────────────────────────────────────────
// SMARTCOT v2.0 - SERVICE WORKER (OFFLINE-FIRST)
// ─────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'smartcot-v2';
const CACHE_VERSION = '2026-01';

const urlsToCache = [
    './',
    './index.html',
    './login.html',
    './styles.css',
    './db.js',
    './app.js',
    './auth.js',
    './calculator.js',
    './utils.js',
    './importador_excel_smartcot.js',
    './manifest.json',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
    'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalar Service Worker
self.addEventListener('install', function(event) {
    console.log('🔧 SW: Instalando SmartCot...', CACHE_NAME);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('🔧 SW: Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(function() {
                console.log('🔧 SW: Archivos cacheados');
                return self.skipWaiting();
            })
            .catch(function(error) {
                console.error('🔧 SW: Error al cachear:', error);
            })
    );
});

// Activar Service Worker
self.addEventListener('activate', function(event) {
    console.log('🔧 SW: Activando SmartCot...', CACHE_NAME);
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('smartcot')) {
                        console.log('🔧 SW: Borrando cache vieja:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            console.log('🔧 SW: Activación completada');
            return self.clients.claim();
        })
    );
});

// Fetch - Estrategia Cache-First
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    if (!url.origin.startsWith(self.location.origin) && 
        !url.origin.includes('unpkg.com') && 
        !url.origin.includes('cdnjs.cloudflare.com') &&
        !url.origin.includes('cdn.sheetjs.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    console.log('🔧 SW: Sirviendo desde cache:', event.request.url);
                    return response;
                }
                
                console.log('🔧 SW: Solicitando de red:', event.request.url);
                return fetch(event.request)
                    .then(function(response) {
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        
                        var responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                        
                        return response;
                    })
                    .catch(function(error) {
                        console.error('🔧 SW: Error de red:', error);
                        
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        return new Response('Offline - Sin conexión', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

console.log('✅ Service Worker SmartCot cargado - Offline listo');
