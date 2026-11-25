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

En el mapa de escritorio y en el mapa móvil a pantalla completa, la selección
de un cluster mantiene esos IDs en la lista/carrusel al acercar o alejar el mapa
y también se los pasa al mapa para que los clusters hijos sigan resaltados. Si
el grupo de 9 se divide en clusters de 4 y 5, ambos marcadores aparecen
seleccionados y las nueve tarjetas permanecen visibles. En móvil, mover el mapa
no cierra el carrusel seleccionado; el usuario puede cerrarlo explícitamente.
El filtrado por área visible se reanuda cuando no hay un grupo seleccionado;
cambiar los filtros o volver a lista limpia la selección anterior.
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

1. Mantener el detalle como pagina independiente mediante `/propiedad/:slug`; la navegacion y el retorno conservan el contexto del listado.
2. Conectar filtros avanzados reales cuando existan datos completos de provincia, municipio, tipo, precio y operacion.
3. Mantener el mapa como modo alterno lista/mapa, con adapter desacoplado y fallback visual de marcadores en DEV.
4. Agregar estados vacios mas especificos cuando no haya resultados para una busqueda.
5. Preparar filtros persistentes en URL cuando se estabilice el modelo de busqueda.

## Decisiones Visuales Actuales

- La pagina de resultados usa grid completo de tarjetas, no mapa junto al listado.
- En escritorio, Comprar/Rentar limita y centra el catálogo a 72 rem (el mismo
  ancho máximo que los directorios de Servicios y Materiales). Al abrir el mapa,
  el shell vuelve a ocupar el ancho disponible para conservar la vista dividida.
- El mapa quedo desacoplado para reincorporarlo despues como modo lista/mapa o pagina especifica.
- Las tarjetas oficiales son `PropertyCard`.
- Las etiquetas editoriales «Nuevo», «Destacado» y «Exclusivo» permanecen
  temporalmente ocultas en las tarjetas y previews del mapa; las categorías y
  operaciones del anuncio siguen visibles.
- Las filas del catálogo usan alturas compartidas: las tarjetas y sus botones de
  contacto se alinean aunque cada propiedad tenga distinta cantidad de datos.
- La busqueda desde portada conserva filtros en estado local.
- El control `Ordenar` usa un popover funcional con opciones: `Relevancia`, `Menor precio`, `Mayor precio` y `Mayor superficie`.
- `Solo Verificados` filtra las marcas `isVerifiedAgent` e `isVerifiedSeller`,
  obtenidas de sus proyecciones canonicas del backend; no usa identificadores
  sinteticos. La proyeccion de vendedor incluye perfiles `buyer`, `seller` y
  `admin` solo si su identidad KYC esta verificada y tienen al menos una
  propiedad publicada.
- Trust Score esta diferido por decision de producto. Resultados no debe mostrar
  filtros, badges ni puntuaciones hasta que exista un contrato de datos aprobado.
- `Relevancia` conserva el orden base recibido por la pagina.
- Cambiar el ordenamiento reinicia la paginacion a la primera pagina.
- El popover de ordenamiento se cierra al seleccionar una opcion para evitar que tape el grid.
- En movil, `/resultados` usa un layout compacto inspirado en portales inmobiliarios: header mas bajo, filtros en una fila, sin resumen descriptivo y con tarjetas reducidas para que se vea mas contenido desde el primer viewport.
- Los controles móviles en dispositivos táctiles (menú, filtros, orden, acciones de tarjeta, carrusel, mapa y paginación) usan objetivos de al menos 48×48 px; las cajas de búsqueda usan fuente de 16 px para evitar zoom automático al enfocarlas.
- En la vista de mapa móvil, acercar o mover el mapa no cierra el carrusel ni pierde la selección; los clusters descendientes conservan el resaltado. Zoom, cierre del carrusel y acciones inferiores tienen objetivos táctiles de 48×48 px.
- `Mostrar mapa` reutiliza el control flotante compartido de Servicios y Materiales, centrado al pie del viewport y respetando el área segura del dispositivo. La creación de alertas permanece disponible en la barra de filtros; el mapa móvil conserva su propio cierre inferior. Hasta 400 px, el encabezado y la paginación se ajustan para evitar scroll horizontal. Los controles de filtros y alerta alcanzan 48 px en dispositivos táctiles.
- La hoja de filtros ocupa todo el ancho en teléfonos de hasta 360 px para que los controles de operación y acciones inferiores no queden cortados.
- En la lista móvil de resultados, el encabezado global se desplaza con la página; al quedar fija, la barra de búsqueda se ubica a 8 px del borde superior para no reservar el espacio de un encabezado que ya salió del viewport.
- En movil, la bottom nav se oculta solo en `/resultados` para no tapar las tarjetas y maximizar el espacio de exploracion.
- El modo visual `list|map` se conserva en `window.history.state` de la entrada
  actual. Así, abrir un detalle desde la preview y volver con `Atrás` restaura el
  mapa sin crear una entrada adicional ni sobrescribir otros datos del historial.
- Cualquier valor de historial distinto de `list` o `map` se ignora y la página
  usa la lista como fallback seguro.
- Verificado en producción el 2026-07-14 tras PR #29 / `5de3ead`: en viewport
  390×844, mapa → grupo de La Habana → primer detalle → Atrás restauró el
  diálogo de mapa y `Ocultar mapa`; consola limpia. Worker verificado
  `be21f08f-f473-455e-b6c2-d754a8b35813`.

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

## Hardening de imágenes y CSS 2026-07-13

- Las dos primeras tarjetas del catálogo priorizan solo su imagen principal,
  porque cualquiera de ellas puede convertirse en LCP según el viewport.
- Desde la tercera tarjeta, las imágenes usan carga diferida y prioridad de red
  baja para no competir con el contenido sobre el fold.
- `ResultsPage.css` se carga con la ruta lazy de resultados; los estilos
  exclusivos del catálogo, filtros móviles y mapa no bloquean la portada.

## Fallback crítico de la ruta 2026-07-13

- El fallback de `Suspense` de resultados usa clases autónomas
  `results-route-fallback*` definidas en el CSS global de entrada.
- No debe reutilizar clases de `ResultsPage.css`: ese archivo llega junto con
  el módulo lazy y aplicarlo después del primer render provoca cambios de layout.
- El fallback reserva la misma estructura responsive del catálogo: cuatro,
  tres, dos o una columna según el viewport, y 154 px de imagen en móvil.
- La regresión queda cubierta por `PageLoadingState.test.tsx` y por una traza
  móvil con red y CPU limitadas antes de desplegar.

## Alineación de acciones y controles del catálogo — 2026-11-24

En la grilla de Comprar, el pie de las tarjetas coloca Contactar y Consultar al
mismo nivel aunque cambien las especificaciones o el título. El control de mapa
se ubica en el flujo del documento junto al catálogo, por lo que no se superpone
a las acciones en pantallas móviles.
