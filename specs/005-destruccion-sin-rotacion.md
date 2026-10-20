# Spec 005: Destrucción sin rotación — Arrugado ligero, vuelo recto + burn-up bottom→top

## Objetivo
Simplificar la animación eliminando por completo las rotaciones 3D (bruscas e irreales). El flujo será más natural: arrugado ligero (sin rotación), vuelo recto y lento hacia el centro mientras el papel desaparece de abajo hacia arriba con `mask-image` lineal, con emisión moderada de partículas hacia arriba y final completamente transparente antes de eliminarse.

## Requisitos Funcionales

### 1. Sin rotaciones 3D
- Sin `rotateX`, `rotateY`, `rotateZ`, `translateZ`, `perspective`.
- Nodo único `.paper` con único `.paper__text`. Sin mitades/duplicados.
- Eliminar cualquier lógica/estilo relacionado con el doblez fantasma.

### 2. Flujo de animación (~2,7 s)
| Fase | Normal / reduced-motion | Descripción |
|---|---|---|
| Arrugado ligero | 700 ms / 220 ms | Solo `scale` (`0.98 → 0.94 → 0.90`) + filtro muy sutil (`contrast(1.08)`, `brightness(0.98)`). Sin rotaciones. |
| Vuelo recto + desaparición bottom→top | 2000 ms / 400 ms | Vuelo recto y lento hacia `fireHeart`. Simultáneamente, `--burn-up` de 0% → 100% con máscara lineal. Emisión moderada de chispas ascendentes. Final con `opacity: 0`. Papel eliminado al finalizar. |

Total: ~2,7 s.

### 3. Técnica exclusiva
- `mask-image` lineal `linear-gradient(to top, black 0%, black var(--burn-up), transparent calc(var(--burn-up) + 12%))`.
- Prefijos `-webkit-mask-image`/`-webkit-mask-size`.
- Variable CSS `--burn-up` animable con WAAPI. Clase `.paper.is-burning-up` durante fase 2.
- Final: `opacity: 0` tras completar `--burn-up`.

### 4. Partículas hacia arriba (emisión moderada)
- Burst inicial: 10–15 chispas al inicio de fase 2.
- Tasa sostenida: ~1,8x ambiente, con reducción progresiva hasta 0.
- Trayectoria: mayormente ascendente (`vy` más negativo), `vx` ±15–20.
- Priorizar variantes cálidas (ámbar/blanca-candente).
- Respetar topes 90 (móvil) / 190 (escritorio).

### Invariantes
- Exclusivo por clic. `Enter` nunca envía.
- Cero persistencia. Nodo único eliminado con `paper.remove()`.
- `busy` + botón deshabilitado durante toda la secuencia.
- Contador solo en memoria, +1 tras `paper.remove()`.
- Respeta `prefers-reduced-motion`.

## Criterios de Aceptación
- [x] Cero rotaciones 3D. Solo scale/filtro en fase 1.
- [x] Vuelo recto hacia el centro, simultáneo con desaparición de abajo hacia arriba.
- [x] Solo `mask-image` lineal (sin overlay).
- [x] Emisión moderada de partículas hacia arriba.
- [x] Final con `opacity: 0` y eliminación completa del DOM.
- [x] Único `.paper__text`, sin duplicados/mitades.
- [x] Cero errores, cero almacenamiento.
- [x] `prefers-reduced-motion` con fade/acortado razonable.