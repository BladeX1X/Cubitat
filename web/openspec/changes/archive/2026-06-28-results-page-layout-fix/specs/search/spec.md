# Delta for Search: Maquetación Side-by-Side de Resultados

## ADDED Requirements

### Requirement: Layout de Resultados
El sistema MUST mostrar la lista de resultados y el detalle de propiedad lado a lado en ordenadores.

#### Scenario: Visualización lado a lado en ordenadores
- GIVEN un usuario viendo la página de resultados `/resultados`
- WHEN el ancho de la pantalla sea superior a 1020px
- THEN el sistema MUST colocar el listado de resultados (con barra de herramientas y banner) en la columna izquierda
- AND el sistema MUST colocar la sección de detalle en la columna derecha
