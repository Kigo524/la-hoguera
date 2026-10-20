# Spec 003: Inmersión v2 — Doblez, Ritmo Catártico y Fuego Orgánico

## Objetivo
Elevar la inmersión con tres mejoras: (1) ralentizar la secuencia de destrucción
para un efecto más dramático, (2) añadir una fase inicial donde el papel se dobla
físicamente a la mitad (CSS 3D) antes de arrugarse, y (3) un fuego más realista y
orgánico en el Canvas sin sacrificar los 60 FPS.

## Requisitos Funcionales

### 1. Ritmo catártico (~4,3 s en total, solo por clic)
- Secuencia: **Doblez (1000 ms) → Arrugado (900 ms) → Vuelo (1300 ms) →
  Incineración (1100 ms)**. `prefers-reduced-motion`: se omite el doblez y se
  conservan los tiempos cortos actuales (220/320/300 ms).
- El botón permanece deshabilitado (`busy`) durante toda la secuencia.
- Disparador exclusivo: clic en el botón (Enter nunca envía).

### 2. Doblez físico a la mitad (CSS 3D, dos mitades tipo libro)
- Estructura: `.paper` contiene `.paper__fold` (`transform-style: preserve-3d`)
  con `.paper__half--l` y `.paper__half--r` (50% de ancho, `overflow: hidden`).
- Cada mitad lleva una copia del texto offset para que, al cerrar, el contenido
  siga siendo legible y coherente. La copia es efímera: ambas mueren con
  `paper.remove()`. Cero persistencia.
- Animación WAAPI: mitad derecha `perspective(900px) rotateY(0 → -172deg)` con
  `transform-origin: left center` (eje del doblez = centro del papel); la
  izquierda permanece plana.
- Sombra de pliegue (`.paper__half--r::after`) que se intensifica durante el
  cierre; backface de la mitad derecha con tono papel más apagado.
- Tras el doblez, el arrugado/vuelo/incineración actúan sobre `.paper` igual que
  en V1 (mismos keyframes, ajustando el scale inicial de arrugado a 0.92 ya que
  el papel luce mitad de ancho).

### 3. Fuego orgánico (Canvas, mismo presupuesto de rendimiento)
Invariantes de rendimiento: DPR 1, campo de calor offscreen (escala 6/9), paso
a 40 Hz (24 Hz reduced-motion), sprites pre-renderizados, un `drawImage` por
partícula, topes de brasas 90 (móvil) / 190 (escritorio).
1. **Paleta reescrita:** bandas bajas carmesí profundas, medios naranja
   saturado, núcleo blanco-ámbar, cola superior ahumada sutil.
2. **3 variantes de sprite de brasa** pre-renderizadas (blanca-candente, ámbar,
   roja profunda), elegidas al spawn.
3. **Flicker global:** multiplicador de la tabla `NOISE` que modula la inyección
   de calor de las filas inferiores y el alfa del `coreGlow` (la hoguera
   "respira" sin coste apreciable).
4. **Ruido de dos octavas en `stepHeat`:** mezcla con octava lenta (`x>>1`,
   `y>>1`) para lenguas de fuego coherentes en vez de grano por peldaño.
5. **Viento sutil variable:** enfriamiento ligeramente asimétrico (izq/der) que
   rota con el tiempo → inclinación orgánica de las llamas.
6. **Chispadeo por partícula:** modulación del alfa de cada brasa con una `sin`
   de su fase + vida.

## Criterios de Aceptación
- [x] La secuencia completa dura ~4,3 s y encadena las 4 fases solo por clic.
- [x] El papel se dobla visualmente a la mitad antes de arrugarse (libro 3D).
- [x] El texto no salta ni se desalinea al plegar; ambas copias se destruyen al
      finalizar (fuera del DOM, sin LocalStorage/cookies/red).
- [x] `prefers-reduced-motion`: sin doblez y con tiempos cortos (verificado por
      revisión del código: `if (!reduceMotion)` + `DUR` sin clave `fold`).
- [x] El fuego respira (flicker), muestra lenguas coherentes y brasas variadas
      sin bajar de ~60 FPS en escritorio (medido: 60 FPS).
- [x] Sin errores ni warnings en consola durante el ciclo completo.
