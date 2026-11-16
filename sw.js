/* Service Worker — Guía de Emergencias UMNG Campus Cajicá
   Estrategia: precache del "app shell" (HTML, CSS, JS, Lottie, imágenes, audios)
   + caché en tiempo de ejecución para teselas del mapa y fuentes. */
var VERSION = 'guia-umng-v1';
var SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/estilos.css',
  'vendor/lottie_light.min.js', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/layers.png', 'vendor/leaflet/images/layers-2x.png', 'vendor/leaflet/images/marker-icon.png',
  'js/lottie-data.js', 'js/nucleo.js', 'js/audio.js', 'js/protocolos.js', 'js/animaciones.js', 'js/mapa.js', 'js/ficha.js', 'js/mascota.js', 'js/pwa.js',
  'img/pato-reposo.webp', 'img/pato-hablando.webp', 'img/icono-192.png', 'img/icono-512.png',
  'audios/orni-bienvenida.mp3', 'audios/orni-sismo.mp3', 'audios/orni-incendio.mp3', 'audios/orni-rcp.mp3', 'audios/orni-extintor.mp3',
  'audios/orni-punto-encuentro.mp3', 'audios/orni-mochila.mp3', 'audios/orni-llamada-123.mp3', 'audios/orni-tour-categorias.mp3',
  'audios/orni-tour-animaciones.mp3', 'audios/orni-tour-mapa.mp3', 'audios/orni-tour-directorio.mp3'
];
var RUNTIME = 'guia-runtime-v1', MAX_TESELAS = 400;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION && k !== RUNTIME; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }).then(function () {
    return self.clients.matchAll().then(function (cs) { cs.forEach(function (c) { c.postMessage({ tipo: 'precache-listo' }); }); });
  }));
});
function recortar(cache, max) {
  cache.keys().then(function (ks) { if (ks.length > max) cache.delete(ks[0]).then(function () { recortar(cache, max); }); });
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var esTesela = /arcgisonline\.com|tile\.openstreetmap\.org/.test(url.hostname);
  var esFuente = /fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (esTesela || esFuente) {
    e.respondWith(caches.open(RUNTIME).then(function (c) {
      return c.match(req).then(function (hit) {
        var red = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) { c.put(req, r.clone()); recortar(c, MAX_TESELAS); } return r; }).catch(function () { return hit; });
        return hit || red;
      });
    }));
    return;
  }
  if (url.origin === location.origin) {
    // Audios: soportar peticiones de rango sirviendo el archivo completo desde caché
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).then(function (r) {
        if (r && r.ok && r.status === 200) { var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); }
        return r;
      }).catch(function () { return req.mode === 'navigate' ? caches.match('index.html') : undefined; });
    }));
  }
});
