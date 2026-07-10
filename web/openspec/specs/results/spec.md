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

