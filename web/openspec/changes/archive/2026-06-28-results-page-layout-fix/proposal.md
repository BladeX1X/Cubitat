# Corregir Maquetación de la Página de Resultados

## Why
La página de resultados (`/resultados`) se muestra con un diseño CSS roto. Los elementos del listado izquierdo (`results-toolbar`, `results-boost` y `results-panel`) se apilan de forma incorrecta en la rejilla `.workspace` de dos columnas y el panel de detalle (`PropertyDetail`) se renderiza al final de la página en lugar de situarse al lado derecho en ordenadores.

## What Changes
- En `CubitatApp.tsx`, envolver el listado y sus filtros en un contenedor `.results-sidebar`.
- En `CubitatApp.tsx`, renderizar el detalle `<PropertyDetail />` dentro del grid `.workspace` como su segunda columna.
- En `app.css`, añadir estilos para `.results-sidebar`, `.results-toolbar`, `.filter-chip` y `.results-boost`.
