# Diseño Técnico: Estructura y Estilos de Resultados

## Componente React (`src/app/CubitatApp.tsx`):
Reorganizar el bloque JSX bajo `pageMode === 'results'` para agrupar las columnas:
```tsx
<section className="workspace" id="resultados">
  <div className="results-sidebar">
    <div className="results-toolbar">...</div>
    <div className="results-boost">...</div>
    <section className="results-panel">...</section>
  </div>
  <PropertyDetail property={...} />
</section>
```

## Estilos CSS (`src/styles/app.css`):
Establecer estilos fijos y scroll lateral en la barra izquierda:
```css
.results-sidebar {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 76px);
  position: sticky;
  top: 76px;
  background: var(--panel);
  border-right: 1px solid var(--line);
  overflow-y: auto;
}
```
y añadir variables visuales de color primario para `.filter-chip` y `.results-boost`.
