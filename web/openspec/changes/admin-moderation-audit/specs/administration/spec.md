# Delta: Auditoría y trazabilidad

### Requirement: Bitácora inmutable de moderación
El sistema MUST registrar de forma atómica y consultable las acciones sensibles sobre propiedades.

#### Scenario: Admin cambia el estado de una propiedad
- GIVEN un administrador autorizado modera una propiedad
- WHEN cambia su estado o motivo de moderación
- THEN el sistema MUST registrar propiedad, actor derivado de sesión, valores anterior/nuevo, motivo y fecha en la misma transacción
- AND MUST revertir la acción si no puede registrar la evidencia

#### Scenario: Admin elimina una propiedad
- GIVEN un administrador confirma eliminar una propiedad
- WHEN la eliminación se completa
- THEN el sistema MUST conservar una evidencia mínima independiente de la fila eliminada
- AND MUST evitar almacenar contacto, ubicación completa o la fila completa

#### Scenario: Usuario intenta leer o alterar la bitácora
- GIVEN un usuario anónimo o autenticado sin rol admin
- WHEN consulta, inserta, modifica o elimina eventos
- THEN RLS y privilegios MUST impedir la operación
- AND los eventos existentes MUST rechazar actualización y eliminación incluso en operaciones normales con `service_role`

#### Scenario: Worker termina una revisión IA
- GIVEN el Worker recibió una publicación válida para moderación
- WHEN aplica un estado IA mediante el RPC confiable
- THEN MUST autenticarse exclusivamente con `service_role`
- AND MUST validar la respuesta remota
- AND el evento MUST quedar identificado como automatización sin aceptar un actor enviado por el cliente

#### Scenario: Admin consulta la bitácora
- GIVEN un administrador abre la sección Bitácora
- WHEN existen eventos
- THEN el módulo MUST mostrar acción, propiedad, actor, transición, motivo y fecha con paginación
- AND MUST manejar carga, error y vacío de forma aislada
- AND MUST conservar una presentación legible en móvil sin desplazamiento horizontal obligatorio

