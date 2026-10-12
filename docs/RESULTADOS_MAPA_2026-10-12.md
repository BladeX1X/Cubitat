# Resultados de alquiler y mapa — 2026-10-12

## Hallazgo

- En producción, la API devuelve 96 propiedades publicadas en alquiler y 20 con al menos dos estacionamientos. El enlace `/resultados?operacion=alquiler` mostraba correctamente 20 después de aplicar ese filtro durante la inspección.
- El mapa mantuvo dos marcadores de anuncios de venta mientras la lista mostraba alquileres. La causa está en el respaldo DOM de `MapLibreAdapter`: solo se generaba al iniciar el mapa, no seguía la fuente filtrada ni agrupaba puntos.
- La lista desktop también podía quedar vacía al abrir el mapa: el adaptador notificaba la primera ventana visible antes de que terminara el ajuste inicial del mapa, y el componente padre filtraba los resultados con ese viewport inicial. Se quitó esa notificación automática; la lista conserva todos los resultados hasta que el usuario mueve/zoomea el mapa.

## Cambio preparado

- El respaldo vuelve a calcular sus marcadores con la fuente vigente y en cada cambio de viewport.
- La lista no se recorta con el viewport provisional de inicio; el recorte comienza al interactuar con el mapa.
- Agrupa los anuncios cercanos en pantalla, anuncia cuántos contiene el botón y al pulsarlo comunica sus IDs a la lista; si no hay callback, acerca el mapa.
- Si las capas nativas del mapa sí se pintan, retira el respaldo DOM.
- No se escribieron datos de Supabase ni se añadieron anuncios de prueba.

## Estado y verificación

- PR [#135](https://github.com/BladeX1X/Cubitat/pull/135) se fusionó a `main` con merge `e23e9468f7ee3fc31557b2ddce5c959498f03a6d`; CI pasó auditoría, lint, pruebas unitarias y builds de perfiles base/DEV/documental/Fase 2.
- El Worker `cubitat1` desplegó `6b62585b-aaaa-44c4-b7eb-4623e099700b` al 100% el 2026-10-12 18:02 UTC.
- Tras recargar producción, `/resultados?operacion=alquiler` mostró 96 anuncios y grupos numerados. Al activar estacionamiento `2`, el contador y la lista mostraron 20 y el mapa actualizó sus pines a alquileres/grupos. Pulsar `Ver 20 resultados` cerró el filtro manteniendo los 20 anuncios.
- `npm run lint`, `npx tsc -b --pretty false` y `npx vite build` pasan localmente.
- Sin escrituras de Supabase ni anuncios sintéticos nuevos.

## Diagnóstico del mapa base — 2026-10-12

- En producción, el estilo Liberty y el manifiesto CSP permiten pedir recursos a `tiles.openfreemap.org`. Desde el entorno de inspección, TileJSON, tesela vectorial versionada, tesela de relieve y glifos respondieron HTTP 200. El endpoint vectorial sin el segmento de versión devolvió un cuerpo vacío; el TileJSON actual anuncia la ruta versionada.
- En el navegador se ven el relieve raster y los marcadores DOM de respaldo, pero no se aprecian etiquetas o carreteras. Esto sitúa el fallo en la carga/pintado de los recursos vectoriales en el navegador, aunque la inspección de red remota no pudo obtener el detalle de sus fallos.
- Se añadió observabilidad `map.on('error')` limitada por instancia. Registra códigos cerrados y categorías seguras (`vector_tiles`, `raster_tiles`, `property_data`, `other`), sin volcar mensajes ni URLs. La causa final queda pendiente de observar esos eventos en un despliegue.
- Aún no se ha desplegado esta instrumentación a producción ni se afirma que los errores del proveedor sean la causa.

