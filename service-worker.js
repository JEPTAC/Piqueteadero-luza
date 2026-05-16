const CACHE = 'luza-pos-github-firebase-v12-users';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './supabase-config.js', './manifest.webmanifest',
  './assets/logo.jpg', './assets/icon-192.png', './assets/icon-512.png', './assets/sounds/urgent.wav', './assets/sounds/ready.wav', './assets/sounds/soft.wav'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const clone = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, clone)).catch(()=>{});
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
