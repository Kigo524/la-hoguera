---
name: fire-catharsis-ui
description: Úsala siempre que diseñes, animes o modifiques la interfaz de La Hoguera, el fondo de fuego, la estética de brasas o la animación del papel arrugándose y quemándose.
---

# Directrices de Diseño y Animación: La Hoguera

1. **Atmósfera y Fondo (100vw x 100vh):**
   - El fondo debe mostrar una hoguera viva a pantalla completa (`overflow: hidden`).
   - Combina un video/GIF en bucle (con fallback a un Canvas de partículas de fuego/brasas generadas por JS + gradientes radiales dinámicos CSS) para que el fuego siempre se vea en movimiento fluido incluso si falla la carga de un recurso externo.

2. **Tipografía y Leyenda:**
   - La leyenda superior debe tener una tipografía con carácter (ej. serif cinematográfica o sans-serif limpia con resplandor cálido `text-shadow` color ámbar `#ff7b00`).

3. **Cuadro de Texto (Zona Inferior):**
   - Estilo glassmorphism oscuro cálido (`background: rgba(20, 10, 5, 0.75)`, `backdrop-filter: blur(8px)`, borde sutil color brasa `rgba(255, 100, 30, 0.3)`).

4. **Física de la Animación del Mensaje (Solo por Clic):**
   - Al hacer clic en el botón de enviar, el texto escrito se transfiere visualmente a un elemento "hoja de papel/nota".
   - **Fase 1 (Pliegue/Arrugado):** Uso de `transform: perspective(...) rotateX(...) rotateY(...) scale(...)` y filtros para simular que el papel se dobla o arruga.
   - **Fase 2 (Vuelo hacia las llamas):** Trayectoria curva hacia el centro/base de la hoguera reduciendo su escala (`scale(0.15)`).
   - **Fase 3 (Incineración):** El borde del papel se torna incandescente (`box-shadow` naranja/amarillo intenso), se desintegra en una explosión de chispas/cenizas que suben y el nodo se elimina completamente del DOM.