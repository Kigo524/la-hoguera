(function () {
  'use strict';

  /* ============================================================
   * Referencias del DOM
   * ========================================================== */
  var fireCanvas = document.getElementById('fire');
  var fctx = fireCanvas.getContext('2d');
  /* Canvas overlay para las chispas de la línea de corte: va POR ENCIMA del
     papel (z-index 6) porque el canvas de fuego queda detrás y las ocultaría. */
  var cutCanvas = document.createElement('canvas');
  cutCanvas.className = 'cut-sparks';
  cutCanvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cutCanvas);
  var cutCtx = cutCanvas.getContext('2d');
  var form = document.getElementById('burn-form');
  var message = document.getElementById('message');
  var burnBtn = document.getElementById('burn-btn');
  var panel = document.querySelector('.panel');
  var flightLayer = document.getElementById('flight-layer');
  var burnCount = document.getElementById('burn-count');
  var burnCountNum = document.getElementById('burn-count-num');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Blindaje: el mensaje NUNCA se envía por submit ni por teclado.
     Enter dentro del textarea solo inserta un salto de línea. */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
  });

  /* ============================================================
   * Motor de fuego procedural (campo de calor + partículas)
   * ========================================================== */
  var W = 0;
  var H = 0;
  /* El fuego se genera a baja resolución y se escala: no necesita Retina.
     Fijar el backing en CSS px reduce el fill-rate hasta 4x en pantallas DPR 2. */
  var FIRE_DPR = 1;
  var scale = 6;
  var bw = 0;
  var bh = 0;
  var heat = new Float32Array(1);
  var heatCanvas = document.createElement('canvas');
  var heatCtx = heatCanvas.getContext('2d');
  var heatImg = null;
  var heatData = null;
  var palette = buildPalette();
  var embers = [];
  var maxEmbers = 190;
  var emberAcc = 0;
  /* Chispas de la línea de corte (canvas overlay, cap propio independiente). */
  var cutSparks = [];
  var maxCutSparks = 80;
  var cutAcc = 0;
  var cut = { active: false, rect: null, anim: null };
  var boost = 0;
  var flicker = 1;
  var flickerPhase = 0;
  var windPhase = 0;
  var last = performance.now();
  var stepAcc = 0;

  /* Tabla de ruido precomputada: sustituye a Math.random() dentro del bucle de celdas. */
  var NOISE = new Float32Array(256);
  for (var nInit = 0; nInit < 256; nInit++) NOISE[nInit] = Math.random();

  /* Tres variantes de brasa pre-renderizadas: 1 drawImage por partícula
     con color orgánico variado según la temperatura de cada chispa. */
  var emberSprites = [
    buildEmberSprite('rgba(255,246,220,1)', 'rgba(255,175,70,0.9)', 'rgba(255,90,0,0)'),
    buildEmberSprite('rgba(255,220,150,1)', 'rgba(255,140,30,0.85)', 'rgba(255,60,0,0)'),
    buildEmberSprite('rgba(255,175,85,1)', 'rgba(230,75,10,0.8)', 'rgba(180,25,0,0)')
  ];
  /* Glow del núcleo pre-renderizado en resize(): evita createRadialGradient() por frame. */
  var coreGlowCanvas = document.createElement('canvas');

  function buildEmberSprite(hot, mid, edge) {
    var sprite = document.createElement('canvas');
    sprite.width = 32;
    sprite.height = 32;
    var sctx = sprite.getContext('2d');
    var g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, hot);
    g.addColorStop(0.35, mid);
    g.addColorStop(1, edge);
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 32, 32);
    return sprite;
  }

  function buildPalette() {
    var stops = [
      [0.0, 0, 0, 0, 0],
      [0.08, 52, 2, 4, 38],
      [0.22, 152, 12, 8, 165],
      [0.4, 242, 48, 6, 228],
      [0.58, 255, 92, 12, 250],
      [0.74, 255, 150, 40, 255],
      [0.88, 255, 208, 120, 255],
      [1.0, 255, 250, 232, 255]
    ];
    var pal = new Uint8ClampedArray(256 * 4);
    for (var i = 0; i < 256; i++) {
      var t = i / 255;
      var a = stops[0];
      var b = stops[stops.length - 1];
      for (var s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s][0] && t <= stops[s + 1][0]) {
          a = stops[s];
          b = stops[s + 1];
          break;
        }
      }
      var span = (b[0] - a[0]) || 1;
      var f = (t - a[0]) / span;
      var o = i * 4;
      pal[o] = a[1] + (b[1] - a[1]) * f;
      pal[o + 1] = a[2] + (b[2] - a[2]) * f;
      pal[o + 2] = a[3] + (b[3] - a[3]) * f;
      pal[o + 3] = a[4] + (b[4] - a[4]) * f;
    }
    return pal;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;

    fireCanvas.width = Math.round(W * FIRE_DPR);
    fireCanvas.height = Math.round(H * FIRE_DPR);
    fctx.setTransform(FIRE_DPR, 0, 0, FIRE_DPR, 0, 0);

    cutCanvas.width = Math.round(W * FIRE_DPR);
    cutCanvas.height = Math.round(H * FIRE_DPR);
    cutCtx.setTransform(FIRE_DPR, 0, 0, FIRE_DPR, 0, 0);

    var small = Math.min(W, H) < 700;
    maxEmbers = small ? 90 : 190;
    scale = small ? 9 : 6;

    bw = Math.max(32, Math.ceil(W / scale));
    bh = Math.max(32, Math.ceil(H / scale));

    heatCanvas.width = bw;
    heatCanvas.height = bh;
    heatImg = heatCtx.createImageData(bw, bh);
    heatData = heatImg.data;
    heat = new Float32Array(bw * bh);
    heat.fill(0);

    buildCoreGlow();
  }

  function buildCoreGlow() {
    coreGlowCanvas.width = Math.max(2, Math.round(W));
    coreGlowCanvas.height = Math.max(2, Math.round(H));
    var gctx = coreGlowCanvas.getContext('2d');
    var gx = coreGlowCanvas.width / 2;
    var gy = coreGlowCanvas.height * 0.99;
    var rg = gctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.55);
    rg.addColorStop(0, 'rgba(255,150,40,1)');
    rg.addColorStop(0.45, 'rgba(255,90,10,0.45)');
    rg.addColorStop(1, 'rgba(255,60,0,0)');
    gctx.fillStyle = rg;
    gctx.fillRect(0, 0, coreGlowCanvas.width, coreGlowCanvas.height);
  }

  function stepHeat() {
    var cooling = (255 / bh) * (reduceMotion ? 0.9 : 1.02);
    var x, y;
    var bottom = (bh - 1) * bw;
    var above = (bh - 2) * bw;

    /* Flicker: la hoguera "respira" modulando la inyección de calor base. */
    flickerPhase = (flickerPhase + 3) & 255;
    flicker = 0.88 + NOISE[flickerPhase] * 0.24;
    /* Viento sutil: inclinación orgánica que rota lentamente con el tiempo. */
    windPhase += 0.017;
    var wind = Math.sin(windPhase) * 0.18;
    var wl = 0.25 - wind * 0.5;
    var wr = 0.25 + wind * 0.5;

    for (x = 0; x < bw; x++) {
      var env = 0.42 + 0.58 * Math.sin(Math.PI * (x / bw));
      heat[bottom + x] = Math.min(255, (190 + Math.random() * 65) * env * flicker + boost * 60);
      heat[above + x] = Math.min(255, (150 + Math.random() * 70) * env * flicker + boost * 30);
    }

    for (y = bh - 2; y >= 0; y--) {
      var row = y * bw;
      var below = (y + 1) * bw;
      var y7 = y * 7;
      var yh = y >> 1;
      for (x = 0; x < bw; x++) {
        var xl = x > 0 ? x - 1 : x;
        var xr = x < bw - 1 ? x + 1 : x;
        var v = heat[below + xl] * wl + heat[below + x] * 0.5 + heat[below + xr] * wr;
        /* Dos octavas de ruido: lenguas de fuego coherentes, no grano por peldaño. */
        var n = NOISE[(x + y7) & 255] * 0.65 + NOISE[((x >> 1) + yh * 3) & 255] * 0.35;
        v -= cooling * (0.7 + n * 0.6);
        if (n > 0.96) v += (NOISE[(x * 5 + y) & 255] - 0.5) * 44;
        heat[row + x] = v < 0 ? 0 : v;
      }
    }
  }

  function renderHeat() {
    var total = bw * bh;
    for (var i = 0; i < total; i++) {
      var t = heat[i];
      if (t < 0) t = 0;
      else if (t > 255) t = 255;
      var p = (t | 0) * 4;
      var o = i * 4;
      heatData[o] = palette[p];
      heatData[o + 1] = palette[p + 1];
      heatData[o + 2] = palette[p + 2];
      heatData[o + 3] = palette[p + 3];
    }
    heatCtx.putImageData(heatImg, 0, 0);

    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, W, H);
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'low';
    fctx.drawImage(heatCanvas, 0, 0, bw, bh, -W * 0.02, -H * 0.02, W * 1.04, H * 1.04);
  }

  function spawnEmber(x, y, power) {
    if (embers.length >= maxEmbers) return;
    embers.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 40 * power,
      vy: -(40 + Math.random() * 70 * power),
      b: 0.5 + Math.random() * 1.5,
      life: 0,
      max: (0.8 + Math.random() * 1.8) / power,
      size: 0.8 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      sp: (Math.random() * emberSprites.length) | 0
    });
  }

  function spawnCutSpark(x, y) {
    if (cutSparks.length >= maxCutSparks) return;
    cutSparks.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 50,
      vy: -(50 + Math.random() * 120),
      b: 0.5 + Math.random() * 1.2,
      life: 0,
      max: 0.5 + Math.random() * 0.9,
      size: 0.8 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      sp: (Math.random() * emberSprites.length) | 0
    });
  }

  function burstCutSparks(n) {
    var r = cut.rect;
    if (!r) return;
    for (var i = 0; i < n; i++) {
      spawnCutSpark(r.left + Math.random() * r.width, r.top + r.height);
    }
  }

  function updateCutSparks(dt) {
    if (cut.active && cut.anim && cut.rect) {
      /* La línea de corte sube: y = base + alto × (1 − progreso del clip-path). */
      var t = cut.anim.currentTime;
      var p = typeof t === 'number' ? Math.min(1, t / DUR.burn) : 0;
      var rate = reduceMotion ? 10 : 48;
      cutAcc += rate * dt;
      var r = cut.rect;
      var y = r.top + r.height * (1 - p);
      while (cutAcc >= 1) {
        cutAcc -= 1;
        spawnCutSpark(r.left + Math.random() * r.width, y);
      }
    }
    for (var i = cutSparks.length - 1; i >= 0; i--) {
      var s = cutSparks[i];
      s.life += dt;
      if (s.life >= s.max) {
        cutSparks.splice(i, 1);
        continue;
      }
      s.vy -= 26 * s.b * dt;
      s.vx += Math.sin(s.y * 0.03 + s.phase) * 20 * dt;
      s.vx *= 0.985;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y < -20 || s.x < -20 || s.x > W + 20) cutSparks.splice(i, 1);
    }
  }

  function drawCutSparks() {
    cutCtx.clearRect(0, 0, W, H);
    if (!cutSparks.length) return;
    cutCtx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < cutSparks.length; i++) {
      var s = cutSparks[i];
      var k = 1 - s.life / s.max;
      var r = s.size * (0.9 + k * 1.6);
      cutCtx.globalAlpha = k < 0 ? 0 : k * (0.72 + 0.28 * Math.sin(s.phase + s.life * 9));
      cutCtx.drawImage(emberSprites[s.sp], s.x - r, s.y - r, r * 2, r * 2);
    }
    cutCtx.globalAlpha = 1;
    cutCtx.globalCompositeOperation = 'source-over';
  }

  function ambientEmbers(dt) {
    var rate = (reduceMotion ? 5 : 20) + boost * 120;
    emberAcc += rate * dt;
    while (emberAcc >= 1) {
      emberAcc -= 1;
      var bias = Math.max(0, Math.min(1, 0.5 + (Math.random() - 0.5) * 0.9));
      spawnEmber(bias * W, H * (0.86 + Math.random() * 0.14), 1);
    }
  }

  function updateEmbers(dt) {
    for (var i = embers.length - 1; i >= 0; i--) {
      var e = embers[i];
      e.life += dt;
      if (e.life >= e.max) {
        embers.splice(i, 1);
        continue;
      }
      e.vy -= 26 * e.b * dt;
      e.vx += Math.sin(e.y * 0.03 + e.phase) * 26 * dt;
      e.vx *= 0.985;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y < -20 || e.x < -20 || e.x > W + 20) embers.splice(i, 1);
    }
  }

  function drawEmbers() {
    fctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      var k = 1 - e.life / e.max;
      var r = e.size * (0.9 + k * 1.6);
      /* Chispadeo orgánico: una sin por partícula modula su alfa. */
      fctx.globalAlpha = k < 0 ? 0 : k * (0.72 + 0.28 * Math.sin(e.phase + e.life * 9));
      fctx.drawImage(emberSprites[e.sp], e.x - r, e.y - r, r * 2, r * 2);
    }
    fctx.globalAlpha = 1;
    fctx.globalCompositeOperation = 'source-over';
  }

  function drawCoreGlow() {
    fctx.globalCompositeOperation = 'lighter';
    fctx.globalAlpha = (0.22 + boost * 0.5) * flicker;
    fctx.drawImage(coreGlowCanvas, 0, 0, W, H);
    fctx.globalAlpha = 1;
    fctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;

    /* El campo de calor se actualiza a ~40 Hz (24 Hz con reduced-motion):
       el render/compositing sigue a 60 fps, pero se recalcula menos CPU por frame. */
    var stepHz = reduceMotion ? 24 : 40;
    stepAcc += dt;
    while (stepAcc >= 1 / stepHz) {
      stepHeat();
      stepAcc -= 1 / stepHz;
    }

    renderHeat();
    drawCoreGlow();
    ambientEmbers(dt);
    updateEmbers(dt);
    drawEmbers();
    updateCutSparks(dt);
    drawCutSparks();

    if (boost > 0) boost = Math.max(0, boost - dt * 2.2);
  }

  /* ============================================================
   * Orquestación de la animación (EXCLUSIVA por clic)
   * ========================================================== */
  var busy = false;
  /* Contador de sesión: solo en memoria. Ningún dato del usuario se conserva. */
  var burned = 0;

  function bumpCounter() {
    burned += 1;
    burnCountNum.textContent = burned;
    burnCount.classList.add('is-on');
    burnCount.classList.remove('bump');
    void burnCount.offsetWidth;
    burnCount.classList.add('bump');
  }

  /* Duraciones V5 (Spec 006): arrugado in-place + incineración clip-path.
     Spec 007: quemado lento y dramático (3,5 s). */
  var DUR = reduceMotion
    ? { crumple: 220, burn: 700 }
    : { crumple: 700, burn: 3500 };

  function buildPaper(text, rect, scrollTop) {
    /* Clon con geometría EXACTA del textarea (ancho, alto y centro idénticos):
       el papel nace superpuesto sin ningún salto ni desplazamiento inicial. */
    var paper = document.createElement('div');
    paper.className = 'paper';
    paper.style.width = rect.width + 'px';
    paper.style.height = rect.height + 'px';
    paper.style.left = (rect.left + rect.width / 2) + 'px';
    paper.style.top = (rect.top + rect.height / 2) + 'px';

    var t = document.createElement('div');
    t.className = 'paper__text';
    t.textContent = text;
    /* Réplica del scroll visible del textarea en el momento del clic. */
    if (scrollTop) t.style.transform = 'translateY(' + -scrollTop + 'px)';
    paper.appendChild(t);
    return paper;
  }

  function crumpleFrames() {
    if (reduceMotion) {
      return [
        { transform: 'translate(-50%,-50%) scale(1)', filter: 'contrast(1) brightness(1)', offset: 0 },
        { transform: 'translate(-50%,-50%) scale(0.98)', filter: 'contrast(1.04) brightness(0.99)', offset: 1 }
      ];
    }
    return [
      { transform: 'translate(-50%,-50%) scale(1)', filter: 'contrast(1) brightness(1)', offset: 0 },
      { transform: 'translate(-50%,-50%) scale(0.99)', filter: 'contrast(1.02) brightness(0.995)', offset: 0.45 },
      { transform: 'translate(-50%,-50%) scale(0.98)', filter: 'contrast(1.06) brightness(0.99)', offset: 1 }
    ];
  }

  function burnFrames() {
    /* Ocultación estricta de abajo hacia arriba: inset(bottom) crece 0 → 100%.
       clip-path es interpolable directamente en WAAPI (sin variables CSS). */
    var frames = [
      { bottom: '0%', opacity: 1, offset: 0 },
      { bottom: '55%', opacity: 1, offset: 0.55 },
      { bottom: '82%', opacity: 1, offset: 0.82 },
      { bottom: '100%', opacity: 0, offset: 1 }
    ];
    for (var i = 0; i < frames.length; i++) {
      frames[i].clipPath = frames[i].webkitClipPath = 'inset(0 0 ' + frames[i].bottom + ' 0)';
      delete frames[i].bottom;
    }
    return frames;
  }

  async function launch() {
    var text = message.value.trim();
    if (!text) {
      panel.classList.remove('nudge');
      void panel.offsetWidth;
      panel.classList.add('nudge');
      return;
    }
    if (busy) return;
    busy = true;
    burnBtn.disabled = true;

    var rect = message.getBoundingClientRect();
    var scrollTop = message.scrollTop;

    /* El texto deja el campo de inmediato: no se conserva en ningún lado. */
    message.value = '';

    var paper = buildPaper(text, rect, scrollTop);
    flightLayer.appendChild(paper);

    try {
      /* Fase 1: arrugado sutil en el lugar (sin traslación ni salto). */
      await paper.animate(crumpleFrames(), {
        duration: DUR.crumple,
        easing: 'ease-in-out',
        fill: 'forwards'
      }).finished;

      /* Fase 2: incineración in-place, ocultación de abajo hacia arriba
         con clip-path, mientras la línea de corte emite chispas ascendentes. */
      var burnAnim = paper.animate(burnFrames(), {
        duration: DUR.burn,
        easing: 'ease-in',
        fill: 'forwards'
      });
      cut.active = true;
      cut.rect = rect;
      cut.anim = burnAnim;
      cutAcc = 0;
      burstCutSparks(reduceMotion ? 4 : 12);
      boost = 1;

      await burnAnim.finished;
    } catch (err) {
      /* Animación interrumpida: continuamos con la limpieza. */
    }

    cut.active = false;
    cut.anim = null;
    cut.rect = null;

    /* Destrucción total: el nodo y su texto salen del DOM. */
    paper.remove();

    bumpCounter();

    busy = false;
    burnBtn.disabled = false;
    message.focus({ preventScroll: true });
  }

  burnBtn.addEventListener('click', launch);

  /* ============================================================
   * Arranque
   * ========================================================== */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(resize, 200);
  });

  resize();
  for (var i = 0; i < 30; i++) {
    spawnEmber(Math.max(0, Math.min(1, 0.5 + (Math.random() - 0.5) * 0.9)) * W, H * (0.86 + Math.random() * 0.14), 1);
  }
  last = performance.now();
  requestAnimationFrame(frame);
})();
