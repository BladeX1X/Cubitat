# ProvinceAggregateMap

## Responsabilidad

Presenta conteos aproximados por provincia para los catálogos de Servicios y
Materiales. No coloca ubicaciones exactas ni reemplaza los filtros, la lista o
la paginación del catálogo.

## Comportamiento adaptable

- En móvil se abre como diálogo a pantalla completa, bloquea el desplazamiento
  del documento y ofrece «Ocultar mapa» como botón flotante inferior, además de
  Escape. El diálogo se monta sobre `document.body` para ocupar el viewport y
  evitar desplazamientos laterales heredados del layout.
- En escritorio, al abrirlo desde Servicios o Materiales queda en la columna
  derecha a pantalla alta, junto al catálogo y con el mismo patrón de mapa
  visible que Comprar/Rentar; filtros y resultados permanecen en la columna
  izquierda. El control para abrir/cerrar flota en la parte inferior.
- Al abrirse, redimensiona el lienzo y encuadra Cuba para evitar empezar con la
  vista desplazada hacia Florida aunque los conteos estén en Cuba.
- El control que muestra el mapa queda fijo en la parte inferior de la ventana,
  no dentro del flujo de encabezado del catálogo.
- Carga MapLibre solo cuando el usuario abre el mapa; el mapa y su fallback de
  carga/error usan el mismo contenedor para no quedar ocultos bajo el layout.
- Comparte con Comprar el hook `useMapLibreMap` y el overlay de estado: estilo,
  controles de navegación/atribución, observación de tamaño, limpieza, error y
  reintento. Las capas provinciales y el filtrado del catálogo siguen siendo
  propios de Servicios y Materiales; no se muestran coordenadas individuales.
- En móvil, el fallback diferido ya es un diálogo con cierre accesible. El
  indicador del mapa se retira cuando el estilo y las capas están listos; no
  espera a que todas las teselas y fuentes terminen de descargar.
- Si la primera descarga del estilo falla, el mensaje conserva el catálogo y
  ofrece «Reintentar mapa» para recrear el mapa sin cerrar el panel.
- Pulsar el número o el círculo de un cluster lo acerca para separar las
  provincias; pulsar el número o el círculo de una provincia aplica esa
  provincia como filtro del catálogo. La instrucción móvil diferencia ambas
  acciones y los marcadores provinciales, los controles de zoom y el botón de
  cierre miden al menos 48 px. “Ver toda
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

Verificación manual de producción — 2026-11-17: en Chrome con viewport móvil,
tocar una provincia en Materiales aplicó el filtro y, al cerrar el mapa, mostró
2 anuncios de Pinar del Río; el mismo toque en Servicios mostró 7 profesionales
de esa provincia. El mapa abrió y cargó las marcas en ambos catálogos. Los
círculos con cifras mayores a 1 son grupos: primero acercan el mapa y luego se
debe tocar la provincia para filtrar. Se aclaró el texto de ayuda y se ampliaron
los marcadores y controles de zoom a 48 px en el código local; falta repetir la
revisión tras el despliegue.
