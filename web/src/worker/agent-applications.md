# Validación de documentos de postulación de agentes

`agent-applications.ts` valida y recibe el envío de postulación en el Worker.
Deriva PDF, JPEG o PNG a partir de los bytes y no confía en el nombre ni el MIME
que envía el navegador. El tamaño máximo es inclusivo: 10 MiB exactos se aceptan
y cualquier byte adicional se rechaza. La ruta requiere `PHASE3_ENABLED=true`;
la configuración base lo conserva en `false`, mientras DEV tiene un override
hosted que la activa. Producción permanece apagada.

El Worker limita el cuerpo antes de analizar multipart, exige sesión autenticada,
valida campos/provincia y requiere CV y título/diploma. Sube con el secreto de
service role a `agent_application_documents`, invoca una RPC reservada a
`service_role` y borra los objetos si falla la persistencia. La migración crea
tablas privadas de solicitudes/eventos, el bucket privado, lectura de estado por
propietario y lectura administrativa AAL2; el RPC impone una solicitud abierta
por cuenta y un límite diario para evitar bypass directo.

DEV registra las seis migraciones F3 `20261103120000`–`20261103170000` y el
Worker tiene `PHASE3_ENABLED=true`; producción conserva el flujo apagado. La
RPC AAL2 permite iniciar revisión, lista de espera, rechazo y aprobación
auditados. Una plaza se asigna en transacción serializada por provincia, exige
KYC verificado y deja en espera solicitudes cuando ya hay cuatro plazas
ocupadas. Las decisiones finales programan eliminación de documentos a los 30
días; el cron de DEV reclama vencidos, limita los intentos a tres y limpia las
rutas al confirmar el borrado del bucket privado. Los contratos pasan CI
aislado. La entrega de correo no se considera verificada hasta completar su
configuración y prueba real. Los perfiles agent preexistentes deben
reconciliarse con una provincia antes de validar cupos en un entorno hosted.
El formulario cliente está documentado en
`src/pages/agents/AgentApplicationPage.md` y solo se incluye con
`VITE_PHASE3_UI_ENABLED=true` en build `phase2-dev`. El correo y la purga corren
en DEV detrás de `PHASE3_ENABLED`; su ejecución debe confirmarse en logs antes
de marcar esos flujos como verificados.

## Acceso administrativo temporal a documentos

`GET /api/phase3/agent-applications/:id/documents` solo se monta con
`PHASE3_ENABLED=true`. El Worker valida la sesión, limita frecuencia y consulta
`is_admin_aal2()` con el JWT del usuario antes de leer rutas usando service role.
Luego pide a Storage URLs firmadas de dos minutos para el bucket esperado,
verifica origen y bucket de ambas y devuelve `Cache-Control: no-store`. Nunca
registra las rutas ni las URLs. La pestaña administrativa de DEV consume esta
ruta dentro de `AdminMfaGate`; el RPC de revisión persiste transiciones
permitidas y eventos inmutables. Los fallos registran fase, estado HTTP y una
causa enumerada, sin IDs, rutas ni contenido sensible; la UI traduce errores
conocidos de AAL2, PostgREST, KYC/estado y Storage a mensajes accionables.

## Aviso administrativo por correo

La migración candidata `20261103140000_agent_application_email_outbox.sql` crea una intención de correo en la misma transacción que cada postulación. El outbox no es legible por `anon` ni `authenticated`; el Worker reclama y actualiza entregas únicamente mediante RPC de `service_role`, con reintentos limitados a tres.

El cron de Worker solo procesa correos cuando `PHASE3_ENABLED=true` y existen `RESEND_API_KEY`, `ALERT_EMAIL_FROM` y el secreto `AGENT_APPLICATION_EMAIL_TO`. El último valor debe configurarse fuera del repositorio (destinatario provisional actual: `pochiprats18@gmail.com`). El mensaje incluye enlaces firmados de Storage que caducan en 10 minutos y nunca adjunta los documentos. El código valida que los enlaces permanezcan en el proyecto Supabase configurado y no registra tokens, rutas ni contenido del mensaje.

Los tests usan Resend y Storage simulados. DEV tiene la bandera activa y el
Worker cuenta con configuración de correo; no se afirma un envío exitoso sin
confirmación de entrega en la cola y el proveedor.

## Asignación de plazas provinciales

La migración candidata `20261103150000_agent_application_province_capacity.sql`
guarda asignaciones privadas e historial. La RPC de moderación serializa
aprobaciones con un lock transaccional por provincia; exige KYC aprobado, asigna
una de cuatro plazas activas y devuelve `waitlisted` cuando la provincia está
llena. Índices parciales evitan que la misma persona o postulación ocupe dos
plazas a la vez. Al salir del rol agent o perder KYC, el perfil libera la plaza.
Las cuentas agent existentes deben reconciliarse a una provincia antes de
considerar la capacidad validada en un ambiente persistente.

## Retención de documentos

La migración candidata `20261103160000_agent_application_evidence_retention.sql`
revoca la lectura de rutas documentales a clientes y reserva claim/complete/retry
al `service_role`. El cron elimina CV y título tras la decisión final y 30 días,
limpia las rutas de la fila al completarse y conserva solo códigos de error
acotados. No registra rutas ni nombres y permanece apagado salvo
`PHASE3_ENABLED=true`.
