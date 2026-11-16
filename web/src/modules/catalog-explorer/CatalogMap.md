# CatalogMap

## Responsabilidad

Punto único de entrada a los mapas de los catálogos. Selecciona el modo de
propiedades o conteo provincial y mantiene diferido el código pesado de mapas.

## Carga diferida de conteos provinciales

- Antes de que se descargue `ProvinceAggregateMap`, `ProvinceMapStatus` mantiene
  el panel móvil como diálogo modal con cierre y el panel de escritorio como
  estado dentro de la columna del mapa.
- `ProvinceAggregateMap` retira su indicador al instalar el estilo y las capas
  interactivas; las teselas pueden continuar cargando a continuación.
- El fallback de mapas de propiedades conserva el estado genérico de carga.

## Verificación

El E2E `e2e/catalog-map-mobile.spec.ts` comprueba el diálogo móvil, la carga
temprana del mapa y capas base recibidas, cierre, restauración del scroll y
ausencia de desbordamiento. La suite no escribe datos de catálogo.
