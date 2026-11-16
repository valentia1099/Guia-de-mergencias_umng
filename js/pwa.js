/* ==========================================================================
   pwa.js — Registro del Service Worker (modo sin conexión) y barra de estado
   de red. Requiere servir la carpeta por http(s) o localhost; si se abre el
   archivo directamente, la guía funciona igual pero sin caché offline.
   ========================================================================== */
(function () {
  'use strict';
  var Guia = window.Guia, $ = Guia.$;
  var barra = $('#estado'), texto = $('#estado-texto'), extra = $('#estado-offline');
  var listoOffline = false;

  function pintar() {
    var en = navigator.onLine;
    barra.classList.toggle('estado--offline', !en);
    texto.textContent = en
      ? (listoOffline ? 'Conectado · guía disponible sin conexión' : 'Conectado')
      : 'Sin conexión · usando la guía guardada';
  }
  window.addEventListener('online', function () { pintar(); Guia.anunciar('Conexión restablecida'); });
  window.addEventListener('offline', function () {
    pintar();
    Guia.alerta('Sin conexión a internet. La guía, los audios y la llamada al 123 siguen funcionando. El mapa satelital puede no cargar.');
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      if (reg.active) { listoOffline = true; pintar(); }
      navigator.serviceWorker.addEventListener('message', function (e) {
        if (e.data && e.data.tipo === 'precache-listo') { listoOffline = true; pintar(); extra.textContent = 'La guía quedó guardada para usarla sin conexión.'; }
      });
    }).catch(function () { /* sin SW: modo en línea */ });
  }
  pintar();
})();
