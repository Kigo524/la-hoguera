# Spec 007: UI amplia + incineración lenta (3,5 s)

## Objetivo
Ampliar el cuadro de texto y su contenedor para una escritura cómoda en escritorio y móvil, y ralentizar la incineración para un ritmo lento y dramático, manteniendo intactas las reglas inquebrantables de la spec 006.

## Requisitos Funcionales

### 1. Cuadro de texto amplio (`css/styles.css`)
| Selector | Propiedad | Nuevo valor |
|---|---|---|
| `.panel` | `width` | `min(860px, 100%)` |
| `.message` | `min-height` | `150px` |
| `.message` | `max-height` | `42vh` |

- Sin cambios en `index.html` (el `rows="3"` es solo valor inicial).
- La leyenda `.legend` no debe recortarse ni solaparse en viewports de 667px de alto.

### 2. Incineración lenta (`js/app.js`)
```js
var DUR = reduceMotion ? { crumple: 220, burn: 700 }
                       : { crumple: 700, burn: 3500 };
```
- Secuencia total: ~4,2 s normal / ~0,9 s reduced-motion.
- Coreografía, keyframes y easing sin cambios; `DUR` es la única fuente de verdad.
- El emisor de chispas (`t / DUR.burn`, 48/s) escala solo el total manteniendo el ritmo; cap 80 vivas intacto.

### Invariantes (heredadas de spec 006, verificables)
- Clon con rect idéntico al textarea en frame 0 (cero salto).
- Cero `rotateX/Y/Z`, `perspective`, `mask-image`, `--burn-up`.
- `clip-path: inset(0 0 0 0)` → `inset(0 0 100% 0)` (ocultación de abajo hacia arriba).
- Chispas naranjas visibles en la línea de corte durante todo el corte.
- Exclusivo por clic, cero persistencia, `busy` durante la secuencia, contador +1.

## Criterios de Aceptación
- [ ] Panel ≥ 860px de ancho en escritorio; textarea ≥ 150px de alto base, tope 42vh.
- [ ] Leyenda y botón visibles a 375×667 sin recortes.
- [ ] `getAnimations()` de `.paper` en Fase 2 con `duration === 3500` (700 con reduced-motion).
- [ ] Rect del clon idéntico al textarea frame 0; `clip-path bottom` progresa 0→100%; chispas encendidas durante el corte.
- [ ] Cero coincidencias de `rotate|perspective|mask|--burn-up` en fuentes.
- [ ] 0 errores de consola, 0 almacenamiento.
