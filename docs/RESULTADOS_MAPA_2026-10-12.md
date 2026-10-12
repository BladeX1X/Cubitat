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

- Implementado localmente en rama `fix/rent-results-map-clustering`; todavía requiere revisión/CI y despliegue antes de comprobarse en producción.
- `npm run lint`, `npx tsc -b --pretty false` y `npx vite build` pasan.
- No se ejecutaron pruebas unitarias en esta tarea.
