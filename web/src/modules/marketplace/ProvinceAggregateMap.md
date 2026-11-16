# ProvinceAggregateMap

## Responsabilidad

Presenta conteos aproximados por provincia para los catálogos de Servicios y
Materiales. No coloca ubicaciones exactas ni reemplaza los filtros, la lista o
la paginación del catálogo.

## Comportamiento adaptable

- En móvil se abre como diálogo a pantalla completa, bloquea el desplazamiento
  del documento y permite cerrar con el botón o con Escape.
- En escritorio, al abrirlo desde Servicios o Materiales queda en la columna
  derecha a pantalla alta, junto al catálogo y con el mismo patrón de mapa
  visible que Comprar/Rentar; filtros y resultados permanecen en la columna
  izquierda.
- Carga MapLibre solo cuando el usuario abre el mapa; el mapa y su fallback de
  carga/error usan el mismo contenedor para no quedar ocultos bajo el layout.
- En móvil, el fallback diferido ya es un diálogo con cierre accesible. El
  indicador del mapa se retira cuando el estilo y las capas están listos; no
  espera a que todas las teselas y fuentes terminen de descargar.
- Si la primera descarga del estilo falla, el mensaje conserva el catálogo y
  ofrece «Reintentar mapa» para recrear el mapa sin cerrar el panel.
- Pulsar el número o el círculo de un cluster lo acerca para separar las
  provincias; pulsar el número o el círculo de una provincia aplica esa
  provincia como filtro del catálogo. “Ver toda
  Cuba” retira la provincia sin perder los demás filtros.
- Los conteos respetan los filtros de texto, categoría y disponibilidad o
  municipio, según el catálogo; se consultan sin aplicar la provincia activa.

## Verificación

La existencia del código no confirma que la experiencia se haya desplegado.
Validar apertura/cierre en móvil y escritorio, estados de carga/error, selección
provincial y filtros en el Worker DEV; registrar por separado la versión
publicada y la evidencia observada.

Cobertura local: `provinceMapInteractions.test.ts` valida el resultado del clic
en marcadores/etiquetas; las pruebas de `ServiceDirectoryPage` y
`MaterialsMarketplacePage` verifican que ese resultado aplica el filtro, vuelve
a la página 1, conserva abierto el mapa y no navega el documento. La prueba de
Servicios también confirma que cambiar provincia limpia el municipio.

Verificación DEV — 2026-11-13: en Chromium headless de escritorio, un clic real
en el marcador de Pinar del Río actualizó el selector y filtró Servicios (15 →
7) y Materiales (15 → 2), sin navegación de documento. El catálogo siguió en la
misma URL. Fue una interacción pública de solo lectura; no valida el cierre
móvil, y ninguna escritura remota.

Verificación DEV — 2026-11-14: el primer E2E móvil comprobó apertura/cierre,
worker y teselas con Chromium y API del catálogo en solo lectura. Una
revalidación fría posterior (2026-11-14) encontró que el estado de carga podía
permanecer visible mientras MapLibre esperaba todas las fuentes/teselas, y que
el fallback diferido aún no era un diálogo accesible. Corregido localmente:
véase la entrada de avance del 2026-11-14; falta desplegar y repetir el E2E
frío en DEV antes de considerar el comportamiento móvil verificado.
