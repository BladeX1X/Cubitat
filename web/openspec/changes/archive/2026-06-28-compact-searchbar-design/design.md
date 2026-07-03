# Diseño Técnico: Compactar Barra de Búsqueda y Sugerencias

## Cambios en CSS (`src/styles/app.css`):
Modificaremos los siguientes selectores en `app.css`:
- `.search-fields label`: cambiar `min-height: 72px` a `52px`.
- `.property-type-trigger`: cambiar `height: 72px` a `52px`, `padding: 0 0 0 26px` a `0 0 0 18px`.
- `.search-fields select, .property-type-trigger`: cambiar `font-size: 20px` a `15px`, `font-weight: 700` a `600`.
- `[data-slot="select-value"]`: cambiar `font-size: 18px` a `15px`, `font-weight: 700` a `600`.
- `.location-search-pill`: cambiar `min-height: 72px` a `52px`, `padding: 0 12px 0 24px` a `0 6px 0 18px`.
- `.location-search-input`: cambiar `font-size: 18px` a `15px`, `font-weight: 700` a `600`.
- `.search-submit`: cambiar `width` y `height` de `48px` a `40px`.
- `.suggestion-section-header`: cambiar `font-size: 11px` a `10px`, y padding a `10px 18px 4px`.
- `.media queries (tablet/movil)`: ajustar también los altos de `.property-type-trigger` y `.location-search-pill` de `66px` a `52px` para mantener la consistencia responsiva.

## Cambios en JSX (`SearchBar.tsx`):
- Cambiar el tamaño del icono de lupa a `size={20}`.
- En el dropdown de sugerencias, cambiar las clases Tailwind:
  - `text-[18px]` a `text-[14px]`.
  - `font-[520]` a `font-medium`.
  - `px-[26px]` a `px-[18px]`.
  - `py-[10px]` a `py-[7px]`.
  - `min-h-[48px]` a `min-h-[38px]`.
  - Icono de MapPin a `h-[15px] w-[15px]`.
