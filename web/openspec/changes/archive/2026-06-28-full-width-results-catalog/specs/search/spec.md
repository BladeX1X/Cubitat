# Delta for Search: Catálogo de Ancho Completo en Resultados

## MODIFIED Requirements

### Requirement: Layout de Resultados
El sistema MUST mostrar la lista de resultados en una cuadrícula a ancho completo en ordenadores.

#### Scenario: Visualización del catálogo de propiedades a ancho completo
- GIVEN un usuario en la página de resultados `/resultados`
- WHEN no hay ninguna propiedad seleccionada
- THEN el sistema MUST renderizar una cuadrícula de propiedades de 4 columnas en escritorios
- AND el sistema MUST mostrar la barra de filtros y el banner promocional a ancho completo en la parte superior
- AND el sistema MUST NOT mostrar el panel lateral de detalle de propiedades
