/* ==========================================================================
   protocolos.js — Filtro por categorías y pestañas Antes/Durante/Después
   (patrón WAI-ARIA Tabs con flechas, Inicio y Fin).
   ========================================================================== */
(function () {
  'use strict';
  var Guia = window.Guia, $ = Guia.$, $$ = Guia.$$;

  /* ---------- Filtro ---------- */
  var nombres = { todos: 'todas las categorías', sismico: 'Sísmico', incendio: 'Incendio', medico: 'Médico', seguridad: 'Seguridad y riesgo' };
  var chips = $$('.chip[data-filtro]');
  var tarjetas = $$('#lista-protocolos .tarjeta');
  function filtrar(cat) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filtro') === cat)); });
    var n = 0;
    tarjetas.forEach(function (t) {
      var ver = cat === 'todos' || t.getAttribute('data-cat') === cat;
      t.hidden = !ver; if (ver) n++;
    });
    $('#filtro-estado').textContent = 'Mostrando ' + n + (n === 1 ? ' protocolo' : ' protocolos') + ' de ' + nombres[cat] + '.';
    Guia.store.set('filtro', cat);
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { filtrar(c.getAttribute('data-filtro')); }); });
  filtrar(Guia.store.get('filtro', 'todos'));

  /* ---------- Pestañas ---------- */
  $$('.tabs').forEach(function (tabs) {
    var lista = $$('[role="tab"]', tabs);
    function activar(tab, foco) {
      lista.forEach(function (t) {
        var sel = t === tab;
        t.setAttribute('aria-selected', String(sel));
        t.tabIndex = sel ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !sel;
      });
      if (foco) tab.focus();
    }
    lista.forEach(function (t, i) {
      t.addEventListener('click', function () { activar(t, false); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % lista.length;
        else if (e.key === 'ArrowLeft') j = (i - 1 + lista.length) % lista.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = lista.length - 1;
        if (j !== null) { e.preventDefault(); activar(lista[j], true); }
      });
    });
  });

  /* ---------- "Ver animación" desde una ficha ---------- */
  $$('[data-ir-anim]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (Guia.Animaciones) Guia.Animaciones.mostrar(a.getAttribute('data-ir-anim'));
    });
  });
})();
