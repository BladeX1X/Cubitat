# Moderación de postulaciones de agente

`AgentApplicationsModerationTab` es la vista administrativa de solo lectura para
la cola abierta de solicitudes. Solo se incluye en el bundle de DEV cuando se
activa `VITE_PHASE3_UI_ENABLED`; la pantalla sigue dentro de `AdminMfaGate`.
RLS determina qué filas puede cargar la sesión y el Worker vuelve a comprobar
`is_admin_aal2()` antes de emitir enlaces del CV y el título.

Los enlaces no se solicitan al cargar la cola: se generan cuando el moderador
pulsa **Ver documentos**, no se guardan en almacenamiento local y desaparecen
de la vista después de dos minutos. Esta primera vista no puede aceptar ni
rechazar postulaciones; todavía falta el RPC de decisión auditada y el control
transaccional de cuatro agentes asignados por provincia.
