/* ==========================================================================
   ficha.js — Ficha médica local (localStorage) y lista del kit de emergencia.
   Ningún dato sale del dispositivo.
   ========================================================================== */
(function () {
  'use strict';
  var Guia = window.Guia, $ = Guia.$, $$ = Guia.$$;

  /* ---------- Ficha médica ---------- */
  var form = $('#form-ficha');
  var CAMPOS = ['nombre', 'documento', 'sangre', 'eps', 'alergias', 'condiciones', 'contactoNombre', 'contactoTel'];
  var ETQ = { nombre: 'Nombre', documento: 'Documento', eps: 'EPS', alergias: 'Alergias', condiciones: 'Condiciones / medicamentos', contactoNombre: 'Contacto', contactoTel: 'Teléfono contacto' };

  function leer() { return Guia.store.get('ficha', {}); }
  function llenar(d) { CAMPOS.forEach(function (c) { if (form.elements[c]) form.elements[c].value = d[c] || ''; }); }
  function telValido(t) { return !t || /^\+?[\d\s()-]{7,20}$/.test(t); }

  function pintarTarjeta(d) {
    $('#tm-sangre').textContent = d.sangre || '—';
    var dl = $('#tm-datos'); dl.innerHTML = '';
    var hay = false;
    ['nombre', 'documento', 'eps', 'alergias', 'condiciones', 'contactoNombre', 'contactoTel'].forEach(function (c) {
      if (!d[c]) return; hay = true;
      var dt = document.createElement('dt'); dt.textContent = ETQ[c];
      var dd = document.createElement('dd'); dd.textContent = d[c];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    dl.hidden = !hay;
    $('#tm-vacio').hidden = hay;
    var a = $('#tm-llamar');
    if (d.contactoTel) {
      a.href = 'tel:' + d.contactoTel.replace(/[^\d+]/g, '');
      a.removeAttribute('aria-disabled');
      a.setAttribute('aria-label', 'Llamar a mi contacto de emergencia ' + (d.contactoNombre || '') + ', ' + d.contactoTel);
    } else {
      a.href = '#ficha'; a.setAttribute('aria-disabled', 'true');
      a.setAttribute('aria-label', 'Llamar a mi contacto: primero guarda un teléfono de contacto');
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {};
    CAMPOS.forEach(function (c) { d[c] = (form.elements[c].value || '').trim(); });
    var err = $('#f-ctel-err');
    if (!telValido(d.contactoTel)) {
      err.textContent = 'Escribe un teléfono válido, por ejemplo 300 123 4567.';
      form.elements.contactoTel.setAttribute('aria-invalid', 'true');
      form.elements.contactoTel.focus();
      return;
    }
    err.textContent = ''; form.elements.contactoTel.removeAttribute('aria-invalid');
    var ok = Guia.store.set('ficha', d);
    $('#ficha-estado').textContent = ok ? 'Ficha guardada en este dispositivo.' : 'No se pudo guardar: tu navegador bloquea el almacenamiento local.';
    pintarTarjeta(d);
  });
  $('#ficha-borrar').addEventListener('click', function () {
    if (!window.confirm('¿Borrar tu ficha médica de este dispositivo?')) return;
    Guia.store.del('ficha'); llenar({}); pintarTarjeta({});
    $('#ficha-estado').textContent = 'Ficha borrada.';
  });
  $('#tm-llamar').addEventListener('click', function (e) {
    if (this.getAttribute('aria-disabled') === 'true') {
      e.preventDefault(); form.elements.contactoTel.focus();
      Guia.anunciar('Primero escribe y guarda el teléfono de tu contacto de emergencia.');
    }
  });
  $('#tm-sms').addEventListener('click', function () {
    var d = leer();
    Guia.compartirUbicacion(d.contactoTel || null);
  });
  $('#tm-imprimir').addEventListener('click', function () { window.print(); });

  var datos = leer(); llenar(datos); pintarTarjeta(datos);

  /* ---------- Kit de emergencia ---------- */
  var KIT = ['Agua potable', 'Alimentos no perecederos', 'Linterna y pilas', 'Radio de pilas', 'Botiquín de primeros auxilios',
    'Medicamentos personales', 'Silbato', 'Copia de documentos en bolsa plástica', 'Dinero en efectivo', 'Ropa abrigada / manta térmica',
    'Artículos de aseo y tapabocas', 'Batería externa y cable del celular'];
  var marcados = Guia.store.get('kit', []);
  var ul = $('#kit-lista');
  KIT.forEach(function (item, i) {
    var li = document.createElement('li');
    li.innerHTML = '<label><input type="checkbox" value="' + i + '"><span></span></label>';
    li.querySelector('span').textContent = item;
    var cb = li.querySelector('input'); cb.checked = marcados.indexOf(i) > -1;
    ul.appendChild(li);
  });
  function progreso() {
    var n = $$('input:checked', ul).length;
    $('#kit-barra').style.width = (n / KIT.length * 100) + '%';
    $('#kit-progreso').setAttribute('aria-valuenow', n);
    $('#kit-progreso').setAttribute('aria-valuetext', n + ' de ' + KIT.length + ' elementos');
    $('#kit-texto').textContent = n + ' de ' + KIT.length + ' elementos' + (n === KIT.length ? ' — ¡kit completo!' : '');
  }
  ul.addEventListener('change', function () {
    Guia.store.set('kit', $$('input:checked', ul).map(function (c) { return +c.value; }));
    progreso();
  });
  progreso();
})();
