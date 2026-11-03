# Validación de documentos de postulación de agentes

`agent-applications.ts` valida y recibe el envío de postulación en el Worker.
Deriva PDF, JPEG o PNG a partir de los bytes y no confía en el nombre ni el MIME
que envía el navegador. El tamaño máximo es inclusivo: 10 MiB exactos se aceptan
y cualquier byte adicional se rechaza. La ruta se monta únicamente en el Worker
DEV y requiere `PHASE3_ENABLED=true`; el valor del perfil DEV se conserva en
`false` por defecto.

El Worker limita el cuerpo antes de analizar multipart, exige sesión autenticada,
valida campos/provincia y requiere CV y título/diploma. Sube con el secreto de
service role a `agent_application_documents`, invoca una RPC reservada a
`service_role` y borra los objetos si falla la persistencia. La migración crea
tablas privadas de solicitudes/eventos, el bucket privado, lectura de estado por
propietario y lectura administrativa AAL2; el RPC impone una solicitud abierta
por cuenta y un límite diario para evitar bypass directo.

Este bloque sigue parcial: la bandera está apagada y las migraciones solo existen
en el candidato. La migración de intake y
`supabase/tests/agent_application_intake_local.sql` se validaron en un scratch
aislado (6/6 checks pgTAP); no se aplicaron a DEV ni producción. La RPC AAL2
permite iniciar revisión, lista de espera, rechazo y aprobación auditados. Una
plaza se asigna en transacción serializada por provincia, exige KYC verificado y
deja en espera solicitudes cuando ya hay cuatro plazas ocupadas. Las decisiones
finales programan eliminación de documentos a los 30 días; la purga automática
sigue pendiente. El outbox está validado en CI con enlaces privados cortos, sin
adjuntos; el envío sigue apagado. Los perfiles agent preexistentes deben
reconciliarse con una provincia antes de validar cupos en un entorno hosted.
El formulario cliente está documentado en
`src/pages/agents/AgentApplicationPage.md` y solo se incluye con
`VITE_PHASE3_UI_ENABLED=true` en build `phase2-dev`; correo y purga siguen
pendientes.

## Acceso administrativo temporal a documentos

`GET /api/phase3/agent-applications/:id/documents` solo se monta en DEV y con
`PHASE3_ENABLED=true`. El Worker valida la sesión, limita frecuencia y consulta
`is_admin_aal2()` con el JWT del usuario antes de leer rutas usando service role.
Luego pide a Storage URLs firmadas de dos minutos para el bucket esperado,
verifica origen y bucket de ambas y devuelve `Cache-Control: no-store`. Nunca
registra las rutas ni las URLs. La pestaña administrativa de DEV consume esta
ruta dentro de `AdminMfaGate`; el RPC de revisión persiste transiciones
permitidas y eventos inmutables. No se ha validado contra Supabase DEV.

## Aviso administrativo por correo

La migración candidata `20261103140000_agent_application_email_outbox.sql` crea una intención de correo en la misma transacción que cada postulación. El outbox no es legible por `anon` ni `authenticated`; el Worker reclama y actualiza entregas únicamente mediante RPC de `service_role`, con reintentos limitados a tres.

El cron de Worker solo procesa correos cuando `PHASE3_ENABLED=true` y existen `RESEND_API_KEY`, `ALERT_EMAIL_FROM` y el secreto `AGENT_APPLICATION_EMAIL_TO`. El último valor debe configurarse fuera del repositorio (destinatario provisional actual: `pochiprats18@gmail.com`). El mensaje incluye enlaces firmados de Storage que caducan en 10 minutos y nunca adjunta los documentos. El código valida que los enlaces permanezcan en el proyecto Supabase configurado y no registra tokens, rutas ni contenido del mensaje.

Los tests usan Resend y Storage simulados. No se ha enviado correo real ni se han configurado secretos; el flujo permanece apagado por `PHASE3_ENABLED=false`.

## Asignación de plazas provinciales

La migración candidata `20261103150000_agent_application_province_capacity.sql`
guarda asignaciones privadas e historial. La RPC de moderación serializa
aprobaciones con un lock transaccional por provincia; exige KYC aprobado, asigna
una de cuatro plazas activas y devuelve `waitlisted` cuando la provincia está
llena. Índices parciales evitan que la misma persona o postulación ocupe dos
plazas a la vez. Al salir del rol agent o perder KYC, el perfil libera la plaza.
Las cuentas agent existentes deben reconciliarse a una provincia antes de
considerar la capacidad validada en un ambiente persistente.
