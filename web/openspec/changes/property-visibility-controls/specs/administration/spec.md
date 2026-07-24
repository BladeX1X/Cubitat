# Delta: Visibilidad controlada por moderación

### Requirement: Ocultamiento administrativo reversible
El sistema MUST separar el ocultamiento administrativo de la retirada voluntaria del propietario.

#### Scenario: Admin oculta publicación pública
- GIVEN una propiedad tiene estado `published`
- WHEN el administrador confirma un motivo de ocultamiento
- THEN el sistema MUST cambiarla a `paused`
- AND MUST retirarla de la experiencia pública
- AND MUST registrar la transición en la bitácora

#### Scenario: Admin restaura ocultamiento administrativo
- GIVEN una propiedad tiene estado `paused`
- WHEN el administrador pulsa “Volver a publicar”
- THEN el sistema MUST cambiarla a `published`
- AND MUST registrar la transición en la bitácora

#### Scenario: Admin inspecciona ocultamiento del propietario
- GIVEN una propiedad tiene estado `owner_hidden`
- WHEN el administrador la consulta en moderación
- THEN MUST verla bajo un filtro y etiqueta distintos de `paused`
- AND MUST NOT ofrecer una acción para publicarla
