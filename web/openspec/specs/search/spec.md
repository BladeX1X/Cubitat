# Búsqueda de Inmuebles (Search)

## Purpose
Permite buscar y filtrar propiedades inmuebles en Cuba de forma ágil y responsiva.

## Requirements

### Requirement: Búsqueda Orientada a Lugares con Autocompletado
El sistema MUST buscar propiedades exclusivamente por ubicaciones geográficas y ofrecer sugerencias a medida que el usuario escribe.

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
- THEN el sistema MUST navegar a `/resultados?lugar=Playa&operacion=compraventa&tipo=casa`
- AND al recargar la página o compartir el enlace, el sistema MUST leer los parámetros de la URL para inicializar el estado del buscador y renderizar los resultados correspondientes

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
