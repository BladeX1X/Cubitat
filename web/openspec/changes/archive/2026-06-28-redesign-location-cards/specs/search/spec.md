# Delta for Search: Rediseño de Tarjetas de Provincia

## MODIFIED Requirements

### Requirement: Tarjetas de Ubicación Populares
El sistema DEBE (MUST) mostrar un listado de ubicaciones populares en la página principal.

#### Scenario: Visualización de provincias
- GIVEN un usuario en la página principal
- WHEN hace scroll hacia la sección "Encuentra inmuebles por provincia"
- THEN el sistema DEBE mostrar una cuadrícula de tarjetas visuales con una imagen representativa y el nombre de la provincia
- AND cada tarjeta DEBE contar con un enlace para "Ver inmuebles"
- AND al hacer clic el sistema DEBE redirigir al usuario a `/resultados`
(Previously: Se mostraban enlaces simples con el nombre y la cantidad de propiedades en texto plano sin imágenes).
