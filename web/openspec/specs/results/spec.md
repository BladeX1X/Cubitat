# Proceso de Resultados

## Purpose
Define la experiencia de exploracion de propiedades en lista y mapa.

## Requirements

### Requirement: Catalogo paginado
El sistema MUST mostrar resultados de propiedades filtradas en una lista clara y paginada.

#### Scenario: Ver resultados
- GIVEN un usuario ejecuta una busqueda
- WHEN llega a `/resultados`
- THEN el sistema MUST mostrar total de propiedades, resumen, ordenamiento y tarjetas
- AND MUST paginar resultados cuando excedan el tamano de pagina
- AND MUST mostrar estado vacio cuando no haya coincidencias

#### Scenario: Tarjeta interactiva en resultados
- GIVEN una propiedad aparece en la lista
- WHEN el usuario pulsa el area principal de la tarjeta
- THEN el sistema MUST navegar al detalle de esa propiedad
- AND los botones de carrusel, favorito y contacto MUST manejar su accion sin abrir detalle accidentalmente

#### Scenario: Estado de carga de resultados
- GIVEN el sistema esta cargando propiedades
- WHEN la pantalla de resultados se renderiza
- THEN MUST mostrar skeletons o estado de carga estable
- AND MUST evitar layout shift excesivo al llegar los datos
- AND el contenedor principal MUST reservar al menos el alto visible bajo la cabecera para mantener el footer fuera del viewport durante transiciones de carga
- AND los controles tactiles de busqueda, limpieza y carrusel MUST conservar un area minima de 44x44 px en movil
- AND una propiedad sin portada MUST usar un fallback local inmediato en vez de iniciar una descarga remota generica

### Requirement: Ordenamiento
El sistema MUST permitir ordenar resultados sin perder filtros activos.

#### Scenario: Cambiar orden
- GIVEN un usuario esta en resultados
- WHEN selecciona relevancia, menor precio, mayor precio o mayor superficie
- THEN el sistema MUST reordenar las propiedades visibles
- AND MUST volver a la primera pagina
- AND MUST mantener filtros y URL de busqueda

### Requirement: Vista de mapa movil
El sistema MUST ofrecer una vista de mapa en movil sin abandonar la pagina de resultados.

#### Scenario: Alternar lista y mapa
- GIVEN un usuario en viewport movil
- WHEN pulsa el control `Mapa`
- THEN el sistema MUST ocultar la lista
- AND MUST mostrar el mapa con clusters, pines y acciones flotantes
- AND el usuario MUST poder volver a `Lista`

#### Scenario: Seleccionar cluster y pin (movil)
- GIVEN el mapa movil muestra clusters
- WHEN el usuario toca un cluster o su numero
- THEN el sistema MUST acercar el mapa a ese grupo
- AND cuando el usuario toca un pin MUST mostrar carrusel de preview inferior
- AND tocar un pin MUST permanecer en `/resultados`
- AND solo tocar una card del carrusel MUST navegar al detalle

#### Scenario: Seleccionar cluster y pin (desktop)
- GIVEN el panel desktop de mapa muestra clusters y pines
- WHEN el usuario pulsa un cluster
- THEN el sistema MUST mostrar solo las propiedades del cluster en la lista
- WHEN el usuario pulsa un pin
- THEN el sistema MUST resaltar esa card en la lista y hacer scroll
- AND MUST NO navegar al detalle
- AND si no hay pin seleccionado MUST mostrar todas las propiedades del area visible

#### Scenario: Modulo de mapa aislado
- GIVEN la vista de mapa movil esta activa
- WHEN ocurre un error dentro del modulo de mapa o preview
- THEN el resto de resultados SHOULD permanecer desacoplado funcionalmente
- AND la lista MUST poder seguir funcionando al volver a `Lista`

#### Scenario: Boton GPS no requerido
- GIVEN el mapa movil muestra acciones flotantes
- WHEN el usuario ve el bottom bar
- THEN el sistema MUST mostrar `Mostrar lista` y acciones de alerta cuando existan
- AND NO MUST mostrar boton GPS si la fase actual no lo requiere

### Requirement: Crear alerta desde resultados
El sistema MUST permitir crear alertas desde la barra de filtros y desde acciones del mapa.

#### Scenario: Crear alerta autenticado
- GIVEN un usuario autenticado con filtros activos
- WHEN pulsa `Crear alerta`
- THEN el sistema MUST guardar los filtros actuales como alerta
- AND MUST mostrar confirmacion visible

#### Scenario: Crear alerta anonimo
- GIVEN un usuario sin sesion con filtros activos
- WHEN pulsa `Crear alerta`
- THEN el sistema MUST guardar temporalmente los filtros
- AND MUST abrir login
- AND despues de iniciar sesion MUST crear la alerta pendiente o mostrar error recuperable

### Requirement: Vista de mapa desktop (split view)
El sistema MUST ofrecer vista dividida mapa + lista filtrada en desktop sin overlay.

#### Scenario: Alternar mapa en desktop
- GIVEN un usuario en viewport >= 1021px
- WHEN pulsa `Mostrar mapa`
- THEN el sistema MUST mostrar mapa en columna derecha (sticky)
- AND MUST mantener la lista en columna izquierda
- AND el boton flotante MUST decir `Ocultar mapa`

#### Scenario: Boton flotante siempre visible
- GIVEN el usuario esta en viewport >= 1021px
- WHEN la lista o el mapa estan activos
- THEN el sistema MUST mostrar acciones flotantes (`Mostrar/Ocultar mapa`, `Crear alerta`)
- AND en modo mapa, el boton MUST decir `Ocultar mapa`

### Requirement: Estado vacio y SEO de resultados
El sistema MUST presentar estados vacios utiles para rutas SEO y busquedas sin coincidencias.

#### Scenario: Ruta SEO sin anuncios
- GIVEN una ruta SEO valida no tiene propiedades publicadas
- WHEN el usuario abre la pagina
- THEN el sistema MUST mostrar titulo e introduccion adecuados
- AND SHOULD ofrecer busquedas relacionadas
- AND MUST permitir limpiar o ampliar filtros
- AND la ilustracion decorativa MUST permanecer fuera del arbol accesible

### Requirement: Paginacion consistente
El sistema MUST mantener paginacion clara y accesible cuando hay multiples paginas.

#### Scenario: Cambiar pagina
- GIVEN existen mas resultados que el tamano de pagina
- WHEN el usuario cambia de pagina
- THEN el sistema MUST renderizar la pagina solicitada
- AND MUST desplazar el viewport al inicio de resultados
- AND MUST deshabilitar anterior o siguiente cuando no aplican

### Requirement: CSS exclusivo de resultados
El sistema SHOULD evitar cargar en la portada los estilos que solo usa la ruta de resultados.

#### Scenario: Abrir la portada
- GIVEN un usuario abre `/`
- WHEN se carga el CSS inicial
- THEN el navegador MUST cargar los estilos globales compartidos
- AND SHOULD NO descargar el chunk CSS exclusivo de resultados

#### Scenario: Abrir resultados
- GIVEN un usuario abre una ruta de resultados
- WHEN se resuelve el modulo lazy de `ResultsPage`
- THEN el navegador MUST cargar su chunk CSS exclusivo
- AND MUST conservar el layout responsive de una columna en movil

#### Scenario: Esperar el modulo lazy sin cambio de layout
- GIVEN un usuario abre directamente una ruta de resultados con red lenta
- WHEN `ResultsPage` y su CSS exclusivo todavia no han terminado de cargar
- THEN el fallback MUST usar estilos criticos incluidos en el CSS inicial
- AND MUST reservar la geometria responsive del catalogo
- AND MUST NO depender de clases definidas solo en `ResultsPage.css`
