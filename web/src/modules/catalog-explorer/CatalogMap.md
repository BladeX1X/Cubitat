# CatalogMap

## Responsabilidad

Punto único de entrada a los mapas de los catálogos. Selecciona el modo de
propiedades o anuncios geográficos y mantiene diferido el código pesado de mapas.

Ambos modos interactivos reutilizan `useMapLibreMap` y
`MapLibreStatusOverlay`, también usados por Comprar. Esto estandariza el estilo,
los controles, el redimensionado y los estados de carga/error. Servicios y
Materiales reutilizan clusters, selección por punto o grupo y filtrado por
viewport igual que Comprar.

## Catálogos geográficos

- Antes de que se descargue `ProvinceAggregateMap`, `ProvinceMapStatus` mantiene
  el panel móvil como diálogo modal con cierre y el panel de escritorio como
  estado dentro de la columna del mapa.
- Al abrir el mapa se recorren las páginas filtradas completas y se firman solo
  las imágenes de portada.
- La lista se filtra con los ids dentro del viewport; una selección de punto o
  cluster conserva esos anuncios visibles hasta cerrar o cambiar filtros.
- Los ids del viewport nunca se pasan como selección visual: al abrir el mapa
  ningún punto aparece seleccionado hasta que el visitante elige explícitamente
  un punto o cluster. La selección filtra la lista, sin añadir contorno de color
  a las tarjetas.
- El mapa redimensiona el lienzo al abrir y encuadra los puntos; el acceso
  desde el catálogo y el retorno móvil usan controles flotantes inferiores.
- Los controles flotantes y el diálogo móvil se montan sobre `document.body` para
  permanecer anclados al viewport incluso dentro de layouts con transformaciones.
  El diálogo móvil usa `position: fixed`; no debe heredar una posición relativa
  que lo deje después de las tarjetas en el flujo del documento.
- Los mapas de catálogo solo consumen coordenadas públicas aproximadas; nunca
  consultan las coordenadas privadas.

## Verificación

El E2E `e2e/catalog-map-mobile.spec.ts` comprueba el diálogo móvil, la carga
temprana del mapa y capas base recibidas, cierre, restauración del scroll y
ausencia de desbordamiento. La suite no escribe datos de catálogo.
