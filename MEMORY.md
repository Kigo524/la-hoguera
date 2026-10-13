# Memoria del Proyecto: La Hoguera

**Regla de Memoria:** Máximo 50 líneas. Resume o elimina lo que ya no aporte valor.

## Estado Actual (V1)
- SPA estática implementada con HTML, CSS y Vanilla JS.
- Motor de fuego en Canvas optimizado (DPR 1, renderizado offscreen) corriendo a 60 FPS estables.
- Efectos CSS (backdrop-filter y sombras dinámicas) balanceados para evitar lag.
- El ciclo catártico (escribir -> clic -> animación de arrugado/vuelo 3D -> incineración -> destrucción del DOM) funciona correctamente sin persistencia de datos.
- Contador de sesión sutil en la esquina inferior derecha (icono 🔥 + número) que cuenta los problemas quemados.

## Aprendizajes y Decisiones Técnicas
- El evento de envío está blindado exclusivamente al clic; `Enter` solo hace salto de línea.
- No se requiere base de datos; la destrucción efímera del texto es el núcleo del proyecto.
- El contador vive solo en memoria (se reinicia al recargar), suma +1 tras `paper.remove()` y guarda únicamente el número, nunca el texto.

## Pruebas E2E
- Flujo validado en móvil (375px): escribir -> clic en "Lanzar a la hoguera" -> arrugado/vuelo/incineración -> papel fuera del DOM, campo limpio y contador +1. Sin errores ni warnings en consola; sin LocalStorage/SessionStorage/cookies. Captura en `la-hoguera-mobile-375.png`.
- Nota entorno: el Chrome-for-Testing gestionado por el MCP no está firmado y macOS lo mata (EBADMACHO); se usa el Google Chrome del sistema vía `executablePath`.