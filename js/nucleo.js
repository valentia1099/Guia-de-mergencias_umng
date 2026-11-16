/* ==========================================================================
   nucleo.js — Utilidades compartidas, preferencias de accesibilidad,
   atajos de teclado, navegación y ubicación.
   Expone window.Guia (namespace único; scripts clásicos para funcionar
   también al abrir el archivo sin servidor).
   ========================================================================== */
(function () {
  'use strict';

  var Guia = window.Guia = window.Guia || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  Guia.$ = $; Guia.$$ = $$;

  /* ---------- Almacenamiento local seguro ---------- */
  Guia.store = {
    get: function (k, def) {
      try { var v = localStorage.getItem('guia:' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem('guia:' + k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del: function (k) { try { localStorage.removeItem('guia:' + k); } catch (e) { /* sin acceso */ } }
  };

  /* ---------- Anuncios para lectores de pantalla ---------- */
  Guia.anunciar = function (msg) {
    var el = $('#anunciador'); if (!el) return;
    el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 60);
  };
  Guia.alerta = function (msg) {
    var el = $('#alerta'); if (!el) return;
    el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 60);
  };
  var toastT;
  Guia.toast = function (msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3800);
  };

  Guia.icono = function (nombre) {
    return '<svg class="ico" aria-hidden="true"><use href="#i-' + nombre + '"/></svg>';
  };

  Guia.copiar = function (texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = texto; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); return ok;
    }
  };

  Guia.movimientoReducido = function () {
    return document.documentElement.getAttribute('data-movimiento') === 'reducido' ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  /* ---------- Preferencias: tamaño de texto, contraste, movimiento ---------- */
  var html = document.documentElement;
  var escala = Guia.store.get('escala', 1);
  function aplicarEscala() {
    html.style.setProperty('--escala', escala);
    Guia.store.set('escala', escala);
  }
  aplicarEscala();
  $('#btn-texto-mas').addEventListener('click', function () {
    escala = Math.min(1.6, Math.round((escala + 0.1) * 10) / 10); aplicarEscala();
    Guia.anunciar('Tamaño de texto ' + Math.round(escala * 100) + ' por ciento');
  });
  $('#btn-texto-menos').addEventListener('click', function () {
    escala = Math.max(0.9, Math.round((escala - 0.1) * 10) / 10); aplicarEscala();
    Guia.anunciar('Tamaño de texto ' + Math.round(escala * 100) + ' por ciento');
  });

  function toggler(btn, attr, on, off, clave, msgOn, msgOff, evento) {
    var estado = Guia.store.get(clave, false);
    function aplicar() {
      html.setAttribute(attr, estado ? on : off);
      btn.setAttribute('aria-pressed', String(estado));
      Guia.store.set(clave, estado);
      if (evento) document.dispatchEvent(new CustomEvent(evento, { detail: estado }));
    }
    aplicar();
    btn.addEventListener('click', function () { estado = !estado; aplicar(); Guia.anunciar(estado ? msgOn : msgOff); });
  }
  toggler($('#btn-contraste'), 'data-contraste', 'alto', 'normal', 'contraste', 'Alto contraste activado', 'Alto contraste desactivado');
  toggler($('#btn-movimiento'), 'data-movimiento', 'reducido', 'normal', 'movimiento', 'Animaciones detenidas', 'Animaciones activadas', 'guia:movimiento');

  /* ---------- Altura del botón SOS para la barra pegajosa ---------- */
  var sos = $('#sos'), nav = $('.nav');
  function ajustarPegajosos() {
    var h = sos.getBoundingClientRect().height;
    nav.style.top = h + 'px';
    html.style.scrollPaddingTop = (h + nav.getBoundingClientRect().height + 12) + 'px';
  }
  window.addEventListener('resize', ajustarPegajosos);
  if (window.ResizeObserver) new ResizeObserver(ajustarPegajosos).observe(sos);
  ajustarPegajosos();

  /* ---------- Sección actual (para atajos y menú) ---------- */
  Guia.seccionActual = 'inicio';
  var secciones = $$('[data-seccion]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          Guia.seccionActual = e.target.getAttribute('data-seccion');
          $$('.nav__lista a').forEach(function (a) {
            a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false');
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secciones.forEach(function (s) { io.observe(s); });
  }
  Guia.seccionDe = function (el) {
    var s = el && el.closest ? el.closest('[data-seccion]') : null;
    return s || $('[data-seccion="' + Guia.seccionActual + '"]');
  };

  /* ---------- Atajos de teclado ---------- */
  var dlg = $('#dlg-atajos');
  function abrirAtajos() { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  $('#btn-atajos').addEventListener('click', abrirAtajos);
  var orden = ['protocolos', 'animaciones', 'mapa', 'directorio', 'ficha', 'kit', 'fuentes'];

  function irA(id) {
    var s = document.getElementById(id); if (!s) return;
    s.scrollIntoView({ behavior: Guia.movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
    var h = s.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  Guia.irA = irA;

  document.addEventListener('keydown', function (e) {
    var t = e.target, escribiendo = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
      var k = (e.code || '').replace('Key', '').replace('Digit', '');
      if (k === 'E') { e.preventDefault(); $('#llamar-123').focus(); Guia.anunciar('Botón Llamar 1 2 3. Presiona Enter para llamar.'); return; }
      if (k === 'A') { e.preventDefault(); if (Guia.Audio) Guia.Audio.alternarSeccion(Guia.seccionDe(document.activeElement)); return; }
      if (k === 'G') { e.preventDefault(); if (Guia.Mascota) Guia.Mascota.abrir(0, true); return; }
      if (/^[1-7]$/.test(k)) { e.preventDefault(); irA(orden[+k - 1]); return; }
    }
    if (escribiendo || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '?') { e.preventDefault(); abrirAtajos(); return; }
    if ((e.key === 'a' || e.key === 'A') && !(t && t.closest && t.closest('.leaflet-container'))) {
      if (Guia.Audio) { e.preventDefault(); Guia.Audio.alternarSeccion(Guia.seccionDe(document.activeElement)); }
      return;
    }
    if (e.key === 'Escape') {
      if (Guia.Audio) Guia.Audio.detenerTodo();
      if (Guia.Mascota) Guia.Mascota.cerrar();
    }
  });

  /* ---------- Copiar dirección del campus ---------- */
  Guia.DIRECCION = 'Universidad Militar Nueva Granada, Campus Cajicá, Km 2 vía Cajicá - Zipaquirá, Cajicá, Cundinamarca';
  Guia.CAMPUS = { lat: 4.942184, lng: -74.012564 };
  $('#btn-copiar-dir').addEventListener('click', function () {
    Guia.copiar(Guia.DIRECCION).then(function (ok) {
      Guia.toast(ok ? 'Dirección copiada' : 'No se pudo copiar: ' + Guia.DIRECCION);
    });
  });

  /* ---------- Ubicación del usuario (compartida por mapa y SOS) ---------- */
  Guia.obtenerUbicacion = function () {
    return new Promise(function (ok, fallo) {
      if (!navigator.geolocation) { fallo(new Error('Tu navegador no permite ubicación')); return; }
      navigator.geolocation.getCurrentPosition(function (p) {
        ok({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) });
      }, function (err) {
        fallo(new Error(err.code === 1 ? 'Permiso de ubicación denegado' : 'No se pudo obtener la ubicación'));
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    });
  };
  Guia.textoUbicacion = function (u) {
    return 'EMERGENCIA. Estoy en: https://maps.google.com/?q=' + u.lat.toFixed(6) + ',' + u.lng.toFixed(6) +
      ' (precisión ' + u.precision + ' m). Cerca de: ' + Guia.DIRECCION;
  };
  Guia.compartirUbicacion = function (telefono) {
    Guia.anunciar('Obteniendo tu ubicación…');
    return Guia.obtenerUbicacion().then(function (u) {
      var texto = Guia.textoUbicacion(u);
      if (telefono) {
        location.href = 'sms:' + telefono.replace(/[^\d+]/g, '') + '?body=' + encodeURIComponent(texto);
        return;
      }
      if (navigator.share) {
        return navigator.share({ title: 'Mi ubicación de emergencia', text: texto }).catch(function () {});
      }
      return Guia.copiar(texto).then(function (ok) {
        Guia.toast(ok ? 'Ubicación copiada. Pégala en un mensaje o díctala al 123.' : texto);
        Guia.anunciar('Tus coordenadas son latitud ' + u.lat.toFixed(5) + ', longitud ' + u.lng.toFixed(5));
      });
    }).catch(function (err) {
      Guia.alerta(err.message + '. Dicta al operador: ' + Guia.DIRECCION);
      Guia.toast(err.message);
    });
  };
  $('#btn-ubicacion').addEventListener('click', function () { Guia.compartirUbicacion(); });
})();
