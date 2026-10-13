# Constitución del Proyecto: La Hoguera (Burn Your Problems)

## 1. Propósito y Filosofía
Una experiencia web catártica, inmersiva y minimalista donde los usuarios escriben sus problemas o quejas del mundo y los lanzan a una hoguera a pantalla completa para ver cómo se consumen y desaparecen para siempre.

## 2. Privacidad y Datos (Regla de Oro)
- **Cero Persistencia:** Ningún mensaje escrito por el usuario debe guardarse en bases de datos, LocalStorage, cookies ni enviarse a servidores externos.
- Todo el ciclo de vida del texto ocurre en el DOM y se destruye por completo al finalizar la animación de quemado.

## 3. Stack Tecnológico e Invariantes
- **HTML5 semántico, CSS3 moderno (Variables, Keyframes/3D Transforms) y Vanilla JavaScript (ES6+).**
- **Cero Frameworks y Cero Dependencias:** Prohibido usar React, Vue, Tailwind, jQuery o instalar paquetes vía `npm`. El proyecto debe correr como archivos estáticos puros para desplegarse fácilmente en un servidor Linux ligero.

## 4. Reglas de Interacción (UX/UI)
- **Fondo:** Hoguera en movimiento ocupando el 100% del viewport (`100vw`, `100vh`) sin barras de scroll.
- **Leyenda Principal:** Debe mostrar exactamente: *"Escribe aquí tus problemas o quejas del mundo y deja que se consuma... en la hoguera"*.
- **Área de escritura:** Ubicada en la parte inferior, integrada con colores cálidos/oscuros similares al fondo (efecto glassmorphism oscuro/brasas).
- **Disparador estricto:** La animación de envío **SOLO** debe activarse al hacer clic explícito en el botón de enviar (prohibido enviarlo solo con la tecla Enter por accidente).
- **Animación de destrucción:** Al hacer clic en enviar, el contenedor del mensaje o una representación en papel debe arrugarse/doblarse, volar hacia el centro de la hoguera, consumirse en fuego/partículas y eliminarse del DOM, dejando el campo limpio para otro mensaje.