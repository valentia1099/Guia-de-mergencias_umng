/* ==========================================================================
   mascota.js — Orni, la mascota brigadista: recorrido guiado (onboarding)
   con globos de texto, locución de ElevenLabs y texto equivalente para
   lectores de pantalla. Alterna imagen de reposo / hablando según el estado.
   ========================================================================== */
(function () {
  'use strict';
  var Guia = window.Guia, $ = Guia.$;

  var IMG_REPOSO = 'img/pato-reposo.webp', IMG_HABLA = 'img/pato-hablando.webp';
  var PASOS = [
    { sel: '#inicio', titulo: '¡Hola! Soy Orni', audio: 'audios/orni-bienvenida.mp3',
      texto: '¡Hola! Soy Orni, brigadista de la Universidad Militar Nueva Granada, sede Campus Cajicá. Te acompaño por esta guía de emergencias. Si estás viviendo una emergencia ahora mismo, toca el botón rojo de arriba: te conecta directamente con la línea 123. Puedes navegar con el teclado: presiona la tecla Tab para avanzar, y la tecla A para escuchar cualquier sección en voz alta.' },
    { sel: '#protocolos', titulo: 'Protocolos por tipo de emergencia', audio: 'audios/orni-tour-categorias.mp3',
      texto: 'Aquí eliges el tipo de emergencia: sismo, incendio, emergencia médica o seguridad. Cada ficha te dice qué hacer antes, durante y después, y tiene su propio botón para escucharla.' },
    { sel: '#animaciones', titulo: 'Aprende viendo', audio: 'audios/orni-tour-animaciones.mp3',
      texto: 'Estas animaciones te enseñan paso a paso: cómo protegerte en un sismo, el ritmo de las compresiones de reanimación, el uso del extintor, cómo salir por debajo del humo y cómo llegar al punto de encuentro. Cada una tiene su descripción en audio.' },
    { sel: '#mapa', titulo: 'Mapa real del campus', audio: 'audios/orni-tour-mapa.mp3',
      texto: 'Este es el mapa real del Campus Cajicá. Los marcadores verdes son zonas abiertas para reunirse después de evacuar, y la cruz roja es la enfermería, junto a las canchas. Debajo del mapa tienes la misma lista en texto, con botones para abrir la ruta en tu celular.' },
    { sel: '#directorio', titulo: 'Directorio y ficha médica', audio: 'audios/orni-tour-directorio.mp3',
      texto: 'En el directorio, toca cualquier número y tu celular empezará la llamada. Más abajo puedes llenar tu ficha médica: tipo de sangre, alergias, medicamentos y un contacto de emergencia. Se guarda solo en este dispositivo y funciona sin internet.' }
  ];

  var raiz = $('#mascota'), globo = $('#globo'), img = $('#mascota-img'), btn = $('#mascota-btn');
  var tit = $('#globo-titulo'), txt = $('#globo-texto'), pasoEl = $('#globo-paso');
  var bAnt = $('#globo-ant'), bSig = $('#globo-sig'), bOir = $('#globo-oir');
  var i = 0, resaltado = null, controlador = null, hablandoOrni = false;

  // Precarga de la segunda imagen
  var pre = new Image(); pre.src = IMG_HABLA;

  function estado(hablando) {
    raiz.classList.toggle('mascota--hablando', hablando);
    raiz.classList.toggle('mascota--reposo', !hablando);
    img.src = hablando ? IMG_HABLA : IMG_REPOSO;
  }
  // La mascota "habla" con cualquier locución de la página
  document.addEventListener('guia:habla', function (e) {
    estado(e.detail.hablando);
    if (e.detail.origen !== controlador && hablandoOrni) { hablandoOrni = false; pintarOir(false); }
    if (e.detail.origen === controlador && !e.detail.hablando) { hablandoOrni = false; pintarOir(false); }
  });

  function pintarOir(on) {
    bOir.setAttribute('aria-pressed', String(on));
    bOir.innerHTML = Guia.icono(on ? 'pause' : 'volume-2') + '<span>' + (on ? 'Pausar' : 'Escuchar') + '</span>';
  }

  function quitarResaltado() { if (resaltado) { resaltado.classList.remove('resaltado'); resaltado = null; } }

  function mostrar(n, conVoz) {
    i = Math.max(0, Math.min(PASOS.length - 1, n));
    var p = PASOS[i];
    tit.textContent = p.titulo;
    txt.textContent = p.texto;
    pasoEl.textContent = 'Paso ' + (i + 1) + ' de ' + PASOS.length;
    bAnt.disabled = i === 0;
    bSig.querySelector('span').textContent = i === PASOS.length - 1 ? 'Terminar' : 'Siguiente';
    quitarResaltado();
    var objetivo = $(p.sel);
    if (objetivo) {
      var h = objetivo.querySelector('h1, h2') || objetivo;
      h.classList.add('resaltado'); resaltado = h;
      objetivo.scrollIntoView({ behavior: Guia.movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
    }
    Guia.Audio.detenerTodo(); hablandoOrni = false; pintarOir(false);
    if (conVoz) oir();
  }

  function oir() {
    if (hablandoOrni) { Guia.Audio.detenerTodo(); hablandoOrni = false; pintarOir(false); return; }
    var p = PASOS[i];
    hablandoOrni = true; pintarOir(true);
    controlador = Guia.Audio.reproducir(p.audio, p.texto, function () { hablandoOrni = false; pintarOir(false); });
  }

  function abrir(n, conVoz) {
    globo.hidden = false; btn.setAttribute('aria-expanded', 'true');
    mostrar(typeof n === 'number' ? n : i, !!conVoz);
    tit.focus();
    Guia.store.set('tourVisto', true);
  }
  function cerrar() {
    if (globo.hidden) return;
    globo.hidden = true; btn.setAttribute('aria-expanded', 'false');
    quitarResaltado();
    if (hablandoOrni) Guia.Audio.detenerTodo();
    hablandoOrni = false; pintarOir(false); estado(false);
  }

  btn.addEventListener('click', function () { if (globo.hidden) abrir(i, false); else { cerrar(); btn.focus(); } });
  $('#globo-cerrar').addEventListener('click', function () { cerrar(); btn.focus(); });
  bAnt.addEventListener('click', function () { mostrar(i - 1, hablandoOrni); });
  bSig.addEventListener('click', function () {
    if (i === PASOS.length - 1) { cerrar(); Guia.anunciar('Recorrido terminado. Puedes volver a abrir a Orni cuando quieras.'); btn.focus(); return; }
    mostrar(i + 1, hablandoOrni);
  });
  bOir.addEventListener('click', oir);
  globo.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); cerrar(); btn.focus(); }
  });

  Guia.Mascota = { abrir: abrir, cerrar: cerrar };

  // Primera visita: Orni se presenta (sin reproducir audio automáticamente)
  if (!Guia.store.get('tourVisto', false)) {
    setTimeout(function () {
      globo.hidden = false; btn.setAttribute('aria-expanded', 'true');
      mostrarSinDesplazar(0);
    }, 1200);
  }
  function mostrarSinDesplazar(n) {
    i = n; var p = PASOS[i];
    tit.textContent = p.titulo; txt.textContent = p.texto;
    pasoEl.textContent = 'Paso 1 de ' + PASOS.length; bAnt.disabled = true;
    Guia.store.set('tourVisto', true);
  }
})();
