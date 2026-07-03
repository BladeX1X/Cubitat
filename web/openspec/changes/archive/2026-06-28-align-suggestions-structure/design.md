# Diseño Técnico: Estructura del Dropdown de Sugerencias

## Estructura del JSX (`SearchBar.tsx`)
Modificaremos la renderización del panel de sugerencias en `SearchBar.tsx` para agregar cabeceras de sección y la opción de geolocalización:

```tsx
<div className="absolute top-[102%] left-0 right-0 z-[100] mt-2 max-h-80 overflow-y-auto rounded-[10px] border border-[rgba(0,139,105,0.18)] bg-white shadow-[var(--shadow)] flex flex-col">
  
  {/* Sección 1: También puedes buscar con */}
  <div className="suggestion-section-header">TAMBIÉN PUEDES BUSCAR CON</div>
  <button type="button" className="suggestion-item geolocation-item">
    <MapPin className="h-[18px] w-[18px] shrink-0 text-[#035f53]" />
    <span>Usar mi ubicación</span>
  </button>
  
  <div className="suggestion-divider" />

  {/* Sección 2: Zonas más buscadas */}
  <div className="suggestion-section-header">ZONAS MÁS BUSCADAS</div>
  {filteredSuggestions.map((suggestion) => (
    <button key={suggestion.label} type="button" className="suggestion-item">
      <MapPin className="h-[18px] w-[18px] shrink-0 text-[#6d7c79]" />
      <span>{suggestion.label}</span>
    </button>
  ))}
</div>
```

## Estilos CSS (`src/styles/app.css`)
Agregaremos estilos dedicados para las cabeceras de sección y los ítems:
- `.suggestion-section-header`: texto gris (`#767676` o `--grey-text`), `font-size: 11px`, `font-weight: 700`, `letter-spacing: 0.05em`, `text-transform: uppercase`, padding `12px 26px 6px`.
- `.suggestion-divider`: línea delgada de separación (`border-bottom: 1px solid rgba(0, 139, 105, 0.08)`).
- `.suggestion-item`: el botón con el diseño del SelectItem de shadcn, con un hover state sutil.
- `.geolocation-item`: tendrá un fondo ligeramente grisáceo por defecto para destacar que es un botón de acción diferente.
