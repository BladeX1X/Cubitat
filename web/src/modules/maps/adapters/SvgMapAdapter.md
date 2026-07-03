# SvgMapAdapter

## Especificaciones (Specs)
- **Responsabilidad:** Proveer una visualización alternativa (fallback) del mapa de Cuba usando gráficos vectoriales (SVG) de forma estática en lugar de un motor dinámico. Ideal para entornos sin conexión, de bajo rendimiento o cuando MapLibre falla.
- **Props:** Las mismas que su equivalente: `properties`, `selectedPropertyId` y `onSelectProperty`.
- **Interactividad:** Simula marcadores sobre el mapa SVG mapeando coordenadas geográficas crudas (Lat/Lng) a píxeles virtuales del SVG (X/Y) utilizando funciones matemáticas.

## Cómo se hizo
1. **Gráfico Vectorial:** Se inserta el código XML del SVG de Cuba dentro de un contenedor reactivo manteniendo el `viewBox`.
2. **Sistema de Proyección Local:** Se desarrolló una función `projectCoordinates(lng, lat)` que implementa una transformación lineal básica o mercator simplificada para convertir la longitud y latitud de las propiedades en coordenadas porcentuales (X/Y) relativas al contenedor SVG de Cuba.
3. **Renderizado de Pines:** Se mapean (map) las propiedades usando las coordenadas proyectadas para pintar elementos `<circle>` o un componente de marcador visual directamente en el DOM del SVG, añadiendo eventos de `onClick` para desencadenar el selector global.
4. **Resaltado Visual:** Si una propiedad está seleccionada, el punto SVG cambia dinámicamente de tamaño, z-index o color mediante el operador ternario vinculado a la prop `selectedPropertyId`.
