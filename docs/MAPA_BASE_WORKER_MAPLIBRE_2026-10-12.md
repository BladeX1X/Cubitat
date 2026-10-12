# Mapa base de MapLibre: worker sin empaquetar

Fecha: 2026-10-12  
Estado: corrección implementada y validada localmente; pendiente integración y verificación productiva.

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

Esta prueba demuestra el efecto del arreglo en el runtime, pero no equivale a un despliegue productivo.

## Pendiente

Integrar a `main`, dejar que Workers Builds compile/despliegue `phase2-production` y comprobar en producción que el worker responde con JavaScript y que el zoom revela calles y topónimos.
