# PropertyMap

## Especificaciones (Specs)
- **Responsabilidad:** Exponer una interfaz unificada (un componente Wrapper) para renderizar un mapa interactivo con pines de propiedades. Actúa como capa de abstracción para que la aplicación no dependa directamente de una librería de mapas en concreto.
- **Props:**
  - `properties` (Array): Lista de propiedades a geolocalizar y renderizar como marcadores.
  - `selectedPropertyId` (string | null): ID de la propiedad que el usuario tiene seleccionada (para destacar el marcador).
  - `onSelectProperty` (Function): Callback disparado al hacer clic en un pin/marcador del mapa.
- **Estado:** Gestiona de forma interna qué motor de mapas usar a través de la variable `ENABLE_MAPLIBRE` (o variables de entorno).

## Cómo se hizo
Se implementó bajo el patrón estructural "Adapter". `PropertyMap` delega la lógica de renderizado a dos adaptadores diferentes:
1. `MapLibreAdapter`: Motor avanzado de mapas con teselas reales (MapLibre GL JS).
2. `SvgMapAdapter`: Motor de respaldo/visual usando un SVG estático de Cuba, útil para entornos de desarrollo sin API keys o sin internet.
Al recibir las propiedades, `PropertyMap` simplemente verifica qué adaptador está activado y le transmite los datos, asegurando que `CubitatApp` no necesite conocer los detalles de implementación de Mapbox, Leaflet o MapLibre.
