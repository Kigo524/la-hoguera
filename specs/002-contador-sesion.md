# Spec 002: Contador de Problemas Quemados (Sesión)

## Objetivo
Mostrar un contador sutil en la esquina inferior derecha con el número de problemas
quemados durante la sesión actual (desde la carga de la página).

## Requisitos Funcionales
1. **Ubicación y estética:**
   - Fijo en la esquina inferior derecha, `pointer-events: none`, `z-index` por encima
     del `flight-layer` para no quedar tapado por el papel en vuelo.
   - Formato: icono de llama + número (ej. `🔥 3`).
   - Estilo discreto: tipografía pequeña, tono ceniza/ámbar, `font-variant-numeric: tabular-nums`.
2. **Conteo:**
   - Estado exclusivamente en memoria (variable JS). Cero persistencia:
     sin `LocalStorage`, cookies, `sessionStorage` ni servidores. Solo se guarda el número,
     nunca el texto del mensaje.
   - Se incrementa en +1 únicamente al finalizar la incineración (tras `paper.remove()`).
   - No cuenta si el campo está vacío (solo espacios) ni durante el estado `busy`.
3. **Estado inicial:** oculto hasta el primer problema quemado; aparece con un fade suave.
   Al incrementar, una micro-animación de brillo/pop (deshabilitada con `prefers-reduced-motion`).
4. **Accesibilidad:** `role="status"` + `aria-live="polite"` con etiqueta descriptiva en español.

## Criterios de Aceptación
- [ ] El contador arranca oculto y aparece tras el primer quemado.
- [ ] Suma exactamente +1 por cada problema incinerado (sin dobles conteos).
- [ ] No se guarda ningún dato del usuario (solo el número en memoria).
- [ ] No interfiere con el botón de enviar ni con la animación.
- [ ] Respeta `prefers-reduced-motion`.
