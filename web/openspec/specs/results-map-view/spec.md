# Modulo Results Map View

## Purpose
Encapsula la vista de mapa movil dentro de resultados para que lista, filtros y navegacion no dependan directamente de la UI del mapa.

## Requirements

### Requirement: Aislamiento del modulo
El modulo MUST contener el estado y UI especificos de la vista de mapa movil.

#### Scenario: ResultsPage delega mapa
- GIVEN la pagina de resultados renderiza lista y mapa movil
- WHEN el usuario alterna a `Mapa`
- THEN `ResultsPage` MUST delegar toggle, mapa, preview y acciones flotantes al modulo `results-map-view`
- AND la lista de resultados MUST permanecer fuera del modulo

#### Scenario: Falla local del modulo
- GIVEN una regresion afecta la preview o controles del mapa
- WHEN el usuario vuelve a `Lista`
- THEN el catalogo SHOULD poder seguir renderizando sin depender del estado interno del mapa

### Requirement: Alternancia lista/mapa
El modulo MUST exponer un control simple para alternar entre lista y mapa en viewport movil.

#### Scenario: Abrir mapa
- GIVEN el usuario esta en resultados
- WHEN pulsa `Mapa`
- THEN el modulo MUST solicitar cambio a modo mapa
- AND MUST renderizar `PropertyMap` con las propiedades filtradas

#### Scenario: Volver a lista
- GIVEN el usuario esta en modo mapa
- WHEN pulsa `Mostrar lista` o `Lista`
- THEN el modulo MUST solicitar cambio a modo lista
- AND MUST limpiar seleccion local de pin

#### Scenario: Volver desde el detalle conserva el mapa
- GIVEN el usuario cambia los resultados a modo `Mapa` y abre una propiedad desde la preview
- WHEN usa `Atrás` para volver a la misma entrada de resultados
- THEN `ResultsPage` MUST restaurar el modo `Mapa` desde `window.history.state`
- AND MUST persistir únicamente valores válidos `list` o `map`
- AND MUST preservar cualquier otro estado existente en la entrada del historial

### Requirement: Preview de propiedad en mapa
El modulo MUST mostrar una preview inferior al seleccionar un pin sin navegar automaticamente.

#### Scenario: Seleccionar pin
- GIVEN el mapa muestra pines de propiedades
- WHEN el usuario pulsa un pin
- THEN el modulo MUST guardar el id seleccionado localmente
- AND MUST mostrar preview con imagen, badges, precio, titulo y atributos principales

#### Scenario: Ver detalle desde preview
- GIVEN una preview esta visible
- WHEN el usuario pulsa `Ver detalle`
- THEN el sistema MUST navegar al detalle usando el callback externo
- AND MUST preservar la responsabilidad de navegacion fuera del modulo

#### Scenario: Cluster con varias propiedades
- GIVEN un cluster contiene varias propiedades en un orden distinto al listado general
- WHEN el usuario pulsa el cluster
- THEN el carrusel MUST conservar el orden de ids entregado por el mapa
- AND la propiedad activa MUST aparecer como primera tarjeta sin desplazamiento inicial

### Requirement: Acciones flotantes
El modulo MUST mostrar acciones flotantes utiles y limitadas.

#### Scenario: Bottom bar de mapa
- GIVEN el mapa esta activo
- WHEN se renderiza el bottom bar
- THEN MUST mostrar `Mostrar lista`
- AND MUST mostrar `Crear alerta` solo si se provee callback
- AND MUST NOT mostrar GPS en la fase actual

### Requirement: Panel desktop de mapa
El modulo MUST exponer un panel aislado para vista dividida desktop (lista + mapa).

#### Scenario: Abrir mapa en desktop
- GIVEN el usuario esta en un viewport >= 1021px
- WHEN pulsa `Mostrar mapa`
- THEN el modulo MUST renderizar `ResultsDesktopMapPanel` al lado de la lista
- AND la pagina MUST convertir el shell a grid de 2 columnas (`lista | mapa`)
- AND el mapa MUST ocupar la columna derecha como sticky panel

#### Scenario: Pin click en desktop (no navega)
- GIVEN el panel desktop de mapa muestra pines
- WHEN el usuario pulsa un pin
- THEN el modulo MUST notificar el id via `onSelectProperty`
- AND la pagina MUST resaltar la card en la lista y hacer scroll hacia ella
- AND NO MUST navegar al detalle de la propiedad

#### Scenario: Sin pin seleccionado
- GIVEN el mapa desktop muestra propiedades
- WHEN ningun pin esta seleccionado
- THEN la lista MUST mostrar todas las propiedades dentro del area visible del mapa
- AND si `onViewportChange` aun no se ha disparado (carga inicial), MUST mostrar todas las propiedades

#### Scenario: Cluster seleccionado permanece estable al cambiar el zoom
- GIVEN la lista muestra las propiedades de un cluster seleccionado
- WHEN el usuario acerca, aleja o redimensiona el mapa
- THEN la lista MUST conservar exactamente las propiedades seleccionadas
- AND cada cluster visible formado por propiedades seleccionadas MUST conservar el resaltado de selección
- AND el conteo total de los clusters seleccionados MUST representar el mismo grupo (por ejemplo, 4 + 5 = 9)
- AND los límites del viewport MUST NOT sustituir ese grupo por otros resultados visibles
- AND si el zoom desplaza fuera del mapa cualquier anuncio del grupo, el mapa MUST reajustar el centro para mantener el grupo seleccionado dentro del encuadre
- AND en móvil el área de encuadre MUST excluir el espacio tapado por el buscador, los controles y el carrusel
- AND mover el mapa sin una selección activa MUST seguir filtrando por el área visible

#### Scenario: Viewport change filtra lista
- GIVEN el usuario desplaza o acerca el mapa desktop
- WHEN el viewport cambia
- THEN el mapa MUST calcular que ids estan dentro de los nuevos bounds
- AND MUST notificar via `onViewportChange`
- AND la pagina MUST filtrar la lista a solo esas propiedades
- AND MUST reiniciar la pagina a 1

#### Scenario: El panel del mapa cambia de tamaño
- GIVEN el mapa desktop ya calculo las propiedades visibles
- WHEN el contenedor del mapa cambia de tamaño por el layout o la ventana
- THEN el mapa MUST recalcular su tamaño y sus bounds
- AND MUST notificar los ids visibles actualizados via `onViewportChange`
- AND la lista MUST coincidir con las propiedades del area visible actual

#### Scenario: Aplicar filtros conserva la cámara
- GIVEN el usuario ya movio o acerco el mapa
- WHEN aplica o quita un filtro de resultados
- THEN el mapa MUST actualizar los anuncios y grupos
- AND MUST conservar el centro y nivel de zoom elegidos por el usuario
- AND MUST NOT encuadrar automaticamente los nuevos resultados

#### Scenario: Cluster click en desktop
- GIVEN el mapa desktop muestra clusters
- WHEN el usuario pulsa un cluster
- THEN el modulo MUST notificar los ids del cluster via `onSelectCluster`
- AND la pagina MUST mostrar solo esas propiedades en la lista
- AND MUST seleccionar la primera del grupo

### Requirement: Chips de contexto
El modulo MUST mostrar filtros activos como contexto visual sobre el mapa.

#### Scenario: Filtros activos
- GIVEN hay filtros activos
- WHEN el mapa se renderiza
- THEN el modulo MUST mostrar chips con ubicacion, operacion, tipo o precio
- AND MUST mostrar conteo de propiedades filtradas
