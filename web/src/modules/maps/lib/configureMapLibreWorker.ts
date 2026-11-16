import * as maplibregl from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// MapLibre's package-relative default falls through the Worker's SPA route in production.
// Bundle and configure the worker as a regular JavaScript asset for every map entry point.
maplibregl.setWorkerUrl(maplibreWorkerUrl)
