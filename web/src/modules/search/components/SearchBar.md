# SearchBar

## Responsabilidad

`SearchBar` renderiza el bloque principal de busqueda del hero. Permite filtrar propiedades por tipo de operacion, tipo de inmueble y texto libre de ubicacion.

El componente es controlado: no hace fetching ni consulta directa a backend. Recibe `filters`, emite cambios con `onChange` y delega el filtrado a `CubitatApp`.

## Ubicacion

- Componente: `src/modules/search/components/SearchBar.tsx`
- Estilos: `src/styles/app.css`
- Tipos: `src/modules/search/types.ts`

## API del Componente

```ts
type SearchBarProps = {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onClear: () => void
}
```

### Props

- `filters`: estado actual de filtros (`query`, `operation`, `propertyType`, `zoneId`).
- `onChange`: callback para actualizar filtros.
- `onClear`: callback para limpiar busqueda.

## Estructura Visual

El bloque se compone de:

- Tabs de operacion:
  - Rentar.
  - Comprar.
  - Permuta.
  - Rent-to-own.

- Filtros principales:
  - Selector de tipo de inmueble.
  - Barra de ubicacion.
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

- El formulario previene submit nativo y desplaza a resultados.
- El selector usa `aria-haspopup="listbox"` y `aria-expanded`.
- El campo de ubicacion usa `aria-label="Buscar propiedades"`.
- El boton de busqueda usa `aria-label="Buscar"`.

Pendiente recomendado:

- Asociar visualmente el `Select` con una etiqueta externa si se expone texto visible de campo.
- Agregar navegacion completa por teclado en la implementacion custom del `Select` si se endurece accesibilidad.

## Verificacion

Se verifico:

- `npm run build`
- `npm run lint`
- En desktop `1365x768`:
  - `hero.bottom === viewport height`.
  - `workspace.top === viewport height`.
  - El dropdown queda dentro del hero.
  - `overflow-y` del dropdown es `auto`.

## Notas de Mantenimiento

- Si se agregan mas tipos de inmueble, no aumentar la altura del dropdown; debe seguir siendo scrollable.
- Si cambia la altura del header, actualizar el calculo del hero.
- Si se modifica la UI del select, volver a verificar que no se solape con `Limpiar busqueda` ni con resultados.
