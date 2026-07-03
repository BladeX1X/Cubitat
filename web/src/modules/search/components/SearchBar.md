# SearchBar

## Responsabilidad

`SearchBar` renderiza el bloque principal de busqueda del hero. Permite filtrar propiedades por tipo de operacion, tipo de inmueble y texto libre de ubicacion, con sugerencias mientras el usuario escribe.

El componente es controlado: no hace fetching ni consulta directa a backend. Recibe `filters`, emite cambios con `onChange` y delega el filtrado a `CubitatApp`.

## Ubicacion

- Componente: `src/modules/search/components/SearchBar.tsx`
- Estilos: `src/styles/app.css`
- Tipos: `src/modules/search/types.ts`

## API del Componente

```ts
type SearchBarProps = {
  filters: SearchFilters
  locationSuggestions: LocationSuggestion[]
  onChange: (filters: SearchFilters) => void
  onClear: () => void
  onSubmitSearch: () => void
}
```

### Props

- `filters`: estado actual de filtros (`query`, `operation`, `propertyType`, `zoneId`).
- `locationSuggestions`: lista de ubicaciones/titulos sugeridos para el autocomplete nativo del campo de busqueda.
- `onChange`: callback para actualizar filtros.
- `onClear`: callback para limpiar busqueda.
- `onSubmitSearch`: callback que navega a la pagina de resultados dedicada.

## Estructura Visual

El bloque se compone de:

- Tabs de operacion (seleccion exclusiva, solo uno activo a la vez):
  - Rentar.
  - Comprar.
  - Permuta.

- Filtros principales:
  - Selector de tipo de inmueble.
  - Barra de ubicacion con sugerencias nativas del navegador (`datalist`).
  - Boton de busqueda con icono.

- Accion secundaria:
  - `Limpiar busqueda`.

## Componentes UI Usados

Se usan primitives compartidos inspirados en shadcn:

- `Button` desde `shared/ui/button`.
- `Input` desde `shared/ui/input`.
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` desde `shared/ui/select`.

## Decisiones de Layout

- El hero ocupa `calc(100svh - 76px)`, para que al abrir la pagina solo se vea la imagen/hero y no asome la seccion de resultados ni el mapa.
- El contenido del hero se desplaza ligeramente hacia arriba con `transform: translateY(-28px)` para que los filtros queden mas altos y el dropdown tenga espacio.
- El `h1` usa `margin: 0` para eliminar margen nativo y controlar mejor la altura real del hero.
- Las pastillas de tipo de inmueble y ubicacion son independientes; no forman una sola barra continua.
- La barra de ubicacion no tiene borde visible y el boton de busqueda vive dentro de esa pastilla.

## Dropdown de Tipo de Inmueble

El dropdown de tipo de inmueble debe mantener tamano estable aunque se agreguen mas tipos en el futuro:

- `max-height: 176px`.
- `overflow-y: auto`.
- `overflow-x: hidden`.
- Scrollbar fina.
- `overscroll-behavior: contain`.

Tambien se elevo el stacking del selector:

- `.property-type-field` usa `position: relative` y `z-index: 12`.
- `.location-search-pill` usa `z-index: 4`.
- `.clear-search` queda por debajo con `z-index: 1`.

Esto evita que `Limpiar busqueda` o la seccion inferior se pinten encima del menu.

## Responsive

Desktop:

- Hero ocupa una pantalla bajo el header.
- Filtros en dos pastillas: tipo + ubicacion.
- Dropdown scrollable sin invadir resultados/mapa.

Tablet y movil:

- Los filtros pasan a una columna.
- Las pastillas reducen altura.
- Los tabs de operacion pasan a dos columnas en movil.

## Accesibilidad

- El formulario previene submit nativo y delega la navegacion a `/resultados` mediante `onSubmitSearch`.
- El selector usa `aria-haspopup="listbox"` y `aria-expanded`.
- El campo de ubicacion usa `aria-label="Buscar propiedades"` y `list` asociado a un `datalist` generado con `useId`.
- El boton de busqueda usa `aria-label="Buscar"`.

## Sugerencias de Ubicacion

Las sugerencias se reciben desde `CubitatApp`, actualmente derivadas de las propiedades mock destacadas. Cada sugerencia incluye:

```ts
type LocationSuggestion = {
  label: string
  zoneId: string
}
```

Cuando el usuario escribe, `SearchBar` actualiza `query` normalmente. Si el texto coincide exactamente con una sugerencia, tambien actualiza `zoneId`, lo que permite que resultados y mapa se filtren hacia esa zona.

Pendiente recomendado:

- Asociar visualmente el `Select` con una etiqueta externa si se expone texto visible de campo.
- Agregar navegacion completa por teclado en la implementacion custom del `Select` si se endurece accesibilidad.

## Verificacion

Se verifico:

- `npm run build`
- `npm run lint`
- En desktop `1365x768`:
  - `hero.bottom === viewport height`.
  - La busqueda navega a la vista `/resultados` en vez de mostrar resultados debajo del hero.
  - El dropdown queda dentro del hero.
  - `overflow-y` del dropdown es `auto`.

## Notas de Mantenimiento

- Si se agregan mas tipos de inmueble, no aumentar la altura del dropdown; debe seguir siendo scrollable.
- Si cambia la altura del header, actualizar el calculo del hero.
- Si se modifica la UI del select, volver a verificar que no se solape con `Limpiar busqueda` ni con resultados.

## Cambios Recientes (2026-07-01)

- **Operacion exclusiva:** Los tabs de operacion ahora son de seleccion exclusiva (solo uno activo). Hacer clic en un tab activo lo deselecciona; hacer clic en otro tab cambia la seleccion. Ya no es posible tener "Venta + Renta" activos simultaneamente.
- El mismo comportamiento exclusivo se aplico en el `FilterBar.tsx` de la pagina de resultados, donde los checkboxes se reemplazaron por radio buttons.
