# AGENTS.md - Guía de Orquestación para La Hoguera

## Contexto del Proyecto
Aplicación web interactiva y catártica de una sola página (SPA estática). Lee siempre `docs/CONSTITUTION.md` antes de proponer o escribir cualquier código.

## Estructura del Proyecto
- `index.html`: Estructura principal de la página.
- `css/styles.css`: Estilos, diseño responsivo, paleta de colores de fuego/brasas y animaciones.
- `js/app.js`: Lógica de eventos, validación de clic y orquestación de la animación hacia la hoguera.
- `docs/CONSTITUTION.md`: Reglas inquebrantables de arquitectura y privacidad.
- `specs/`: Especificaciones detalladas de cada feature (SDD).

## Comandos de Ejecución Local
- Levantar servidor de prueba: `python3 -m http.server 8090`

## Prohibiciones Estrictas (Qué NO hacer)
- NO inicialices `package.json` ni instales paquetes de Node.
- NO permitas que el formulario se envíe con la tecla Enter; el evento debe ser exclusivamente por clic en el botón de envío.
- NO almacenes el texto del usuario en ninguna parte tras finalizar la animación.
- NO escribas código sin que exista o se haya revisado primero el plan o la especificación en `specs/`.
- Al empezar cualquier interacción, lee SIEMPRE `MEMORY.md` para conocer el estado del proyecto y las decisiones pasadas[cite: 6].
- Actualiza SIEMPRE `MEMORY.md` al terminar cada tarea, resumiendo los cambios técnicos y manteniendo el límite estricto de 50 líneas[cite: 6].