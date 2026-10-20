# Memoria del Proyecto: La Hoguera

**Regla de Memoria:** Máximo 50 líneas. Resume o elimina lo que ya no aporte valor.

## Estado Actual (V6)
- SPA estática con HTML, CSS y Vanilla JS (specs `006-quemado-in-place.md` + `007-ui-amplia-quemado-lento.md`).
- UI amplia: panel `min(860px,100%)`, textarea `min-height 150px` / `max-height 42vh`.
- Flujo in-place sin vuelo: clon con geometría EXACTA del textarea (ancho/alto/centro idénticos, tipografía y padding iguales, compensa `scrollTop`) → arrugado `scale(1→0.98)` + filtro → incineración con `clip-path: inset(0 0 X% 0)` (X: 0→100, oculta de abajo hacia arriba) + `opacity:0` final. `DUR.burn = 3500 ms` (reduced 700): secuencia total ~4,2 s, ritmo lento y dramático.
- Chispas en la línea de corte: canvas overlay `.cut-sparks` (z-index 6, creado desde JS) por encima del papel; emisor a 48/s con acumulador sigue el avance del clip (`t / DUR.burn`). Cap 80, independiente del motor ambiental.
- Único nodo `.paper` con único `.paper__text`. Cero rotaciones/perspective/mask/vuelo en todo el código.
- Motor de fuego Canvas a 60 FPS: DPR 1, escala 6/9, paso 40 Hz, paleta crimson→ámbar→blanco, 3 variantes de brasa, flicker, ruido de 2 octavas, viento asimétrico y chispadeo.
- Contador de sesión (🔥 + número) solo en memoria, aparece tras primer quemado.

## Aprendizajes y Decisiones Técnicas
- Envío exclusivo por clic. Cero persistencia. Texto eliminado con `paper.remove()`.
- Bug heredado V4: `mask-image` con `to top` + negro creciente REVELA desde abajo en vez de ocultar. `clip-path: inset()` es la técnica correcta e interpolable en WAAPI.
- Custom properties sin `@property` se interpolan de forma discreta en WAAPI → evitar `--burn-up`.
- El canvas de fuego va DETRÁS del papel: chispas visibles sobre el papel requieren overlay propio en z-index superior.
- "Sin salto" = misma geometría + tipografía + padding + `scrollTop` del textarea, y arrugado que arranca en `scale(1)`.
- El clon se dimensiona vía `getBoundingClientRect()` en el clic: cambios de tamaño CSS no exigen tocar JS. El emisor atado a `DUR.burn` escala solo el total de partículas manteniendo el ritmo.
- `busy` bloquea botón durante toda la secuencia.

## Pruebas
- E2E (specs 006/007): rect del clon idéntico al textarea frame 0; panel ≥860px y textarea ≥150px; `duration === 3500` en Fase 2; `clip-path` 0→100% bottom→top; cero `rotate|perspective|mask|--burn-up` en fuentes; chispas visibles sobre el papel; leyenda visible a 375×667; contador +1, campo limpio, nodo eliminado, 0 errores/almacenamiento.
- Entorno: Chrome del sistema vía `executablePath` (Chrome-for-Testing bloqueado en macOS).
