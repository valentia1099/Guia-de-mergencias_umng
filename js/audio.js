/* ==========================================================================
   audio.js — Reproductor accesible de locuciones (ElevenLabs) + respaldo
   con la síntesis de voz del dispositivo (Web Speech API).

   · Los MP3 de /audios fueron generados con ElevenLabs (voz "Carlos",
     español latinoamericano, modelo eleven_v4) y se sirven como archivos
     estáticos: funcionan sin conexión y no exponen ninguna API key.
   · Para regenerarlos o agregar nuevos use tools/generar-audios.mjs
     (lee la key de la variable de entorno ELEVENLABS_API_KEY).
   · ElevenLabsTTS (abajo) permite, opcionalmente, sintetizar en vivo si se
     configura window.GUIA_CONFIG.elevenlabs (por defecto desactivado).
   ========================================================================== */
(function () {
  'use strict';
  var Guia = window.Guia, $$ = Guia.$$;

  /* ---------- Componente opcional de integración con la API ---------- */
  function ElevenLabsTTS(cfg) {
    this.apiKey = cfg && cfg.apiKey;
    this.voiceId = (cfg && cfg.voiceId) || 'Y4HwpMNrBWN5dFKi5Lw8';
    this.modelId = (cfg && cfg.modelId) || 'eleven_multilingual_v2';
  }
  ElevenLabsTTS.prototype.disponible = function () { return !!this.apiKey && navigator.onLine; };
  /** Devuelve una URL (blob:) con el MP3 sintetizado. */
  ElevenLabsTTS.prototype.sintetizar = function (texto) {
    var self = this;
    return fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(self.voiceId) + '?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': self.apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text: texto, model_id: self.modelId, voice_settings: { stability: 0.6, similarity_boost: 0.8 } })
    }).then(function (r) {
      if (!r.ok) throw new Error('ElevenLabs ' + r.status);
      return r.blob();
    }).then(function (b) { return URL.createObjectURL(b); });
  };
  Guia.ElevenLabsTTS = ElevenLabsTTS;
  var eleven = new ElevenLabsTTS((window.GUIA_CONFIG && window.GUIA_CONFIG.elevenlabs) || {});

  /* ---------- Voz del dispositivo (respaldo) ---------- */
  var synth = window.speechSynthesis;
  function vozEs() {
    if (!synth) return null;
    var voces = synth.getVoices();
    return voces.find(function (v) { return /es[-_]CO/i.test(v.lang); }) ||
      voces.find(function (v) { return /es[-_](MX|US|419)/i.test(v.lang); }) ||
      voces.find(function (v) { return /^es/i.test(v.lang); }) || null;
  }
  if (synth && synth.onvoiceschanged !== undefined) synth.onvoiceschanged = function () {};

  /* ---------- Estado global: un solo audio a la vez ---------- */
  var actual = null; // { ui, audio?, tts? }
  function fmt(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  function emitir(hablando, origen) {
    document.dispatchEvent(new CustomEvent('guia:habla', { detail: { hablando: hablando, origen: origen } }));
  }

  /* ---------- Construcción del reproductor ---------- */
  var cont = 0;
  function mejorar(caja) {
    if (caja.__ui) return caja.__ui;
    cont++;
    var src = caja.getAttribute('data-src');
    var tts = caja.getAttribute('data-tts') === 'true';
    var titulo = caja.getAttribute('data-titulo') || 'Escuchar';
    var dur = +caja.getAttribute('data-dur') || 0;
    var textoEl = caja.querySelector('.audio__texto');
    var texto = textoEl ? textoEl.textContent.trim() : '';
    var nativo = caja.querySelector('audio');
    if (nativo) nativo.remove();
    if (textoEl) textoEl.remove();

    var id = 'aud' + cont;
    caja.innerHTML =
      '<button class="audio__btn" type="button" aria-pressed="false">' +
      Guia.icono('play') + '<span class="sr-only">Reproducir: ' + titulo + '</span></button>' +
      '<div class="audio__info"><span class="audio__titulo" id="' + id + '-t">' + titulo + '</span>' +
      '<span class="audio__tiempo" aria-hidden="true">' + (tts ? 'Voz del dispositivo' : '0:00 / ' + fmt(dur)) + '</span></div>' +
      (tts ? '<span></span>' : '<input class="audio__barra" type="range" min="0" max="1000" step="1" value="0" aria-label="Posición del audio: ' + titulo + '" aria-valuetext="0 segundos">') +
      '<div class="audio__extra">' +
      '<button class="audio__vel" type="button" aria-label="Velocidad de reproducción: normal">1×</button>' +
      '<details class="audio__trans"><summary>Leer transcripción</summary><p></p></details></div>';
    caja.querySelector('.audio__trans p').textContent = texto;

    var ui = {
      caja: caja, src: src, tts: tts, texto: texto, titulo: titulo, dur: dur, vel: 1,
      btn: caja.querySelector('.audio__btn'), barra: caja.querySelector('.audio__barra'),
      tiempo: caja.querySelector('.audio__tiempo'), velBtn: caja.querySelector('.audio__vel'), audio: null
    };
    caja.__ui = ui;
    ui.btn.addEventListener('click', function () { alternar(ui); });
    ui.velBtn.addEventListener('click', function () {
      var pasos = [1, 1.25, 1.5, 0.75];
      ui.vel = pasos[(pasos.indexOf(ui.vel) + 1) % pasos.length];
      ui.velBtn.textContent = ui.vel + '×';
      ui.velBtn.setAttribute('aria-label', 'Velocidad de reproducción: ' + (ui.vel === 1 ? 'normal' : ui.vel + ' veces'));
      if (ui.audio) ui.audio.playbackRate = ui.vel;
    });
    if (ui.barra) {
      ui.barra.addEventListener('input', function () {
        var a = asegurarAudio(ui);
        if (a.duration) a.currentTime = (ui.barra.value / 1000) * a.duration;
      });
    }
    return ui;
  }

  function asegurarAudio(ui) {
    if (ui.audio) return ui.audio;
    var a = new Audio();
    a.preload = 'auto';
    a.src = ui.src;
    a.playbackRate = ui.vel;
    a.addEventListener('timeupdate', function () {
      var d = a.duration || ui.dur;
      if (ui.barra && d) {
        ui.barra.value = Math.round((a.currentTime / d) * 1000);
        ui.barra.setAttribute('aria-valuetext', Math.round(a.currentTime) + ' de ' + Math.round(d) + ' segundos');
      }
      ui.tiempo.textContent = fmt(a.currentTime) + ' / ' + fmt(d);
    });
    a.addEventListener('ended', function () { pintar(ui, false); if (actual && actual.ui === ui) actual = null; emitir(false, ui); });
    a.addEventListener('error', function () {
      // Respaldo: si el MP3 no carga, se lee la transcripción con la voz del dispositivo
      if (actual && actual.ui === ui) { ui.tts = true; hablar(ui); }
    });
    ui.audio = a;
    return a;
  }

  function pintar(ui, sonando) {
    ui.btn.setAttribute('aria-pressed', String(sonando));
    ui.btn.innerHTML = Guia.icono(sonando ? 'pause' : 'play') + '<span class="sr-only">' + (sonando ? 'Pausar: ' : 'Reproducir: ') + ui.titulo + '</span>';
  }

  function hablar(ui) {
    if (!synth) { Guia.alerta('Tu navegador no tiene síntesis de voz. Lee la transcripción.'); pintar(ui, false); return; }
    synth.cancel();
    var u = new SpeechSynthesisUtterance(ui.texto);
    var v = vozEs(); if (v) u.voice = v;
    u.lang = v ? v.lang : 'es-CO'; u.rate = ui.vel; u.pitch = 1;
    u.onend = function () { pintar(ui, false); if (actual && actual.ui === ui) actual = null; emitir(false, ui); };
    u.onerror = u.onend;
    synth.speak(u);
    pintar(ui, true); emitir(true, ui);
  }

  function detenerTodo() {
    if (!actual) { if (synth) synth.cancel(); return; }
    var ui = actual.ui;
    if (ui.audio) ui.audio.pause();
    if (synth) synth.cancel();
    pintar(ui, false); emitir(false, ui);
    actual = null;
  }

  function alternar(ui) {
    if (actual && actual.ui === ui) {
      detenerTodo(); Guia.anunciar('Audio en pausa'); return;
    }
    detenerTodo();
    actual = { ui: ui };
    if (ui.tts) { hablar(ui); Guia.anunciar('Leyendo: ' + ui.titulo); return; }
    var a = asegurarAudio(ui);
    var p = a.play();
    pintar(ui, true); emitir(true, ui);
    Guia.anunciar('Reproduciendo: ' + ui.titulo);
    if (p && p.catch) p.catch(function () {
      // Archivo no disponible: intentar ElevenLabs en vivo (si está configurado) o la voz del dispositivo
      if (eleven.disponible()) {
        eleven.sintetizar(ui.texto).then(function (url) { a.src = url; return a.play(); }).catch(function () { ui.tts = true; hablar(ui); });
      } else { ui.tts = true; hablar(ui); }
    });
  }

  /* ---------- API pública ---------- */
  Guia.Audio = {
    mejorar: mejorar,
    alternar: function (caja) { alternar(mejorar(caja)); },
    detenerTodo: detenerTodo,
    /** Cambia la fuente/texto de un reproductor existente (usado por las animaciones). */
    cambiar: function (caja, src, texto, titulo, dur) {
      var ui = mejorar(caja);
      if (actual && actual.ui === ui) detenerTodo();
      ui.src = src; ui.texto = texto; ui.tts = !src; ui.dur = dur || 0;
      if (titulo) { ui.titulo = titulo; caja.querySelector('.audio__titulo').textContent = titulo; }
      if (ui.audio) { ui.audio.pause(); ui.audio.removeAttribute('src'); ui.audio = null; }
      if (ui.barra) { ui.barra.value = 0; ui.barra.setAttribute('aria-label', 'Posición del audio: ' + ui.titulo); }
      ui.tiempo.textContent = '0:00 / ' + fmt(ui.dur);
      caja.querySelector('.audio__trans p').textContent = texto;
    },
    /** Reproduce el primer audio de una sección (atajo A). */
    alternarSeccion: function (seccion) {
      if (!seccion) return;
      var caja = seccion.querySelector('.audio');
      if (caja) alternar(mejorar(caja));
    },
    /** Reproducción directa (mascota): devuelve un controlador. */
    reproducir: function (src, texto, alTerminar) {
      detenerTodo();
      var falso = { caja: null, src: src, texto: texto, titulo: 'Orni', vel: 1, tts: !src,
        btn: document.createElement('button'), tiempo: document.createElement('span'), barra: null, audio: null };
      actual = { ui: falso };
      function fin() { if (alTerminar) alTerminar(); }
      document.addEventListener('guia:habla', function h(e) {
        if (e.detail.origen === falso && !e.detail.hablando) { document.removeEventListener('guia:habla', h); fin(); }
      });
      if (falso.tts) { hablar(falso); return falso; }
      var a = asegurarAudio(falso);
      var p = a.play(); emitir(true, falso);
      if (p && p.catch) p.catch(function () { falso.tts = true; hablar(falso); });
      return falso;
    },
    sonandoEs: function (ui) { return !!(actual && actual.ui === ui); }
  };

  $$('.audio').forEach(mejorar);
})();
