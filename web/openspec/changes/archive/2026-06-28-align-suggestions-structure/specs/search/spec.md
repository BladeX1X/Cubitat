# Delta for Search: Estructura de Sugerencias Categorizada

## MODIFIED Requirements

### Requirement: Filtrado Básico de Búsqueda
El sistema MUST permitir a los usuarios ver sugerencias organizadas en secciones descriptivas y permitir el uso de su ubicación física.

#### Scenario: Categorización de sugerencias
- GIVEN un usuario buscando ubicaciones
- THEN el sistema MUST dividir el panel en las secciones "TAMBIÉN PUEDES BUSCAR CON" y "ZONAS MÁS BUSCADAS"
- AND la primera sección MUST contener una opción para usar la geolocalización del dispositivo
