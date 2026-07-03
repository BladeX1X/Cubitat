# Diseño Técnico: Catálogo de Ancho Completo en Resultados

## Cambios en JSX (`src/app/CubitatApp.tsx`):
- Modificar el flujo condicional para que `<PropertyDetail>` se renderice a pantalla completa con el prop `onBack`.
- Crear el contenedor `.workspace-catalog` que reemplace al grid `.workspace`.
- Integrar la barra de filtros `.results-toolbar-full` y el banner de avalúo `.results-boost-full` directamente arriba de la página.
- Renderizar las tarjetas de propiedades usando `.property-catalog-grid`.

## Estilos CSS (`src/styles/app.css`):
Implementar el grid de 4 columnas:
```css
.property-catalog-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-top: 24px;
}
```
y añadir los estilos correspondientes para estirar el banner de avalúo inteligente y el toolbar.
