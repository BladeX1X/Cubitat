# Módulo de Mapas (Maps)

## Purpose
Visualizar la ubicación de los inmuebles e integrar la búsqueda geográfica interactiva mediante un mapa a pantalla completa.

## Requirements

### Requirement: Ubicación Aproximada en Detalle de Propiedad
El sistema MUST mostrar un mapa estático o interactivo reducido en la ficha de detalle de la propiedad para ubicar el inmueble sin revelar la dirección exacta por motivos de privacidad.

#### Scenario: Visualización del mapa de detalle
- GIVEN un usuario en la página de detalle de una propiedad
- WHEN visualiza la sección de ubicación
- THEN el sistema MUST inicializar un contenedor de MapLibre GL centrado en las coordenadas aproximadas del inmueble
- AND el sistema MUST dibujar un círculo de radio aproximado o un marcador genérico sin indicar la dirección exacta

### Requirement: Mapa de Búsqueda Grande con Filtros Integrados
El sistema MUST proveer una vista de pantalla dividida o pantalla completa con un mapa interactivo para buscar y filtrar inmuebles directamente desde la interfaz geográfica.

#### Scenario: Exploración de inmuebles en el mapa grande
- GIVEN un usuario en la pestaña o página de mapa grande
- WHEN se cargan las propiedades
- THEN el sistema MUST mostrar pines con el precio abreviado de las propiedades en sus respectivas coordenadas geográficas
- AND al hacer clic en un pin, se desplegará una tarjeta de previsualización flotante con información clave del inmueble
- AND al mover o hacer zoom en el mapa, el sistema MUST filtrar o recargar las propiedades para mostrar solo aquellas dentro del área visible (bounding box) si el modo de búsqueda geográfica está activo
- AND los filtros de búsqueda generales (tipo, operación, precio) MUST actualizar de inmediato los pines del mapa
