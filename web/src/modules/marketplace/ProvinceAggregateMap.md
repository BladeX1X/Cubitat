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
