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

La sección **Historial privado de rechazos** consulta los eventos de rechazo en
páginas y solo se presenta en esta vista administrativa protegida por AAL2. El
moderador puede volver a consultar la nota interna y el estado/provincia de la
solicitud; el motivo no se copia a la respuesta del solicitante ni a la tarjeta
de estado de Mi cuenta. El acceso continúa sujeto a RLS de
`agent_application_events`. La consulta y visualización tienen cobertura de
componente local; la verificación con una sesión admin AAL2 en DEV sigue pendiente.

La sección **Agentes activos** usa RPCs autenticadas permitidas explícitamente
por el Worker DEV, que conserva el JWT de la sesión; PostgreSQL exige admin
AAL2 para ambas operaciones. Para retirar el
acceso, el moderador debe indicar un motivo de 3–500 caracteres. La operación
registra un evento inmutable, libera la plaza provincial si existe y cambia el rol a
`buyer` dentro de la misma transacción; conserva la cuenta, anuncios e historial.
También lista agentes heredados que no tengan plaza asignada para que puedan
retirarse; los perfiles `admin` no aparecen ni pueden ser objetivo del RPC.
La migración `20261106100000_agent_access_revocation.sql` contiene estas RPC y
el evento inmutable; su presencia remota debe confirmarse por entorno antes de
desplegar la interfaz.

## Diagnóstico de fallos

Los errores de documentos se diferencian por permiso AAL2, límite temporal,
postulación ausente, consulta de base de datos y firma de Storage. El Worker
registra únicamente fase, estado HTTP y una causa enumerada; nunca guarda ID,
rutas, URLs firmadas ni contenido documental. La RPC administrativa traduce
SQLSTATE conocidos a instrucciones accionables: AAL2, requisito/estado (incluye
KYC), plaza duplicada o caché PostgREST pendiente. Los errores desconocidos
solo muestran su código SQLSTATE, no el mensaje bruto del servidor.

Si el SDK no devuelve SQLSTATE, la UI diferencia fallos de conexión y usa el
estado HTTP o el tipo/los nombres de campos permitidos como diagnóstico. La UI
nunca muestra el mensaje bruto del servidor ni el ID de solicitud.

### Lista de agentes en el Worker DEV — 2026-11-07

La sección se renderizaba, pero el Worker devolvía 403 antes de enviar
`list_active_agents_for_moderation` a PostgREST: faltaba incluir la RPC en la
lista permitida de operaciones autenticadas. La misma omisión afectaba
`revoke_agent_access`. La corrección local añade ambas RPC a la lista; la base
de datos conserva la autorización AAL2. En el estado observado, la interfaz
todavía no está reparada en DEV: el bundle activo contiene 29 módulos con hashes
distintos del build local, así que hay que recuperar el árbol de release
correspondiente antes de desplegar este arreglo.
