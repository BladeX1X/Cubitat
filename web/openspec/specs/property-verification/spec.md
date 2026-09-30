# Verificación documental de propiedad

Este módulo de Fase 2 permite solicitar y revisar evidencia documental privada
de una propiedad sin convertir la revisión en una certificación legal.

## Alcance

- Las evidencias viven en un bucket privado y la base de datos solo conserva la
  ruta interna, nunca una URL pública.
- El propietario solo puede solicitar la verificación de una propiedad propia.
- Un administrador con sesión AAL2 puede revisar y cambiar el estado.
- El indicador de confianza es interno y explicable; no promete titularidad ni
  sustituye una validación legal.

### Requirement: Crear una solicitud privada

El sistema MUST permitir una única solicitud pendiente por propiedad propia y
MUST comprobar que el objeto exista en el bucket privado antes de registrarla.

#### Scenario: Propietario envía evidencia

- GIVEN un usuario autenticado es propietario de una propiedad
- WHEN envía un tipo de documento permitido y una ruta dentro de su carpeta
- THEN el sistema MUST crear una solicitud `pending`
- AND MUST rechazar rutas fuera de la carpeta del propietario, objetos ausentes
  y una segunda solicitud pendiente.

### Requirement: Revisar con AAL2

El sistema MUST permitir aprobar o rechazar una solicitud únicamente a un
administrador con AAL2 y MUST exigir un motivo no vacío para rechazarla.

#### Scenario: Revisión administrativa

- GIVEN existe una solicitud `pending`
- WHEN un administrador AAL2 la aprueba o rechaza
- THEN el sistema MUST guardar el estado, actor, fecha y motivo de rechazo
- AND una sesión sin AAL2 MUST recibir un error de permiso.

### Requirement: Indicador interno explicable

El sistema MUST calcular un indicador de 0 a 100 únicamente para usuarios
autenticados con factores visibles: identidad del propietario verificada,
documento de propiedad aprobado, publicación activa y datos de contacto.
El indicador MUST quedar etiquetado como interno y no implicar una garantía
legal.
