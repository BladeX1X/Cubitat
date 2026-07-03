# Alinear Estilo del Dropdown de Sugerencias de Dirección

## Why
El dropdown de sugerencias de dirección (autocomplete en el input de búsqueda) tiene un aspecto visual que no coincide con el dropdown del selector de Tipo de Propiedad (Select de shadcn). Esto rompe la consistencia visual de la barra de búsqueda principal.

## What Changes
Modificar el contenedor y los elementos del dropdown de sugerencias en `SearchBar.tsx` para que utilicen clases de estilo que repliquen exactamente la apariencia de los componentes de shadcn (`SelectContent` y `SelectItem`).
