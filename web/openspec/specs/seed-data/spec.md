# Datos sinteticos

## Purpose
Mantener un inventario de demostracion reproducible sin sobrescribir datos ya
existentes al repetir herramientas de desarrollo.

## Requirements

### Requirement: Seed sintetico seguro
El generador de inventario sintetico MUST evitar cambios accidentales sobre
filas que ya existan.

#### Scenario: Repetir el seed
- GIVEN la base de datos ya contiene un identificador sintetico
- WHEN se vuelve a ejecutar el SQL generado
- THEN la sentencia MUST usar `ON CONFLICT (id) DO NOTHING`
- AND MUST NOT reemplazar descripcion, imagenes, coordenadas ni contacto existentes
