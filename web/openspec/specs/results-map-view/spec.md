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

### Requirement: Acciones flotantes
El modulo MUST mostrar acciones flotantes utiles y limitadas.

#### Scenario: Bottom bar de mapa
- GIVEN el mapa esta activo
- WHEN se renderiza el bottom bar
- THEN MUST mostrar `Mostrar lista`
- AND MUST mostrar `Crear alerta` solo si se provee callback
- AND MUST NOT mostrar GPS en la fase actual

### Requirement: Chips de contexto
El modulo MUST mostrar filtros activos como contexto visual sobre el mapa.

#### Scenario: Filtros activos
- GIVEN hay filtros activos
- WHEN el mapa se renderiza
- THEN el modulo MUST mostrar chips con ubicacion, operacion, tipo o precio
- AND MUST mostrar conteo de propiedades filtradas
