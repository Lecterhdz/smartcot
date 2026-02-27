// ─────────────────────────────────────────────────────────────────────
// SMARTCOT - SERVICE WORKER (OFFLINE-FIRST)
// ─────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'smartcot-v1';
const CACHE_VERSION = '2026-01';

// Archivos para cachear inmediatamente
const urlsToCache = [
    './',
    './index.html',
    './login.html',
    './styles.css',
    './app.js',
    './db.js',
    './calculator.js',
    './auth.js',
    './firebase-config.js',
    './manifest.json',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// ─────────────────────────────────────────────────────────────────────
// INSTALAR SERVICE WORKER
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// ACTIVAR SERVICE WORKER
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// FETCH - ESTRATEGIA CACHE-FIRST (OFFLINE-FIRST)
// ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    
    // Ignorar solicitudes externas excepto CDN
    const url = new URL(event.request.url);
    if (!url.origin.startsWith(self.location.origin) && 
        !url.origin.includes('unpkg.com') && 
        !url.origin.includes('cdnjs.cloudflare.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    console.log('🔧 SW: Sirviendo desde cache:', event.request.url);
                    
                    // Actualizar cache en segundo plano
                    fetch(event.request).then(function(newResponse) {
                        if (newResponse && newResponse.status === 200) {
                            caches.open(CACHE_NAME).then(function(cache) {
                                cache.put(event.request, newResponse);
                            });
                        }
                    }).catch(function() {});
                    
                    return response;
                }
                
                console.log('🔧 SW: Solicitando de red:', event.request.url);
                return fetch(event.request)
                    .then(function(response) {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
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
                        
                        // Si es navegación, devolver offline page
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

// ─────────────────────────────────────────────────────────────────────
// MENSAJE PARA ACTUALIZAR CACHE
// ─────────────────────────────────────────────────────────────────────
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('✅ Service Worker SmartCot cargado - Offline listo');