# Mapa base de MapLibre: worker sin empaquetar

Fecha: 2026-10-12  
Estado: desplegado y verificado en producción el 2026-10-12.

## Síntoma y causa

En `https://cubitathome.com/resultados?operacion=alquiler` los controles de zoom respondían y los clusters se movían, pero no aparecían calles ni nombres. Chrome registró `Worker failed to load` de MapLibre. La URL predeterminada `/assets/maplibre-gl-worker.mjs` respondía HTTP 200 con `text/html`: el fallback de la SPA, no el recurso JavaScript. El relieve raster y el estilo sí se descargaban, lo que hizo que la falta de worker pasara inadvertida en comprobaciones anteriores.

## Corrección

`MapLibreAdapter.tsx` importa `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url` y pasa la URL a `maplibregl.setWorkerUrl`. Vite incluye el worker y el módulo compartido como recurso JavaScript autocontenido, con nombre versionado, compatible con el CSP actual (`worker-src 'self' blob:`).

## Evidencia local

- `npm run build` pasó con `SITEMAP_MODE=static`; emitió `assets/maplibre-gl-worker-DoDmivcI.js` (508.71 kB).
- `npm run lint` pasó.
- `npm run test:run`: 638 pasaron y 1 se omitió.
- Se sirvió el worker del nuevo build en una sesión de Chrome abierta contra la página productiva. No aparecieron errores de MapLibre; las teselas PBF y los glifos respondieron HTTP 200; el mapa mostró Florida, Bahamas, Cuba, calles y etiquetas junto a las agrupaciones.
- Supabase no recibió escrituras.

## Verificación en producción

- PR [#138](https://github.com/BladeX1X/Cubitat/pull/138) integrada a `main` como `a34a476d69c7196b030dea5e51d7b542917b5191`.
- Worker `cubitat1` desplegado al 100% como versión `84ea6424-c9a5-4edf-8a1a-a5dffbd7dbcb`.
- Chrome pidió `/assets/maplibre-gl-worker-DoDmivcI.js` y recibió `200 text/javascript`; el navegador creó el worker correctamente.
- Al acercar, se cargaron PBF de zoom 5 y 6. No hubo errores de MapLibre y la captura productiva muestra calles, Cuba, ciudades y topónimos junto con los grupos.
- El zoom actualiza la lista con las propiedades que quedan dentro del área visible.
- Sin cambios ni escrituras de Supabase.

La corrección del worker queda cerrada. Como mejora visual opcional se puede revisar el contraste del estilo en zoom nacional y la separación de grupos sobre los centros urbanos.
