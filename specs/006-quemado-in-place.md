# Spec 006: Quemado in-place — clon exacto, clip-path bottom→top, chispas en línea de corte

## Objetivo
Corregir la Fase 2 de incineración: el clon del mensaje debe superponerse EXACTAMENTE sobre el textarea (cero salto inicial), arrugarse sutilmente en su sitio y desaparecer de ABAJO hacia ARRIBA con `clip-path`, emitiendo chispas visibles en la línea de corte. Sin vuelo, sin rotaciones 3D, sin máscaras CSS.

## Requisitos Funcionales

### 1. Clon exacto (cero salto)
- Geometría idéntica al textarea en el momento del clic: `width`, `height`, posición (centrado en `cx, cy` con `translate(-50%,-50%)`).
- Tipografía y padding idénticos al textarea (`padding: 8px 10px; font-size: 1rem; line-height: 1.5`).
- Compensación de scroll: `paper__text` aplica `translateY(-message.scrollTop)px`.
- Sin clamp de ancho (180–420px eliminado). Altura fijada por JS.

### 2. Flujo de animación
| Fase | Normal / reduced-motion | Descripción |
|---|---|---|
| Arrugado in-place | 700 ms / 220 ms | `scale(1) → scale(0.98)` + filtro sutil (`contrast(1.06) brightness(0.99)`). Sin traslación, sin salto. |
| Incineración in-place | 2000 ms / 500 ms | `clip-path: inset(0 0 0 0) → inset(0 0 100% 0)` (oculta de abajo hacia arriba), easing `ease-in`. `opacity: 1 → 0` solo en el tramo final. Emisión de chispas en la línea de corte. |

Total: ~2,7 s / ~0,7 s. El papel NO se desplaza en ningún momento.

### 3. Técnica exclusiva
- `clip-path: inset(...)` animado directamente con WAAPI (keyframes con `-webkit-clip-path` para Safari).
- Prohibido: `mask-image`, variables CSS animadas sin `@property`, `perspective`, `rotateX/Y/Z`, vuelo/traslado del papel.
- Código muerto con rotaciones (`crumpleFrames`, `flightFrames`, `burnFrames`) y lógica de vuelo (`fireHeart`, `flightStraightFrames`) eliminado por completo.

### 4. Chispas en la línea de corte (canvas overlay)
- Canvas transparente creado desde JS: `position: fixed; inset: 0; z-index: 6; pointer-events: none; aria-hidden`.
- Dibujo con los `emberSprites` existentes en el bucle `frame()` con composición `lighter`.
- Emisor con acumulador: chispas en `y = rect.top + rect.height × (1 − progreso)`, `x` aleatorio dentro del ancho del papel, `vy` ascendente.
- Burst inicial de 8–12 chispas al empezar la fase. Cap propio ~80 partículas (independiente del motor ambiental).
- Con `prefers-reduced-motion`: emissiones mínimas.

### Invariantes
- Exclusivo por clic. `Enter` nunca envía.
- Cero persistencia. Texto solo vive en el nodo clon; destruido con `paper.remove()`.
- `busy` + botón deshabilitado durante toda la secuencia.
- Contador solo en memoria, +1 tras `paper.remove()`.
- Respeta `prefers-reduced-motion`.
- 60 FPS: sin cálculos pesados por frame.

## Criterios de Aceptación
- [ ] En el frame 0, `getBoundingClientRect()` del clon coincide con el del textarea (ancho, alto, centro).
- [ ] Cero desplazamiento ni escala fuera de rango `[0.98, 1]` antes de la Fase 2.
- [ ] `clip-path` progresa de `inset(0 0 0 0)` a `inset(0 0 100% 0)`; el papel se oculta desde el borde inferior.
- [ ] Cero coincidencias de `rotate|perspective|mask-image|--burn-up` en `js/app.js` y `css/styles.css`.
- [ ] Chispas visibles por encima del papel en la línea de corte, subiendo.
- [ ] Contador +1, campo limpio, nodo eliminado, 0 errores de consola, 0 almacenamiento.
- [ ] `prefers-reduced-motion` con secuencia acortada razonable.
