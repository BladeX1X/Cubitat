# Delta for Search: Eliminar Sección de Publicación

## MODIFIED Requirements

### Requirement: Filtrado Básico de Búsqueda
El sistema MUST omitir la sección de publicación ("Publica una propiedad en minutos") de la página principal.

#### Scenario: Landing page más simple sin sección de publicación
- GIVEN un usuario visitando la página principal
- THEN el sistema MUST renderizar las secciones de ubicaciones populares, servicios y productos
- AND el sistema MUST NOT renderizar la sección de publicación o su formulario
