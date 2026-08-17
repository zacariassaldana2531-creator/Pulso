/* PULSO — service worker
   Estrategia: la red primero para el contenido (así las actualizaciones
   llegan siempre), el caché queda solo como respaldo sin internet. */
const CACHE = 'pulso-v17';
const ARCHIVOS = [
  './',
  './index.html',
  './app.html',
  './privacidad.html',
  './terminos.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const esPagina = req.mode === 'navigate' ||
                   (req.headers.get('accept') || '').includes('text/html') ||
                   /\.(html|json|js)$/.test(new URL(req.url).pathname);

  if (esPagina) {
    // red primero: siempre trae lo más reciente
    e.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./app.html')))
    );
  } else {
    // imágenes y fuentes: caché primero, que no cambian
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        return res;
      }))
    );
  }
});
