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

