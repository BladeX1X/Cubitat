# Moderación de postulaciones de agente

`AgentApplicationsModerationTab` es la vista administrativa de la cola abierta
de solicitudes. Solo se incluye en el bundle de DEV cuando se activa
`VITE_PHASE3_UI_ENABLED`; la pantalla sigue dentro de `AdminMfaGate`.
RLS determina qué filas puede cargar la sesión y el Worker vuelve a comprobar
`is_admin_aal2()` antes de emitir enlaces del CV y el título.

Los enlaces no se solicitan al cargar la cola: se generan cuando el moderador
pulsa **Ver documentos**, no se guardan en almacenamiento local y desaparecen
de la vista después de dos minutos. La cola permite aprobar y asignar plaza,
iniciar revisión, enviar a lista de espera y rechazar mediante
`review_agent_application`. PostgreSQL vuelve a exigir admin AAL2 y deja un
evento inmutable. La aprobación exige KYC verificado; una transacción
serializada por provincia consume una plaza entre cuatro o deja la solicitud en
espera cuando no hay capacidad. El rechazo exige motivo y las decisiones finales
programan la eliminación de documentos a los 30 días. Los perfiles agent
preexistentes deben reconciliarse con una provincia antes de habilitar el flujo
en un entorno hosted.
