(function () {
  'use strict';

  /* ============================================================
   * Referencias del DOM
   * ========================================================== */
  var fireCanvas = document.getElementById('fire');
  var fctx = fireCanvas.getContext('2d');
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

  function spawnSparks(x, y, n) {
    var cap = Math.round(maxEmbers * 1.6);
    for (var i = 0; i < n; i++) {
      if (embers.length >= cap) break;
      var ang = Math.random() * Math.PI * 2;
      var sp = 60 + Math.random() * 260;
      var vy = Math.sin(ang) * sp - 120;
      embers.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * sp,
        vy: vy,
        b: 0.6 + Math.random() * 2,
        life: 0,
        max: 0.4 + Math.random() * 1.1,
        size: 1 + Math.random() * 2.4,
        phase: Math.random() * Math.PI * 2,
        sp: (Math.random() * emberSprites.length) | 0
      });
    }
    boost = 1;
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

  function fireHeart() {
    return { x: W / 2, y: H * 0.74 };
  }

  /* Duraciones V4 (Spec 005): ~2,7 s. Sin rotaciones 3D. */
  var DUR = reduceMotion
    ? { crumple: 220, burnUp: 400 }
    : { crumple: 700, burnUp: 2000 };

  function buildPaper(text, rect, cx, cy) {
    var paper = document.createElement('div');
    paper.className = 'paper';
    var w = Math.max(180, Math.min(rect.width || 320, 420));
    paper.style.width = w + 'px';
    paper.style.left = cx + 'px';
    paper.style.top = cy + 'px';

    var t = document.createElement('div');
    t.className = 'paper__text';
    t.textContent = text;
    paper.appendChild(t);
    return paper;
  }

  function crumpleNoRotFrames() {
    if (reduceMotion) {
      return [
        { transform: 'translate(-50%,-50%) scale(0.98)', filter: 'contrast(1) brightness(1)', offset: 0 },
        { transform: 'translate(-50%,-50%) scale(0.9)', filter: 'contrast(1.08) brightness(0.98)', offset: 1 }
      ];
    }
    return [
      { transform: 'translate(-50%,-50%) scale(0.98)', filter: 'contrast(1) brightness(1)', offset: 0 },
      { transform: 'translate(-50%,-50%) scale(0.94)', filter: 'contrast(1.04) brightness(0.99)', offset: 0.4 },
      { transform: 'translate(-50%,-50%) scale(0.92)', filter: 'contrast(1.06) brightness(0.985)', offset: 0.7 },
      { transform: 'translate(-50%,-50%) scale(0.9)', filter: 'contrast(1.08) brightness(0.98)', offset: 1 }
    ];
  }

  function burnUpFrames() {
    if (reduceMotion) {
      return [
        { '--burn-up': '0%', opacity: 1, offset: 0 },
        { '--burn-up': '100%', opacity: 0, offset: 1 }
      ];
    }
    return [
      { '--burn-up': '0%', opacity: 1, offset: 0 },
      { '--burn-up': '25%', opacity: 1, offset: 0.25 },
      { '--burn-up': '55%', opacity: 1, offset: 0.5 },
      { '--burn-up': '80%', opacity: 1, offset: 0.72 },
      { '--burn-up': '100%', opacity: 0, offset: 1 }
    ];
  }

  function flightStraightFrames(cx, cy, end) {
    var dx = end.x - cx;
    var dy = end.y - cy;
    var steps = 6;
    var frames = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = cx + dx * t;
      var y = cy + dy * t;
      frames.push({
        transform: 'translate(-50%,-50%) translate(' + (x - cx).toFixed(1) + 'px,' + (y - cy).toFixed(1) + 'px) scale(0.9)',
        offset: t
      });
    }
    return frames;
  }

  function crumpleFrames() {
    return [
      {
        transform: 'translate(-50%,-50%) perspective(700px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.92)',
        filter: 'brightness(1) contrast(1)',
        offset: 0
      },
      {
        transform: 'translate(-50%,-50%) perspective(700px) rotateX(-42deg) rotateY(28deg) rotateZ(-8deg) scale(0.72)',
        filter: 'brightness(0.92) contrast(1.15)',
        offset: 0.42
      },
      {
        transform: 'translate(-50%,-50%) perspective(700px) rotateX(34deg) rotateY(-34deg) rotateZ(12deg) scale(0.56)',
        filter: 'brightness(0.86) contrast(1.25)',
        offset: 0.72
      },
      {
        transform: 'translate(-50%,-50%) perspective(700px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.5)',
        filter: 'brightness(0.9) contrast(1.2)',
        offset: 1
      }
    ];
  }

  function flightFrames(cx, cy, end) {
    var dx = end.x - cx;
    var dy = end.y - cy;
    var ctrlX = cx + dx * 0.5;
    var ctrlY = cy + dy * 0.5 - Math.max(60, Math.abs(dy) * 0.35);
    var steps = 4;
    var frames = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var mt = 1 - t;
      var x = mt * mt * cx + 2 * mt * t * ctrlX + t * t * end.x;
      var y = mt * mt * cy + 2 * mt * t * ctrlY + t * t * end.y;
      var sc = 0.5 - 0.35 * t;
      var rot = 320 * t;
      var arc = Math.sin(t * Math.PI) * 22;
      frames.push({
        transform:
          'translate(-50%,-50%) translate(' + (x - cx).toFixed(1) + 'px,' + (y - cy).toFixed(1) + 'px) ' +
          'perspective(700px) rotateX(' + arc.toFixed(1) + 'deg) rotateY(' + (arc * 0.6).toFixed(1) + 'deg) ' +
          'rotateZ(' + rot.toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')',
        offset: t
      });
    }
    return frames;
  }

  function burnFrames(dx, dy) {
    var base =
      'translate(-50%,-50%) translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) ' +
      'perspective(700px) rotateX(0deg) rotateY(0deg) rotateZ(320deg)';
    return [
      {
        transform: base + ' scale(0.15)',
        filter: 'brightness(1) saturate(1)',
        opacity: 1,
        offset: 0
      },
      {
        transform: base + ' rotateZ(18deg) scale(0.2)',
        filter: 'brightness(2.2) saturate(1.5)',
        opacity: 1,
        offset: 0.4
      },
      {
        transform: base + ' rotateZ(24deg) scale(0.1)',
        filter: 'brightness(3) saturate(1.2)',
        opacity: 0.85,
        offset: 0.72
      },
      {
        transform: base + ' rotateZ(40deg) scale(0.02)',
        filter: 'brightness(1) saturate(1)',
        opacity: 0,
        offset: 1
      }
    ];
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
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    /* El texto deja el campo de inmediato: no se conserva en ningún lado. */
    message.value = '';

    var paper = buildPaper(text, rect, cx, cy);
    flightLayer.appendChild(paper);

    var end = fireHeart();
    var dx = end.x - cx;
    var dy = end.y - cy;

    try {
      /* Fase 1: arrugado ligero sin rotaciones 3D. */
      await paper.animate(crumpleNoRotFrames(), {
        duration: DUR.crumple,
        easing: 'ease-in-out',
        fill: 'forwards'
      }).finished;

      /* Fase 2: vuelo recto y lento hacia el centro + desaparición de abajo hacia arriba. */
      paper.classList.add('is-burning-up');
      /* Emisión moderada de chispas ascendentes al iniciar la fase. */
      if (!reduceMotion) {
        spawnSparks(end.x, end.y, 12);
      } else {
        spawnSparks(end.x, end.y, 6);
      }

      var flightAnim = paper.animate(flightStraightFrames(cx, cy, end), {
        duration: DUR.burnUp,
        easing: 'linear',
        fill: 'forwards'
      });
      var burnAnim = paper.animate(burnUpFrames(), {
        duration: DUR.burnUp,
        easing: 'ease-in',
        fill: 'forwards'
      });
      await Promise.all([flightAnim.finished, burnAnim.finished]);
    } catch (err) {
      /* Animación interrumpida: continuamos con la limpieza. */
    }

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
