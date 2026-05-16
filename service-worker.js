const CACHE_NAME = 'luza-pos-v19-paquete-completo';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './luza-logo.jpg',
  './assets/luza-logo.jpg',
  './assets/notify-ready.wav',
  './assets/notify-urgent.wav'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
