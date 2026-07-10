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

#### Scenario: Seleccionar cluster y pin
- GIVEN el mapa muestra clusters
- WHEN el usuario toca un cluster o su numero
- THEN el sistema MUST acercar el mapa a ese grupo
- AND cuando el usuario toca un pin o precio cercano MUST mostrar una preview inferior
- AND tocar un pin MUST permanecer en `/resultados`
- AND solo una accion explicita como `Ver detalle` MUST navegar al detalle

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

### Requirement: Estado vacio y SEO de resultados
El sistema MUST presentar estados vacios utiles para rutas SEO y busquedas sin coincidencias.

#### Scenario: Ruta SEO sin anuncios
- GIVEN una ruta SEO valida no tiene propiedades publicadas
- WHEN el usuario abre la pagina
- THEN el sistema MUST mostrar titulo e introduccion adecuados
- AND SHOULD ofrecer busquedas relacionadas
- AND MUST permitir limpiar o ampliar filtros

### Requirement: Paginacion consistente
El sistema MUST mantener paginacion clara y accesible cuando hay multiples paginas.

#### Scenario: Cambiar pagina
- GIVEN existen mas resultados que el tamano de pagina
- WHEN el usuario cambia de pagina
- THEN el sistema MUST renderizar la pagina solicitada
- AND MUST desplazar el viewport al inicio de resultados
- AND MUST deshabilitar anterior o siguiente cuando no aplican
