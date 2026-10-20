# Memoria del Proyecto: La Hoguera

**Regla de Memoria:** Máximo 50 líneas. Resume o elimina lo que ya no aporte valor.

## Estado Actual (V4)
- SPA estática con HTML, CSS y Vanilla JS (spec `specs/005-destruccion-sin-rotacion.md`).
- Animación simplificada sin rotaciones 3D: arrugado ligero (solo `scale` + filtro) → vuelo recto y lento hacia el centro mientras desaparece de abajo hacia arriba con `mask-image` lineal (`--burn-up`), con emisión moderada de partículas hacia arriba y `opacity: 0` al final. Total ~2,7 s.
- Único nodo `.paper` con único `.paper__text` (eliminados mitades/duplicado y artefacto "fantasma").
- Motor de fuego Canvas a 60 FPS: DPR 1, escala 6/9, paso 40 Hz, paleta crimson→ámbar→blanco, 3 variantes de brasa, flicker, ruido de 2 octavas, viento asimétrico y chispadeo.
- Contador de sesión (🔥 + número) solo en memoria, aparece tras primer quemado.

## Aprendizajes y Decisiones Técnicas
- Envío exclusivo por clic. Cero persistencia. Texto eliminado con `paper.remove()`.
- Eliminar rotaciones 3D aporta naturalidad. `mask-image` lineal (to top) único para burn-up. Vuelo y desaparición simultáneos.
- Partículas ascendentes moderadas (burst 10–15, ~1,8x ambiente) durante consumo.
- Prefijos `-webkit-mask-image` para compatibilidad. `busy` bloquea botón durante toda la secuencia.

## Pruebas
- E2E: sin rotaciones, `--burn-up` progresa 0%→100%, máscara lineal activa solo en `.is-burning-up`, único `.paper__text`, papel pasa a `opacity:0` y desaparece. Contador +1, campo limpio, 0 errores/almacenamiento, sin texto fantasma. 
- Entorno: Chrome del sistema vía `executablePath` (Chrome-for-Testing bloqueado en macOS).
