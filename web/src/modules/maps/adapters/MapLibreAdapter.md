# MapLibreAdapter

## Especificaciones (Specs)
- **Responsabilidad:** Renderizar un mapa interactivo con `maplibre-gl`, tiles open source y propiedades agrupables por cercanía/zoom.
- **Props:** Recibe `properties`, `selectedPropertyId` y `onSelectProperty` desde `PropertyMap`.
- **Dependencias:**
  - `maplibre-gl` como motor de mapa open source.
  - Fuente GeoJSON interna generada desde las propiedades mock/filtradas.

## Cómo se hizo
1. **Inicialización:** Usa `useRef` para conservar la instancia de `maplibregl.Map` y crea el mapa una sola vez al montar el componente.
2. **Tiles:** Carga el estilo remoto de OpenFreeMap y centra inicialmente el mapa sobre Cuba.
3. **Clustering:** Convierte las propiedades en una `FeatureCollection` GeoJSON y la registra como fuente `cluster: true`. MapLibre agrupa automáticamente puntos cercanos cuando el usuario aleja el mapa y los separa al acercarse.
4. **Capas:** Usa capas nativas para clusters, conteo de clusters, puntos individuales y etiquetas de precio/permuta. Ya no crea marcadores DOM manuales.
5. **Interacción:** Hacer click en un cluster acerca el mapa hasta expandirlo. Hacer click en una propiedad individual dispara `onSelectProperty`.
6. **UI:** El encabezado flotante del mapa fue retirado para dejar el área del mapa limpia.
7. **Limpieza:** Al desmontarse, se llama a `map.remove()` para liberar WebGL y listeners internos.
