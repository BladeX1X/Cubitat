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
componente local. En la revisión visual autenticada en DEV, el solicitante mostró
únicamente el estado genérico «Postulación no aprobada», mientras que la sesión
de moderador AAL2 abrió el historial y vio las notas internas de dos
postulaciones rechazadas. La nota no se expone al solicitante. No se alteraron
solicitudes ni documentos durante esta comprobación; el comportamiento no se ha
verificado en producción.

#### Estado de despliegue — 2026-11-08

La versión DEV `dcf754bc-d5aa-44d2-9069-1cc510a8d0ec` incluye este flujo. El
smoke anónimo confirmó home 200, GET al intake 405 y GET a documentos privados
401. Las pruebas locales cubren que Mi cuenta no presenta el motivo y que la
nota aparece en el historial de moderación. En el navegador DEV se comprobó
que la cuenta solicitante solo ve «Postulación no aprobada» con texto genérico.
La consulta autenticada del historial queda verificada visualmente en DEV. No se
ha confirmado esta parte en producción.

La sección **Agentes activos** usa RPCs autenticadas permitidas explícitamente
por el Worker DEV, que conserva el JWT de la sesión; PostgreSQL exige admin
AAL2 para ambas operaciones. Para retirar el
acceso, el moderador debe indicar un motivo de 3–500 caracteres. La operación
registra un evento inmutable, libera la plaza provincial si existe y cambia el rol a
`buyer` dentro de la misma transacción; conserva la cuenta, anuncios e historial.
También lista agentes heredados que no tengan plaza asignada para que puedan
retirarse. Un perfil `admin` aparece solo si tiene una plaza provincial activa;
la tarjeta muestra su rol y no ofrece retirar los permisos administrativos.
El RPC de retiro continúa limitado a perfiles `agent`.
La migración `20261106100000_agent_access_revocation.sql` contiene estas RPC y
el evento inmutable; su presencia remota debe confirmarse por entorno antes de
desplegar la interfaz.

## Diagnóstico de fallos

La respuesta de la RPC puede llegar dentro de la propiedad `error`. El cliente
normaliza hasta tres niveles de envoltura para recuperar código, estado y
mensaje de forma segura; solo los compara con condiciones conocidas. Nunca
presenta el mensaje bruto del servidor. Las pruebas cubren autorización y
precondiciones KYC en respuestas envueltas.

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

### Lista de agentes en el Worker DEV — diagnóstico histórico del 2026-11-07

En el diagnóstico de esa fecha, la sección se renderizaba, pero el Worker devolvía 403 antes de enviar
`list_active_agents_for_moderation` a PostgREST: faltaba incluir la RPC en la
lista permitida de operaciones autenticadas. La misma omisión afectaba
`revoke_agent_access`. La corrección local añade ambas RPC a la lista; la base
de datos conserva la autorización AAL2. En el estado observado, la interfaz
todavía no está reparada en DEV: el bundle activo contiene 29 módulos con hashes
distintos del build local, así que hay que recuperar el árbol de release
correspondiente antes de desplegar este arreglo. El estado se corrigió después:
la lista y la RPC se publicaron en DEV; en esta revisión se observó la sección sin
error, aunque no se validó la lista de agentes activos ni una revocación.

### Verificación de bundle DEV — 2026-11-08

- Confirmado por HTTP público: `/moderar` y el chunk `/assets/AgentApplicationsModerationTab-CyxjcX8Q.js` responden 200; el chunk contiene «Historial privado de rechazos» y «Nota interna».
- En el momento de esta comprobación HTTP aún faltaba inspeccionar los datos en sesión; el pendiente quedó cerrado después con la verificación autenticada de dos notas que consta arriba.
- Esta evidencia supersede las notas anteriores de este archivo que describían este módulo de historial como solo local o pendiente de despliegue; no certifica otros endpoints ni todos los flujos F3.
- Privacidad esperada: la nota queda solo para moderación AAL2; Mi cuenta muestra estado genérico. Producción y datos de Supabase sin cambios.

### Lista de RPC de moderación en producción — 2026-11-25

El Worker productivo debe permitir explícitamente `review_agent_application`
en el proxy autenticado. Si la lista perimetral bloquea una RPC administrativa,
la interfaz identifica `Operación no permitida.` como rechazo del Worker y señala
que falta habilitar la función, sin exponer contenido arbitrario del servidor.
