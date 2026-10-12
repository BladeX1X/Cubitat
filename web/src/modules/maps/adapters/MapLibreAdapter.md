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
4. **Capas:** Usa capas nativas para clusters, conteo de clusters, puntos individuales y etiquetas de precio/permuta. Si las capas GeoJSON no se pintan, crea marcadores DOM de respaldo agrupados por proximidad en pantalla.
5. **Interacción:** Hacer click en un cluster acerca el mapa hasta expandirlo. Hacer click en una propiedad individual dispara `onSelectProperty`.
6. **UI:** El encabezado flotante del mapa fue retirado para dejar el área del mapa limpia.
7. **Limpieza:** Al desmontarse, se llama a `map.remove()` para liberar WebGL y listeners internos.
8. **Coordenadas defensivas:** Normaliza tanto `latitude/longitude` como el formato legado `lat/lng` y omite de la fuente GeoJSON cualquier coordenada no finita o fuera de rango para que una fila defectuosa no derribe resultados.
9. **Sincronización del respaldo:** Regenera los marcadores de respaldo cuando cambia la fuente filtrada o el viewport; elimina los marcadores viejos y entrega los IDs de un grupo a la lista de resultados al pulsarlo.
10. **Viewport inicial:** No filtra la lista con los límites provisionales del mapa al abrirse; la lista se limita al área visible después de que el usuario mueve o acerca el mapa.
11. **Diagnóstico de recursos:** Escucha los errores posteriores a la inicialización de MapLibre y registra una sola vez cada combinación de recurso/código. Los recursos se reducen a categorías permitidas (teselas vectoriales, relieve, datos de propiedades u otros) y los mensajes originales/URLs no se escriben en consola.
12. **Worker de MapLibre:** Se importa con `?worker&url` y se configura mediante `setWorkerUrl`. Vite empaqueta el worker junto con su módulo compartido; ambos deben servirse como JavaScript. Si el URL del worker responde con el HTML de fallback de la SPA, MapLibre conserva controles/marcadores DOM pero no dibuja calles ni etiquetas.
