# Delta for Search: Eliminar Sección de Blog

## MODIFIED Requirements

### Requirement: Filtrado Básico de Búsqueda
El sistema MUST omitir la sección editorial (Blog) al final de la página principal.

#### Scenario: Simplificación de la página principal sin blog
- GIVEN un usuario visitando la página principal
- THEN el sistema MUST renderizar las secciones de ubicaciones populares, servicios, productos y publicación
- AND el sistema MUST NOT renderizar ninguna sección de artículos o blog
