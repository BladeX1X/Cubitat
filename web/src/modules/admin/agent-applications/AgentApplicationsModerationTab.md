# Moderación de postulaciones de agente

`AgentApplicationsModerationTab` es la vista administrativa de la cola abierta
de solicitudes. Solo se incluye en el bundle de DEV cuando se activa
`VITE_PHASE3_UI_ENABLED` o el perfil `phase3-production`; la pantalla sigue
dentro de `AdminMfaGate`.
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
en un entorno hosted. Cuando vence la retención, el endpoint responde 410 y la
pestaña explica que los documentos ya fueron eliminados.

## Diagnóstico de fallos

Los errores de documentos se diferencian por permiso AAL2, límite temporal,
postulación ausente, consulta de base de datos y firma de Storage. El Worker
registra únicamente fase, estado HTTP y una causa enumerada; nunca guarda ID,
rutas, URLs firmadas ni contenido documental. La RPC administrativa traduce
SQLSTATE conocidos a instrucciones accionables: AAL2, requisito/estado (incluye
KYC), plaza duplicada o caché PostgREST pendiente. Los errores desconocidos
solo muestran su código SQLSTATE, no el mensaje bruto del servidor.
