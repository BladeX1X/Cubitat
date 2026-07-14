# Delta: Visibilidad controlada por el propietario

### Requirement: Ocultamiento reversible por propietario
El sistema MUST permitir que el propietario retire y restaure su publicación sin permitir que otro actor controle esa decisión.

#### Scenario: Propietario oculta su publicación
- GIVEN una propiedad propia tiene estado `published`
- WHEN el propietario confirma “Ocultar”
- THEN el sistema MUST cambiarla a `owner_hidden`
- AND MUST retirarla inmediatamente de resultados y detalle públicos
- AND MUST conservarla en “Mis publicaciones” sin eliminar sus datos

#### Scenario: Propietario vuelve a publicar
- GIVEN una propiedad propia tiene estado `owner_hidden` y no fue editada
- WHEN el propietario confirma “Volver a publicar”
- THEN el sistema MUST cambiarla a `published`
- AND MUST volver a mostrarla públicamente

#### Scenario: Propietario edita antes de volver a publicar
- GIVEN una propiedad propia tiene estado `owner_hidden`
- WHEN el propietario modifica contenido y guarda la publicación
- THEN el sistema MUST cambiarla a `pending_review`
- AND MUST iniciar nuevamente la moderación IA
- AND MUST mantenerla fuera de resultados hasta completar la revisión

#### Scenario: Otro actor intenta restaurar ocultamiento del propietario
- GIVEN una propiedad tiene estado `owner_hidden`
- WHEN un administrador, otro usuario o automatización intenta cambiar su estado
- THEN la base de datos MUST rechazar la transición
- AND la propiedad MUST permanecer no pública
