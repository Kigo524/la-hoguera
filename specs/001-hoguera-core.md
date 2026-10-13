# Spec 001: Núcleo Interactivo de La Hoguera

## Objetivo
Implementar la experiencia completa de "La Hoguera" en una SPA estática (`index.html`, `css/styles.css`, `js/app.js`).

## Requisitos Funcionales
1. **Fondo de Hoguera a Pantalla Completa:**
   - Contenedor de fondo que ocupe el 100% de la pantalla (`100vw`, `100vh`) con una hoguera animada (combinando video/GIF de fuego libre de derechos y un sistema Canvas de fuego/brasas en tiempo real para garantizar movimiento perpetuo y chispas interactivas).
2. **Encabezado Principal:**
   - En la parte superior/central, mostrar la leyenda: `"Escribe aquí tus problemas o quejas del mundo y deja que se consuma... en la hoguera"`.
3. **Panel Inferior de Desahogo:**
   - Ubicado en la parte inferior de la pantalla.
   - `textarea` amplio con colores oscuros/cálidos integrados con el fondo de la hoguera.
   - Botón de acción claro (ej. "Lanzar a la hoguera" 🔥).
   - Si el campo está vacío (o solo tiene espacios), el clic en el botón no debe disparar la animación.
4. **Disparador Exclusivo por Clic:**
   - Escuchar únicamente el evento `click` en el botón de enviar. Evitar cualquier envío automático por teclado.
5. **Animación de Arrugado, Vuelo y Consumo:**
   - Al hacer clic en enviar:
     - Capturar el texto, limpiar inmediatamente el `textarea` y deshabilitar temporalmente o permitir múltiples envíos limpios.
     - Crear un elemento visual con el texto que se pliegue/arrugue en 3D, vuele hacia el corazón de la hoguera, arda en llamas aumentando el brillo/chispas del fuego y desaparezca eliminándose del DOM.

## Criterios de Aceptación
- [ ] Cero scrollbars en escritorio y móvil.
- [ ] Texto de la leyenda exacto.
- [ ] Presionar Enter en el cuadro de texto solo hace salto de línea, jamás envía el mensaje.
- [ ] Hacer clic en el botón lanza la animación hacia el fuego y destruye el texto del DOM al finalizar.