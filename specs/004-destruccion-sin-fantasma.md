# Spec 004: Destrucción sin fantasma — Hundimiento+arrugado + quemado borde→centro con núcleo incandescente

## Objetivo
Eliminar el doblez 3D problemático que generaba un "fantasma" visual al rotar y rediseñar
la incineración para que sea más orgánica: el papel se hunde y se arruga fusionado,
luego se quema desde los bordes hacia el centro con `mask-image` radial, dejando
un pequeño núcleo incandescente justo antes de desaparecer.

## Requisitos Funcionales

### 1. Eliminar doblez 3D
- Único nodo `.paper` con único `.paper__text` (sin mitades, sin duplicado).
- Eliminar `.paper__fold`, `.paper__half*`, `.paper__flip`, `.paper__face*`, `buildPaperFace()`, `foldFrames()`.
- Sin artefactos al rotar/transformar.

### 2. Nueva secuencia (~4,0 s, solo por clic)
| Fase | Normal / reduced-motion | Descripción |
|---|---|---|
| Hundimiento + arrugado fusionados | 1400 ms / 320 ms | `translateZ(-120px)` marcado, `rotateX(-8deg)`, `scale(0.9 -> 0.72)`, `filter` fusionado (`contrast(1.25)`, `sepia(0.18)`, `brightness(0.95)`). |
| Vuelo | 1100 ms / 280 ms | Trayectoria curva hacia `fireHeart`, giros laterales sutiles desde estado hundido/arrugado. |
| Incineración borde→centro + núcleo incandescente | 1500 ms / 400 ms | `mask-image` radial animando `--burn` 95% → 6-10%. Borde carbonizado con pseudo-elemento. En últimos keyframes núcleo incandescente (`brightness(2.8)`, `saturate(1.6)`) antes de `paper.remove()`. |

### 3. Técnica de quemado
- Variable CSS `--burn` animable con WAAPI.
- `mask-image: radial-gradient(circle at 50% 50%, black var(--burn), transparent calc(var(--burn) + 10%))`
- Equivalente `-webkit-mask-image`/`-webkit-mask-size`.
- Pseudo-elemento `::after` con `radial-gradient` oscuro para reforzar borde carbonizado.
- Clase `.paper.is-burning-inward` durante fase 3.

### Invariantes
- Disparador exclusivo por clic. `Enter` nunca envía.
- Cero persistencia. Único nodo eliminado con `paper.remove()`.
- `busy` + botón deshabilitado durante toda la secuencia.
- Contador solo en memoria, +1 tras `paper.remove()`.
- Sin dependencias. DPR 1 en fuego. Respeta `prefers-reduced-motion`.

## Criterios de Aceptación
- [x] Sin doblez 3D ni texto duplicado. Único `.paper__text`.
- [x] Hundimiento+arrugado fusionados en una fase (~1,4s).
- [x] Incineración desde bordes hacia el centro con `mask-image`.
- [x] Pequeño núcleo incandescente justo antes de desaparecer.
- [x] Sin artefacto "fantasma" al transformar.
- [x] Cero persistencia, cero errores en consola.
- [x] `prefers-reduced-motion` acortado y sin hundimiento profundo.
