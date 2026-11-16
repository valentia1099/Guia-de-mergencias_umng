/* ==========================================================================
   mapa.js — Mapa real del Campus Cajicá (Leaflet + teselas satelitales de
   Esri World Imagery y OpenStreetMap). Sin API key.
   Coordenadas tomadas de OpenStreetMap (vía 349594617 y elementos internos).
   ========================================================================== */
(function () {
  'use strict';
  var Guia = window.Guia, $ = Guia.$;
  var L = window.L;
  var contenedor = $('#mapa-campus');
  if (!L || !contenedor) return;

  /* Perímetro del campus (OSM way 349594617, simplificado) */
  var PERIMETRO = [[4.9399735,-74.0163342],[4.9375027,-74.0080146],[4.9391966,-74.0086589],[4.9406359,-74.0093684],[4.9411626,-74.0092201],
    [4.9416179,-74.0091573],[4.9420192,-74.0093016],[4.9423485,-74.0092857],[4.9435687,-74.0087556],[4.943715,-74.0083126],
    [4.9441171,-74.0079584],[4.9440468,-74.0076512],[4.9444467,-74.0071724],[4.9467612,-74.0137964],[4.9467461,-74.0144824],
    [4.9468716,-74.0149748],[4.9463884,-74.0150665],[4.9458926,-74.0151438],[4.9450962,-74.0152752],[4.944023,-74.0154933],
    [4.9431832,-74.0156783],[4.9426928,-74.0156052],[4.9416377,-74.015956],[4.9414249,-74.0160129],[4.9399735,-74.0163342]];

  var PUNTOS = [
    { id: 'pe1', tipo: 'pe', corto: 'PE1', nombre: 'Zona de canchas deportivas', lat: 4.94505, lng: -74.01390,
      desc: 'Zona abierta más amplia, al norte del campus, entre las canchas de fútbol, tenis y voleibol. Junto a la Enfermería y la cafetería.' },
    { id: 'pe2', tipo: 'pe', corto: 'PE2', nombre: 'Prado central (interior del óvalo)', lat: 4.94172, lng: -74.01370,
      desc: 'Gran zona verde abierta dentro del anillo vial, al occidente de la Biblioteca y del lago. Lejos de fachadas y cables.' },
    { id: 'pe3', tipo: 'pe', corto: 'PE3', nombre: 'Prado occidental – Edificio AAIS', lat: 4.94083, lng: -74.01531,
      desc: 'Zona verde abierta al occidente del Edificio AAIS y del parqueadero P1, cerca de la entrada por la Troncal Central.' },
    { id: 'pe4', tipo: 'pe', corto: 'PE4', nombre: 'Parqueadero P3 – Administrativo', lat: 4.94148, lng: -74.01087,
      desc: 'Parqueadero oriental, cerca de los edificios Sepúlveda, Mutis y Francisco Antonio Zea.' },
    { id: 'pe5', tipo: 'pe', corto: 'PE5', nombre: 'Parqueadero P4 – Laboratorios', lat: 4.94318, lng: -74.01073,
      desc: 'Parqueadero junto al Edificio José María Cabal (laboratorios) y los invernaderos.' },
    { id: 'pe6', tipo: 'pe', corto: 'PE6', nombre: 'Parqueadero P5 – Casona', lat: 4.94623, lng: -74.01379,
      desc: 'Parqueadero del extremo norte, junto a la Casona y el Centro Literario.' },
    { id: 'enf', tipo: 'enf', corto: '+', nombre: 'Enfermería', lat: 4.944616, lng: -74.012515,
      desc: 'Edificio de un piso al costado de las canchas, al lado de la cafetería y frente al Aula Libre.' },
    { id: 'ref1', tipo: 'ref', corto: 'i', nombre: 'Edificio Gral. Luis Camacho Leiva (Biblioteca)', lat: 4.941924, lng: -74.011934,
      desc: 'Biblioteca, Vicerrectoría del Campus y facultades de Derecho y Relaciones Internacionales.' },
    { id: 'ref2', tipo: 'ref', corto: 'i', nombre: 'Concha Acústica – Bienestar Universitario', lat: 4.943901, lng: -74.012145,
      desc: 'Bienestar Universitario, gimnasio y salones de ensayo.' }
  ];

  var satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics'
  });
  var calles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20, maxNativeZoom: 19, attribution: '© colaboradores de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  });

  var mapa = L.map(contenedor, {
    center: [4.9426, -74.0122], zoom: 17, minZoom: 14, layers: [satelite], keyboard: true, scrollWheelZoom: false, tap: true
  });
  L.control.layers({ 'Satélite': satelite, 'Calles': calles }, null, { collapsed: false }).addTo(mapa);
  L.control.scale({ imperial: false }).addTo(mapa);
  mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
  // Rueda del ratón solo al enfocar el mapa (evita "secuestrar" el desplazamiento de la página)
  mapa.on('focus', function () { mapa.scrollWheelZoom.enable(); });
  mapa.on('blur', function () { mapa.scrollWheelZoom.disable(); });

  L.polygon(PERIMETRO, { color: '#ffd400', weight: 3, fillOpacity: 0.05, dashArray: '8 6', interactive: false }).addTo(mapa);
  mapa.fitBounds(L.latLngBounds(PERIMETRO), { padding: [10, 10] });

  function icono(p) {
    return L.divIcon({
      className: '', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30],
      html: '<span class="pin pin--' + p.tipo + '" aria-hidden="true"><span>' + (p.tipo === 'pe' ? p.corto.slice(2) : p.corto) + '</span></span>'
    });
  }
  function enlaceRuta(p) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + '%2C' + p.lng + '&travelmode=walking';
  }

  var marcadores = {};
  var lista = $('#lista-puntos');
  PUNTOS.forEach(function (p) {
    var m = L.marker([p.lat, p.lng], { icon: icono(p), title: p.nombre, alt: p.nombre, keyboard: true, riseOnHover: true }).addTo(mapa);
    m.bindPopup('<strong>' + p.nombre + '</strong><br>' + p.desc +
      '<br><a href="' + enlaceRuta(p) + '" target="_blank" rel="noopener noreferrer">Cómo llegar caminando ↗</a>');
    m.on('add', function () { var el = m.getElement(); if (el) el.setAttribute('aria-label', p.nombre + '. ' + p.desc); });
    var el = m.getElement(); if (el) { el.setAttribute('aria-label', p.nombre + '. ' + p.desc); el.setAttribute('role', 'button'); }
    marcadores[p.id] = m;

    var li = document.createElement('li');
    li.className = 'punto'; li.id = 'punto-' + p.id;
    li.innerHTML =
      '<div class="punto__cab"><span class="punto__marca' + (p.tipo === 'enf' ? ' punto__marca--enf' : p.tipo === 'ref' ? ' punto__marca--ref' : '') +
      '" aria-hidden="true">' + p.corto + '</span><div><strong>' + p.nombre + '</strong>' +
      '<div class="punto__dist" style="font-size:.88rem;color:var(--tinta-2)"></div></div></div>' +
      '<p style="margin:0">' + p.desc + '</p>' +
      '<div class="punto__acciones">' +
      '<button class="boton boton--chico" type="button" data-ver="' + p.id + '">' + Guia.icono('map-pin') + 'Ver en el mapa<span class="sr-only">: ' + p.nombre + '</span></button>' +
      '<a class="boton boton--chico boton--azul" href="' + enlaceRuta(p) + '" target="_blank" rel="noopener noreferrer">' + Guia.icono('navigation') +
      'Cómo llegar<span class="sr-only"> a ' + p.nombre + ' (abre Google Maps en otra pestaña)</span></a></div>';
    lista.appendChild(li);
  });

  lista.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ver]'); if (!b) return;
    var p = PUNTOS.filter(function (x) { return x.id === b.getAttribute('data-ver'); })[0];
    contenedor.scrollIntoView({ behavior: Guia.movimientoReducido() ? 'auto' : 'smooth', block: 'center' });
    mapa.setView([p.lat, p.lng], 19);
    marcadores[p.id].openPopup();
    Guia.anunciar('Mostrando ' + p.nombre + ' en el mapa');
  });

  /* ---------- Punto más cercano ---------- */
  function distancia(a, b) {
    var R = 6371000, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function rumbo(a, b) {
    var r = Math.PI / 180;
    var y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
    var x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
    var g = (Math.atan2(y, x) / r + 360) % 360;
    return ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'][Math.round(g / 45) % 8];
  }
  var yo = null;
  $('#btn-cercano').addEventListener('click', function () {
    var estado = $('#cercano-estado');
    estado.textContent = 'Buscando tu ubicación…';
    Guia.obtenerUbicacion().then(function (u) {
      if (yo) yo.remove();
      yo = L.marker([u.lat, u.lng], { icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13], html: '<span class="pin pin--yo" aria-hidden="true"><span>•</span></span>' }), title: 'Tu ubicación' }).addTo(mapa);
      var pes = PUNTOS.filter(function (p) { return p.tipo === 'pe'; }).map(function (p) { return { p: p, d: distancia(u, p) }; })
        .sort(function (a, b) { return a.d - b.d; });
      PUNTOS.forEach(function (p) {
        var li = document.getElementById('punto-' + p.id);
        li.querySelector('.punto__dist').textContent = 'A ' + Math.round(distancia(u, p)) + ' m hacia el ' + rumbo(u, p);
        li.removeAttribute('aria-current');
      });
      var mejor = pes[0];
      document.getElementById('punto-' + mejor.p.id).setAttribute('aria-current', 'true');
      var lejos = distancia(u, Guia.CAMPUS) > 2500;
      estado.textContent = (lejos ? 'Parece que no estás en el campus. ' : '') + 'Punto de encuentro más cercano: ' + mejor.p.nombre +
        ', a ' + Math.round(mejor.d) + ' metros hacia el ' + rumbo(u, mejor.p) + '.';
      mapa.fitBounds(L.latLngBounds([[u.lat, u.lng], [mejor.p.lat, mejor.p.lng]]), { padding: [40, 40], maxZoom: 19 });
      marcadores[mejor.p.id].openPopup();
    }).catch(function (err) {
      estado.textContent = err.message + '. Usa la lista de puntos o sigue la señalización verde.';
    });
  });

  // Leaflet necesita recalcular su tamaño si el contenedor cambia
  if (window.ResizeObserver) new ResizeObserver(function () { mapa.invalidateSize(); }).observe(contenedor);
  Guia.Mapa = { mapa: mapa, puntos: PUNTOS };
})();
