# CatalogMap

## Responsabilidad

Punto único de entrada a los mapas de los catálogos. Selecciona el modo de
propiedades o conteo provincial y mantiene diferido el código pesado de mapas.

Ambos modos interactivos reutilizan `useMapLibreMap` y
`MapLibreStatusOverlay`, también usados por Comprar. Esto estandariza el estilo,
los controles, el redimensionado y los estados de carga/error sin mezclar las
capas ni los datos: SVC/MAT conservan agregación y filtros por provincia.

## Carga diferida de conteos provinciales

- Antes de que se descargue `ProvinceAggregateMap`, `ProvinceMapStatus` mantiene
  el panel móvil como diálogo modal con cierre y el panel de escritorio como
  estado dentro de la columna del mapa.
- `ProvinceAggregateMap` retira su indicador al instalar el estilo y las capas
  interactivas; las teselas pueden continuar cargando a continuación.
- El mapa provincial redimensiona el lienzo al abrir y encuadra Cuba; el acceso
  desde el catálogo y el retorno móvil usan controles flotantes inferiores.
- Los controles flotantes y el diálogo móvil se montan sobre `document.body` para
  permanecer anclados al viewport incluso dentro de layouts con transformaciones.
- El fallback de mapas de propiedades conserva el estado genérico de carga.

## Verificación

El E2E `e2e/catalog-map-mobile.spec.ts` comprueba el diálogo móvil, la carga
temprana del mapa y capas base recibidas, cierre, restauración del scroll y
ausencia de desbordamiento. La suite no escribe datos de catálogo.
