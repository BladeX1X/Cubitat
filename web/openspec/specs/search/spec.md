# Búsqueda de Inmuebles (Search)

## Purpose
Permite buscar y filtrar propiedades inmuebles en Cuba de forma ágil y responsiva.

## Requirements

### Requirement: Taxonomia compartida con publicacion
El sistema MUST usar las mismas operaciones y tipos de inmueble al buscar y publicar.

#### Scenario: Mostrar todas las opciones disponibles
- GIVEN un usuario abre Buscar o Publicar
- WHEN revisa operaciones y tipos de inmueble
- THEN ambos flujos MUST usar `venta`, `alquiler` y `permuta`
- AND ambos flujos MUST usar `casa`, `apartamento` y `terreno`
- AND Buscar MUST mostrar `Todos los inmuebles` cuando no existe filtro de tipo
- AND MUST permitir volver al estado sin filtro desde el selector de tipo

### Requirement: Búsqueda Orientada a Lugares con Autocompletado
El sistema MUST buscar propiedades exclusivamente por ubicaciones geográficas y ofrecer sugerencias a medida que el usuario escribe.

#### Scenario: Seleccionar una provincia
- GIVEN un usuario abre el selector de provincias de la portada
- WHEN revisa las opciones disponibles
- THEN MUST mostrar las 15 provincias y el municipio especial Isla de la Juventud
- AND MUST ordenarlas geograficamente de occidente a oriente
- AND el menu MUST permitir desplazarse por todas las opciones sin quedar recortado por el hero o el viewport

#### Scenario: Autocompletado de lugares al escribir
- GIVEN un usuario enfocado en el campo de búsqueda de la barra de navegación o portada
- WHEN escribe al menos 2 caracteres (ej: "Pl")
- THEN el sistema MUST desplegar una lista de sugerencias con provincias, municipios o localidades coincidentes (ej: "Playa, La Habana", "Plaza de la Revolución, La Habana")
- AND al hacer clic en una sugerencia, se autocompleta el campo y se ejecuta la búsqueda

### Requirement: Rutas Reales y Parámetros de URL
El sistema MUST sincronizar los criterios de búsqueda activos con la URL para permitir compartir enlaces directamente.

#### Scenario: Sincronización de búsqueda a URL
- GIVEN un usuario buscando propiedades en el municipio "Playa"
- WHEN selecciona los filtros de "Compraventa" e "Inmueble: Casa"
- THEN el sistema MUST navegar a `/resultados?q=Playa&operacion=venta&tipo=casa`
- AND al recargar la página o compartir el enlace, el sistema MUST leer los parámetros de la URL para inicializar el estado del buscador y renderizar los resultados correspondientes

#### Scenario: Ruta SEO de resultados
- GIVEN una combinacion de provincia, municipio, tipo u operacion tiene ruta SEO soportada
- WHEN el usuario ejecuta la busqueda desde home o navegacion
- THEN el sistema MAY navegar a una ruta legible en vez de query string
- AND MUST parsear esa ruta al cargar directo
- AND MUST mantener consistencia entre filtros visibles y URL

### Requirement: Barra de Filtros Adhesiva (Sticky Toolbar)
El sistema MUST permitir la fijación de la barra de filtros en la parte superior al hacer scroll en resultados, desplazando la cabecera principal para optimizar espacio.

#### Scenario: Barra de filtros se vuelve fija
- GIVEN un usuario desplazándose hacia abajo en `/resultados`
- WHEN la cabecera principal (`.site-header`) se desplaza fuera de pantalla
- THEN el sistema MUST anclar la barra de filtros `.results-toolbar-full` en `top: 0`
- AND el sistema MUST ocultar/desplazar la cabecera del sitio para evitar solapamientos visuales
### Requirement: Ordenamiento de resultados
El sistema MUST permitir ordenar las propiedades desde la pagina de resultados sin abandonar la busqueda actual.

#### Scenario: Ordenar propiedades desde el catalogo
- GIVEN un usuario viendo la pagina `/resultados`
- WHEN abre el control `Ordenar`
- THEN el sistema MUST mostrar opciones de ordenamiento claras
- AND el usuario MUST poder ordenar por relevancia, menor precio, mayor precio y mayor superficie
- AND al seleccionar una opcion, el catalogo MUST actualizar el orden de las tarjetas
- AND la paginacion MUST volver a la primera pagina para evitar resultados inconsistentes

### Requirement: Filtros avanzados consistentes
El sistema MUST aplicar filtros de operacion, tipo, precio, dormitorios, banos y parqueo de forma consistente en lista y mapa.

#### Scenario: Aplicar filtros desde escritorio
- GIVEN un usuario abre la barra de filtros en resultados
- WHEN modifica operacion, tipo, precio o filtros avanzados
- THEN el sistema MUST recalcular propiedades visibles
- AND MUST actualizar el conteo de resultados
- AND MUST conservar el estado en la URL cuando aplique

#### Scenario: Aplicar filtros desde movil
- GIVEN un usuario abre el panel movil de filtros
- WHEN ajusta filtros y pulsa ver resultados
- THEN el sistema MUST cerrar el panel
- AND MUST aplicar los filtros a lista y mapa movil
- AND MUST mostrar estado vacio si no hay coincidencias

### Requirement: Alertas de busqueda
El sistema MUST permitir guardar una busqueda filtrada como alerta para usuarios autenticados.

#### Scenario: Crear alerta desde filtros
- GIVEN un usuario autenticado tiene filtros activos
- WHEN pulsa `Crear alerta`
- THEN el sistema MUST guardar los filtros asociados al usuario
- AND MUST mostrar confirmacion sin perder la busqueda actual
- AND la confirmacion MUST permitir cerrar o consultar la alerta en la cuenta
- AND MUST NOT solicitar un correo mientras la entrega de alertas por correo no este habilitada
- AND MUST NOT exponer nombres de entornos internos al usuario
- AND la confirmacion MUST explicar solo capacidades disponibles para el usuario
- AND MUST NOT solicitar un correo adicional mientras la entrega por correo no este habilitada
- AND MUST NOT mostrar nombres de entornos o detalles internos de despliegue

#### Scenario: Crear alerta anonima pendiente
- GIVEN un usuario anonimo pulsa `Crear alerta`
- WHEN el sistema requiere autenticacion
- THEN MUST guardar temporalmente los filtros actuales
- AND MUST abrir login
- AND despues de autenticar MUST intentar crear la alerta pendiente

#### Scenario: Notificar una propiedad coincidente
- GIVEN una propiedad de otro anunciante pasa por primera vez a `published`
- WHEN coincide con todos los filtros validos de una alerta activa
- THEN el sistema MUST crear una sola notificacion interna para el propietario de la alerta
- AND MUST actualizar `last_sent_at` solo si inserto una notificacion nueva
- AND un filtro heredado invalido MUST considerarse no coincidente sin abortar la publicacion
- AND los campos nulos de la propiedad MUST considerarse no coincidentes cuando la alerta exige ese campo

### Requirement: Nombres accesibles coherentes
Los controles del buscador MUST exponer nombres accesibles que incluyan su texto visible.

#### Scenario: Leer controles con tecnologia asistiva
- GIVEN un usuario abre el buscador principal
- WHEN una tecnologia asistiva enumera provincia, municipio y accion de busqueda
- THEN cada control MUST anunciar el mismo valor o instruccion que muestra visualmente
- AND el boton de envio MUST anunciar `Buscar inmuebles`
