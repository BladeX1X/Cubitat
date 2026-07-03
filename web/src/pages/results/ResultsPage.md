# ResultsPage

## Estado Actual

La pagina de resultados ya esta extraida como componente propio en:

```txt
src/pages/results/ResultsPage.tsx
```

`CubitatApp` debe tratarla como una pagina de presentacion: le pasa filtros, propiedades y callbacks, pero no debe meter aqui logica interna de Supabase ni decisiones del proveedor de mapas.

## Responsabilidad Esperada

`ResultsPage` debe representar la pagina dedicada de resultados de busqueda.

Debe incluir:

- Toolbar de filtros activos.
- Banner/promocion secundaria.
- Encabezado con contador de resultados.
- Ordenamiento.
- Grid de `PropertyCard`.
- Estado de seleccion de propiedad.
- Entrada opcional al detalle.
- Reutilizacion de `PopularLocations` como bloque de exploracion secundaria, si se mantiene.

No debe incluir:

- Hero de portada.
- Login modal.
- Header global.
- Footer global.
- Logica interna de Supabase.
- Implementacion concreta de mapas.

## Props Sugeridas

```ts
type ResultsPageProps = {
  filters: SearchFilters
  properties: Property[]
  selectedPropertyId?: string
  loading?: boolean
  onSelectProperty: (propertyId: string) => void
  onClearFilters: () => void
  onChangeFilters?: (filters: SearchFilters) => void
}
```

Si se decide que el detalle sea otra pagina real, `ResultsPage` no debe renderizar `PropertyDetail`; solo debe navegar o enlazar al detalle.

## Trabajo Pendiente

1. Definir si el detalle se abre como pagina independiente (`/propiedades/:id`) o como estado de seleccion dentro del listado.
2. Conectar filtros avanzados reales cuando existan datos completos de provincia, municipio, tipo, precio y operacion.
3. Definir si el mapa vuelve como modo alterno lista/mapa o como pagina separada.
4. Agregar estados vacios mas especificos cuando no haya resultados para una busqueda.
5. Preparar filtros persistentes en URL cuando se estabilice el modelo de busqueda.

## Decisiones Visuales Actuales

- La pagina de resultados usa grid completo de tarjetas, no mapa junto al listado.
- El mapa quedo desacoplado para reincorporarlo despues como modo lista/mapa o pagina especifica.
- Las tarjetas oficiales son `PropertyCard`.
- La busqueda desde portada conserva filtros en estado local.
- El control `Ordenar` usa un popover funcional con opciones: `Relevancia`, `Menor precio`, `Mayor precio` y `Mayor superficie`.
- `Relevancia` conserva el orden base recibido por la pagina.
- Cambiar el ordenamiento reinicia la paginacion a la primera pagina.
- El popover de ordenamiento se cierra al seleccionar una opcion para evitar que tape el grid.
- En movil, `/resultados` usa un layout compacto inspirado en portales inmobiliarios: header mas bajo, filtros en una fila, sin resumen descriptivo y con tarjetas reducidas para que se vea mas contenido desde el primer viewport.
- En movil, la bottom nav se oculta solo en `/resultados` para no tapar las tarjetas y maximizar el espacio de exploracion.

## Verificacion Esperada

Despues de extraer esta pagina:

```bash
npm run build
npm run lint
```

Prueba manual:

- Abrir `/`.
- Ejecutar busqueda.
- Confirmar navegacion a `/resultados`.
- Confirmar que no aparece hero en `/resultados`.
- Confirmar que aparecen tarjetas.
- Confirmar que seleccionar una tarjeta actualiza el estado seleccionado.
