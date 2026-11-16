/* ==========================================================================
   animaciones.js — Reproductor de las 5 animaciones Lottie instructivas
   (lottie-web, renderizador SVG). Los pasos se sincronizan con los
   marcadores ("markers") incluidos en cada JSON.
   ========================================================================== */
(function () {
  'use strict';
  var Guia = window.Guia, $ = Guia.$, $$ = Guia.$$;
  if (!window.lottie || !window.LOTTIE_DATA) return;

  var INFO = {
    'sismo': {
      titulo: 'Sismo: agáchate, cúbrete y sujétate',
      desc: 'Una persona con chaleco reflectivo está en un salón con ventana, repisa, una mesa y la puerta de salida señalizada en verde. Empieza el temblor: el salón se sacude, cae un objeto de la repisa y se agrieta el vidrio. La persona camina a la mesa, se agacha sobre manos y rodillas, cubre su cabeza con un brazo y con la otra mano se sujeta de la pata de la mesa hasta que termina el movimiento. Después sale por un lado de la mesa y camina con calma hacia la salida siguiendo la flecha verde.',
      audio: 'audios/orni-sismo.mp3', dur: 38,
      texto: 'Qué hacer en un sismo. Durante el movimiento, no corras. Agáchate, cúbrete y sujétate. Agáchate sobre tus manos y rodillas. Cubre tu cabeza y cuello debajo de una mesa firme, o junto a una pared interior, lejos de ventanas. Sujétate hasta que el movimiento termine. No uses ascensores y no te ubiques bajo el marco de las puertas. Cuando pare el sismo, revisa si hay heridos, sal con calma por la ruta de evacuación señalizada y dirígete al punto de encuentro. Prepárate para réplicas. Si alguien está atrapado o herido, llama a la línea 123.'
    },
    'rcp': {
      titulo: 'RCP: compresiones a 110 por minuto',
      desc: 'Vista de perfil: una persona inconsciente está acostada boca arriba en el piso. El rescatista, arrodillado a su lado, tiene los brazos rectos y las manos entrelazadas sobre el centro del pecho. Comprime hacia abajo y deja que el pecho regrese, a un ritmo de 110 compresiones por minuto, dentro del rango recomendado de 100 a 120. Una barra roja a la izquierda muestra la profundidad de al menos 5 centímetros y un corazón late con cada compresión.',
      audio: 'audios/orni-rcp.mp3', dur: 42,
      texto: 'Reanimación con solo las manos, para adultos. Primero, verifica que el lugar sea seguro. Toca a la persona por los hombros y pregúntale en voz alta si está bien. Si no responde y no respira con normalidad, llama al 123, pon el altavoz y pide un desfibrilador. Coloca el talón de una mano en el centro del pecho, sobre la mitad inferior del esternón, y la otra mano encima. Con los brazos rectos, empuja fuerte y rápido: al menos cinco centímetros de profundidad, a un ritmo de cien a ciento veinte compresiones por minuto. Deja que el pecho vuelva a su posición después de cada compresión. No pares hasta que llegue ayuda o el desfibrilador indique otra cosa.'
    },
    'extintor': {
      titulo: 'Extintor: método PASS',
      desc: 'Un extintor rojo junto a una papelera en llamas. Paso 1: una mano con guante jala el pasador con anillo amarillo. Paso 2: la manguera se levanta y la boquilla apunta a la base del fuego, marcada con un círculo azul. Paso 3: la mano presiona la palanca y sale el agente extintor. Paso 4: el chorro barre de lado a lado sobre la base hasta que el fuego se apaga y aparece un visto bueno verde.',
      audio: 'audios/orni-extintor.mp3', dur: 33,
      texto: 'Cómo usar un extintor con el método PASS. Úsalo solo si el fuego es pequeño, tienes una salida a tu espalda y alguien ya dio la alarma. Uno: jala el seguro, rompiendo el precinto. Dos: apunta la boquilla hacia la base del fuego, no a las llamas. Tres: presiona la palanca con firmeza. Cuatro: barre de lado a lado sobre la base del fuego hasta apagarlo. Retrocede sin dar la espalda, porque el fuego puede reavivarse. Si el fuego crece, sal de inmediato y llama al 123.'
    },
    'humo': {
      titulo: 'Incendio: avanza a gatas bajo el humo',
      desc: 'Un pasillo se llena de humo gris desde el techo hacia abajo. La persona se agacha y avanza a gatas por la franja verde de aire limpio cerca del piso, siguiendo flechas verdes en el suelo. Al llegar a la puerta de salida toca la puerta con el dorso de la mano para comprobar si está caliente; como no lo está, la abre y sale.',
      audio: 'audios/orni-incendio.mp3', dur: 32,
      texto: 'Qué hacer en un incendio. Da la alarma y sal de inmediato. El humo es más peligroso que el fuego: si hay humo, agáchate y avanza a gatas, con la cabeza cerca del piso, donde el aire es más limpio. Antes de abrir una puerta, tócala con el dorso de la mano; si está caliente, no la abras y usa otra salida. Nunca uses el ascensor y nunca regreses por tus objetos. Si tu ropa se prende, detente, tírate al suelo y rueda. Ya afuera, ve al punto de encuentro y llama al 123.'
    },
    'punto-encuentro': {
      titulo: 'Ruta al punto de encuentro',
      desc: 'Plano visto desde arriba con zonas verdes, caminos y edificios. En un edificio parpadea una alerta roja. Se dibuja una ruta verde punteada desde la puerta del edificio por los caminos hasta la señal de punto de encuentro: un cuadro verde con cuatro flechas blancas que apuntan al centro. Cuatro personas, representadas con círculos de colores, recorren la ruta y se ubican alrededor del punto, que emite un pulso verde.',
      audio: 'audios/orni-punto-encuentro.mp3', dur: 31,
      texto: 'Evacuación hacia el punto de encuentro del Campus Cajicá. Cuando suene la alarma o lo indique la brigada, deja lo que estés haciendo y sal caminando, sin correr, por la ruta señalizada. Sigue las flechas verdes de salida y las instrucciones de los brigadistas. Ayuda a las personas con discapacidad o movilidad reducida. Dirígete a la zona abierta más cercana, lejos de edificios, árboles y cables. Repórtate con tu docente o con la brigada, y no regreses a los edificios hasta que la brigada lo autorice.'
    }
  };

  var escenario = $('#lottie-escenario'), rotulo = $('#anim-rotulo'), pasosEl = $('#anim-pasos');
  var btnPlay = $('#anim-play'), btnRe = $('#anim-reiniciar'), btnVel = $('#anim-vel');
  var tabs = $$('.anim__tab'), panel = $('#ap-panel');
  var anim = null, clave = null, marcadores = [], pasoActual = -1, velocidades = [1, 0.5, 0.75], vIdx = 0, enVista = true, pausadoUsuario = false;

  function pintarPlay(sonando) {
    btnPlay.setAttribute('aria-pressed', String(sonando));
    btnPlay.innerHTML = Guia.icono(sonando ? 'pause' : 'play') + '<span>' + (sonando ? 'Pausar' : 'Reproducir') + '</span>';
  }

  function cargar(k, foco) {
    if (!INFO[k]) return;
    clave = k;
    var info = INFO[k], datos = window.LOTTIE_DATA[k];
    if (anim) { anim.destroy(); anim = null; }
    escenario.innerHTML = '';
    escenario.setAttribute('aria-label', 'Animación: ' + info.titulo + '. ' + info.desc);
    anim = window.lottie.loadAnimation({
      container: escenario, renderer: 'svg', loop: true, autoplay: false,
      animationData: JSON.parse(JSON.stringify(datos)),
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet', title: info.titulo, description: info.desc }
    });
    var svg = escenario.querySelector('svg'); if (svg) svg.setAttribute('aria-hidden', 'true');
    anim.setSpeed(velocidades[vIdx]);
    marcadores = (datos.markers || []).map(function (m) { return { t: m.tm, txt: m.cm }; });
    pasosEl.innerHTML = '';
    marcadores.forEach(function (m, i) {
      var li = document.createElement('li');
      var b = document.createElement('span'); b.textContent = m.txt; li.appendChild(b);
      li.tabIndex = -1; li.setAttribute('data-i', i);
      pasosEl.appendChild(li);
    });
    pasoActual = -1;
    anim.addEventListener('enterFrame', function (e) { actualizarPaso(e.currentTime); });
    $('#anim-titulo').textContent = info.titulo;
    $('#anim-desc').textContent = info.desc;
    Guia.Audio.cambiar($('#anim-audio'), info.audio, info.texto, 'Narración: ' + info.titulo, info.dur);
    $('#metronomo').hidden = k !== 'rcp';
    if (k !== 'rcp') detenerMetronomo();
    tabs.forEach(function (t) {
      var sel = t.getAttribute('data-anim') === k;
      t.setAttribute('aria-selected', String(sel)); t.tabIndex = sel ? 0 : -1;
      if (sel) panel.setAttribute('aria-labelledby', t.id);
    });
    actualizarPaso(0);
    if (Guia.movimientoReducido() || pausadoUsuario) { anim.goToAndStop(marcadores[1] ? marcadores[1].t + 5 : 0, true); pintarPlay(false); }
    else { if (enVista) anim.play(); pintarPlay(true); }
    if (foco) tabs.filter(function (t) { return t.getAttribute('data-anim') === k; })[0].focus();
    Guia.store.set('anim', k);
  }

  function actualizarPaso(t) {
    var i = 0;
    for (var j = 0; j < marcadores.length; j++) if (t >= marcadores[j].t) i = j;
    if (i === pasoActual) return;
    pasoActual = i;
    rotulo.textContent = marcadores[i] ? marcadores[i].txt : '';
    $$('li', pasosEl).forEach(function (li, n) {
      if (n === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  /* Controles */
  btnPlay.addEventListener('click', function () {
    if (!anim) return;
    if (anim.isPaused) { anim.play(); pausadoUsuario = false; pintarPlay(true); Guia.anunciar('Animación en reproducción'); }
    else { anim.pause(); pausadoUsuario = true; pintarPlay(false); Guia.anunciar('Animación en pausa'); }
  });
  btnRe.addEventListener('click', function () { if (!anim) return; anim.goToAndPlay(0, true); pausadoUsuario = false; pintarPlay(true); });
  btnVel.addEventListener('click', function () {
    vIdx = (vIdx + 1) % velocidades.length; var v = velocidades[vIdx];
    if (anim) anim.setSpeed(v);
    btnVel.textContent = 'Velocidad ' + v + '×';
    btnVel.setAttribute('aria-label', 'Velocidad de la animación: ' + (v === 1 ? 'normal' : v + ' veces, más lenta'));
  });
  // Clic en un paso: salta a ese momento
  pasosEl.addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li || !anim) return;
    var m = marcadores[+li.getAttribute('data-i')]; if (!m) return;
    anim.goToAndStop(m.t + 2, true); anim.pause(); pausadoUsuario = true; pintarPlay(false); actualizarPaso(m.t + 2);
  });

  /* Pestañas con teclado */
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { cargar(t.getAttribute('data-anim'), false); });
    t.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); cargar(tabs[j].getAttribute('data-anim'), true); }
    });
  });

  /* Pausar fuera de pantalla (ahorro de batería) */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      enVista = es[0].isIntersecting;
      if (!anim) return;
      if (!enVista) anim.pause();
      else if (!pausadoUsuario && !Guia.movimientoReducido()) anim.play();
    }, { threshold: 0.15 }).observe(escenario);
  }
  document.addEventListener('guia:movimiento', function (e) {
    if (!anim) return;
    if (e.detail) { anim.pause(); pintarPlay(false); } else if (!pausadoUsuario) { anim.play(); pintarPlay(true); }
  });

  /* ---------- Metrónomo de RCP (110/min) con sonido y vibración ---------- */
  var ctx = null, timer = null, cuenta = 0;
  var mBtn = $('#metro-btn'), latido = $('#metro-latido'), cuentaEl = $('#metro-cuenta');
  function tic() {
    cuenta++;
    cuentaEl.textContent = cuenta;
    latido.classList.add('on'); setTimeout(function () { latido.classList.remove('on'); }, 120);
    if (ctx) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = cuenta % 30 === 0 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.1);
    }
    if (navigator.vibrate) navigator.vibrate(40);
    if (cuenta % 30 === 0) $('#metro-anuncio').textContent = cuenta + ' compresiones. Sigue sin parar.';
  }
  function detenerMetronomo() {
    if (!timer) return;
    clearInterval(timer); timer = null;
    mBtn.setAttribute('aria-pressed', 'false');
    mBtn.innerHTML = Guia.icono('play') + '<span>Iniciar metrónomo</span>';
  }
  mBtn.addEventListener('click', function () {
    if (timer) { detenerMetronomo(); Guia.anunciar('Metrónomo detenido en ' + cuenta + ' compresiones'); return; }
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.resume) ctx.resume(); } catch (e) { ctx = null; }
    cuenta = 0; cuentaEl.textContent = '0';
    timer = setInterval(tic, 60000 / 110);
    mBtn.setAttribute('aria-pressed', 'true');
    mBtn.innerHTML = Guia.icono('square') + '<span>Detener metrónomo</span>';
    Guia.anunciar('Metrónomo a 110 por minuto iniciado');
  });

  Guia.Animaciones = {
    mostrar: function (k) { cargar(k, false); }
  };
  cargar(Guia.store.get('anim', 'sismo'), false);
})();
