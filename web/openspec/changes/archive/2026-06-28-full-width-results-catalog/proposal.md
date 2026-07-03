# Página de Resultados en Catálogo de Ancho Completo

## Why
El usuario prefiere un catálogo de propiedades a ancho completo en la página de resultados (con un grid de 4 columnas) en lugar del diseño de pantalla dividida side-by-side, emulando la interfaz limpia de propiedades.com. El detalle del inmueble se abrirá en pantalla completa al hacer clic en una propiedad.

## What Changes
- En `CubitatApp.tsx`, cambiar la vista de resultados para renderizar un listado/catálogo de ancho completo (`.workspace-catalog`) cuando no haya ninguna propiedad seleccionada.
- Cuando se seleccione una propiedad, renderizar la vista de detalle `<PropertyDetail />` en pantalla completa con una opción de regreso que limpie la selección.
- En `app.css`, estructurar las clases `.workspace-catalog`, `.results-toolbar-full`, `.results-boost-full` y `.property-catalog-grid` (con un grid de 4 columnas en escritorio, 2 en tablets y 1 en móviles).
