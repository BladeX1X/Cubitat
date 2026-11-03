# Moderación de postulaciones de agente

`AgentApplicationsModerationTab` es la vista administrativa de la cola abierta
de solicitudes. Solo se incluye en el bundle de DEV cuando se activa
`VITE_PHASE3_UI_ENABLED`; la pantalla sigue dentro de `AdminMfaGate`.
RLS determina qué filas puede cargar la sesión y el Worker vuelve a comprobar
`is_admin_aal2()` antes de emitir enlaces del CV y el título.

Los enlaces no se solicitan al cargar la cola: se generan cuando el moderador
pulsa **Ver documentos**, no se guardan en almacenamiento local y desaparecen
de la vista después de dos minutos. La cola permite iniciar revisión, enviar a
lista de espera y rechazar mediante `review_agent_application`, que vuelve a
exigir admin AAL2 en PostgreSQL y deja un evento inmutable. El rechazo exige
motivo y programa la eliminación de documentos a los 30 días.

La aprobación sigue bloqueada: todavía se necesita asignar y verificar dentro
de una transacción el cupo máximo de cuatro agentes activos por provincia. No
se debe habilitar la UI de esta función como sustituto de esa garantía.
