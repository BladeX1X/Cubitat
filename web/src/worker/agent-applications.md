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

Este bloque sigue parcial: la bandera está apagada; la migración solo existe en
el candidato y no se aplicó; falta validar el SQL en un scratch limpio, interfaz
de postulación, notificación con enlaces firmados, revisión/decisión AAL2,
asignación transaccional de cuatro agentes por provincia y eliminación de
documentos 30 días después de la decisión. Las pruebas Worker actuales cubren
11 escenarios; `supabase/tests/agent_application_intake_local.sql` valida grants,
RLS y privacidad del bucket cuando se ejecute tras aplicar la migración en scratch.
