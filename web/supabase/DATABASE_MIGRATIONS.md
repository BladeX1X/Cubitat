# Supabase Database Migrations

Registro operativo de las migraciones de Cubitat. La fuente de verdad son los
archivos SQL versionados en `supabase/migrations/`; este documento resume su
orden y propósito, pero no sustituye la lectura del SQL.

Última revisión documental: 2026-07-27.

## Aplicación segura

Desde `web/`, revisar primero y aplicar después:

```powershell
npx supabase db push --linked --dry-run
npx supabase db push --linked --yes
```

Para enlazar el proyecto por primera vez:

```powershell
npx supabase login
npx supabase link --project-ref tohjzoncoosvjbjcakdl
```

No editar el esquema directamente en producción ni usar rollbacks destructivos.
Toda corrección debe añadirse como una migración nueva y numerada. La ejecución
manual desde SQL Editor queda reservada para contingencias y debe respetar
exactamente el orden cronológico de los archivos.

## Inventario activo

### Esquema inicial — 2026-06-30

1. `20260630140623_create_properties_schema.sql`: crea el esquema inicial de propiedades.
2. `20260630140801_populate_properties.sql`: carga los datos iniciales de propiedades.
3. `20260630163630_create_profiles_table.sql`: crea perfiles y su integración inicial con Auth.
4. `20260630212733_fix_trigger_search_path.sql`: fija el `search_path` seguro del trigger de perfiles.
5. `20260630213000_fix_trigger_column_name.sql`: corrige la columna utilizada por el trigger.
6. `20260630215300_create_saved_properties.sql`: crea favoritos por usuario.
7. `20260630222901_create_notifications_table.sql`: crea notificaciones.
8. `20260630224844_add_publish_fields_to_properties.sql`: agrega campos del flujo de publicación.
9. `20260630224905_create_property_images_bucket.sql`: crea y protege el bucket `property_images`.

### Perfil y administración — 2026-07-02 a 2026-07-05

10. `20260702001000_add_profile_avatar_and_phone_verification.sql`: agrega avatar y verificación telefónica.
11. `20260704000000_add_admin_role.sql`: incorpora el rol administrador.
12. `20260704000001_add_admin_policies.sql`: agrega políticas administrativas.
13. `20260704000002_allow_users_read_own_properties.sql`: permite leer propiedades propias no públicas.
14. `20260704000003_add_property_moderation_message.sql`: agrega el mensaje de moderación.
15. `20260705000000_secure_properties_policies.sql`: endurece las políticas de propiedades.

### Reportes, roles, Storage y moderación — 2026-07-06

16. `20260706000000_create_property_reports.sql`: crea denuncias con inserción pública y gestión administrativa.
17. `20260706001000_protect_profile_roles.sql`: impide cambios de rol no autorizados.
18. `20260706002000_fix_profile_role_protection_metadata.sql`: corrige la protección de roles y metadatos.
19. `20260706003000_harden_properties_and_reports_policies.sql`: endurece RLS de propiedades y reportes.
20. `20260706004000_protect_phone_verification_status.sql`: protege el estado de verificación telefónica.
21. `20260706005000_secure_property_image_upload_paths.sql`: restringe las rutas de subida de imágenes.
22. `20260706006000_allow_owner_edits_without_autopublish.sql`: permite editar sin autopublicación.
23. `20260706007000_add_ai_approved_property_status.sql`: agrega el estado `ai_approved`.
24. `20260706007001_add_ai_rejected_property_status.sql`: agrega el estado `ai_rejected`.
25. `20260706008000_allow_owner_edits_preserve_admin_update.sql`: conserva la edición administrativa.
26. `20260706009000_allow_ai_property_statuses_for_insert.sql`: admite estados iniciales de moderación IA.
27. `20260706200000_secure_profiles_role_escalation.sql`: refuerza la prevención de escalación de roles.

### Endurecimiento adicional — 2026-07-07 a 2026-07-09

28. `20260707000000_secure_profiles_phone_verification.sql`: refuerza la protección de verificación telefónica.
29. `20260707001000_secure_storage_property_images_isolation.sql`: aísla imágenes por propietario.
30. `20260708000000_restrict_ai_moderation_statuses.sql`: restringe transiciones de moderación IA.
31. `20260709000000_security_harden_profiles_moderation.sql`: consolida seguridad de perfiles y moderación.

### Rendimiento y funciones operativas — 2026-07-10 a 2026-07-11

32. `20260710000000_add_performance_indexes.sql`: agrega índices para consultas frecuentes.
33. `20260710000500_backfill_seed_property_contact_info.sql`: completa contacto en propiedades iniciales.
34. `20260710001000_create_property_status_notifications.sql`: notifica cambios de estado.
35. `20260710002000_create_search_alerts.sql`: crea alertas de búsqueda por usuario.
36. `20260710003000_create_contacts_table.sql`: crea la persistencia de contactos o leads.
37. `20260710004000_create_contact_notifications_trigger.sql`: notifica al propietario sobre nuevos contactos.
38. `20260711001000_cascade_delete_properties_user_id.sql`: sincroniza el borrado en cascada de propiedades.
39. `20260711002000_harden_profiles_contacts_reports.sql`: restringe perfiles a dueño/admin, valida formularios públicos, fija el `search_path` del trigger de contactos y agrega índices de auditoría.
40. `20260712000000_create_admin_metrics_rpc.sql`: crea una función admin-only para consultar tamaño de base de datos, Storage y conteos operativos sin exponer filas.

### Endurecimiento de carga y Storage — 2026-07-13

41. `20260713000000_security_hardening.sql`: limita `property_images` y `avatars` a WebP con tamaño acotado, reconcilia políticas Storage por carpeta/propietario y corrige la volatilidad declarada de `get_admin_metrics`.

### Auditoría de moderación — 2026-07-14

42. `20260714000000_create_property_moderation_audit.sql`: crea la bitácora
    append-only de cambios y eliminaciones de propiedades, RLS de lectura solo
    para admin, captura atómica, guard de inmutabilidad y RPC IA exclusivo de
    `service_role`.

### Controles de visibilidad — 2026-07-14

43. `20260714001000_add_owner_hidden_status.sql`: añade `owner_hidden` como
    estado no público separado del ocultamiento administrativo `paused`.
44. `20260714002000_property_visibility_controls.sql`: incorpora RPCs
    exclusivos del propietario para ocultar/restaurar, amplía su política RLS,
    bloquea mediante trigger que admin, otro usuario o automatización saquen
    una fila de `owner_hidden` y conserva `pending_review` al editar para repetir
    la moderación IA.

### Notificaciones de alertas de búsqueda — 2026-07-15 a 2026-07-18

45. `20260715183000_notify_matching_search_alerts.sql`: crea el trigger que
    genera notificaciones internas cuando una propiedad pasa a `published` y
    coincide con una alerta activa de otro usuario.
46. `20260718010000_harden_search_alert_notifications.sql`: añade una clave de
    evento idempotente por usuario/alerta/propiedad, evita duplicados, trata
    campos nulos como no coincidentes cuando el filtro los exige y descarta
    filtros heredados inválidos sin abortar la publicación.

### MFA administrativo — 2026-07-19

47. `20260719001000_enforce_admin_mfa.sql`: exige sesión `aal2` además del rol
    administrador en propiedades ajenas, perfiles, contactos, reportes,
    bitácora y métricas; conserva intactas las ramas legítimas del propietario.

### Turnstile obligatorio en escrituras publicas - 2026-07-19

48. `20260719002000_enforce_server_side_turnstile_submissions.sql`: elimina la
    insercion directa de `anon` y `authenticated` en contactos y reportes, y
    crea RPCs de escritura exclusivos de `service_role`. El Worker principal
    valida token, `action` y `hostname` antes de invocarlos.

### Contador de visitas a propiedades — 2026-07-21

49. `20260721123200_add_property_view_count.sql`: añade columna `view_count` a la tabla `properties` y crea la función RPC `increment_property_view_count(property_id UUID)` protegida con `SECURITY DEFINER` para permitir incrementos públicos.

Verificación productiva 2026-07-19: las 47 migraciones están sincronizadas,
`db lint --linked` no reporta errores y el dry-run remoto indica que la base
está actualizada. Una prueba vinculada dentro de `BEGIN`/`ROLLBACK` confirmó:
admin `aal1` con 0 propiedades privadas ajenas, 0 reportes y 0 eventos de
bitácora; admin `aal2` con acceso a 5 propiedades privadas ajenas, 6 reportes y
4 eventos; propietario normal `aal1` con 5 publicaciones propias y 0 datos
administrativos o privados ajenos. No se crearon ni modificaron filas
persistentes.

### Turnstile obligatorio en escrituras publicas - 2026-07-19

48. `20260719002000_enforce_server_side_turnstile_submissions.sql`: elimina la
    insercion directa de `anon` y `authenticated` en contactos y reportes, y
    crea RPCs de escritura exclusivos de `service_role`. El Worker principal
    valida token, `action` y `hostname` antes de invocarlos.

Estado 2026-07-19: **aplicado y verificado en produccion**. Las 48 migraciones
estan sincronizadas, `db lint --linked` no reporta errores y el dry-run remoto
no muestra pendientes. El intento directo con rol `anon` fue rechazado para
contactos y reportes. Los dos envios reales mediante Turnstile funcionaron y
las dos filas QA se eliminaron; una consulta posterior confirmo 0 residuos.

Verificación productiva 2026-07-19: la migración 46 fue aplicada al proyecto
vinculado con Supabase CLI 2.109.1. `migration list --linked` confirma las 46
migraciones sincronizadas, `db lint --linked` no reporta errores y el dry-run
posterior indica que la base remota está actualizada. La advertencia de Docker
afectó únicamente el cache local del catálogo y no la aplicación remota.

Cierre QA productivo 2026-07-19: una prueba vinculada ejecutada completamente
dentro de `BEGIN`/`ROLLBACK` confirmó coincidencia (`1` notificación y
`last_sent_at` actualizado), no coincidencia (`0`), descarte seguro de filtros
heredados inválidos (`0`) e idempotencia tras volver a publicar (`1` total para
el mismo `event_key`). Una consulta independiente posterior confirmó 0 alertas,
0 propiedades, 0 notificaciones y 0 eventos de auditoría con el marcador QA.
No persistieron datos de prueba.

Verificación productiva 2026-07-14: migraciones 43 y 44 aplicadas al proyecto
vinculado. `migration list --linked` confirma 44 migraciones sincronizadas,
`db lint --linked` no reporta errores y el dry-run posterior indica que la base
remota está actualizada. Una prueba SQL transaccional con `ROLLBACK` verificó
los ciclos `published → owner_hidden → published`,
`owner_hidden → pending_review` y `published → paused → published`; también
confirmó que anónimo, otro usuario, admin y `service_role` no pueden restaurar
el ocultamiento del propietario. Una consulta independiente posterior confirmó
0 filas del marcador QA, por lo que no se modificó contenido productivo.

Verificación productiva 2026-07-14: migración 41 aplicada al proyecto vinculado;
`migration list` sincronizado, `db lint` sin errores y dry-run posterior sin
migraciones pendientes. No se cargaron ni eliminaron objetos para esta
verificación.

Verificación productiva 2026-07-14: la migración 42 fue aplicada directamente
con Supabase CLI sin depender de Docker. `migration list --linked` confirma las
42 migraciones sincronizadas, `db lint --linked` no reporta errores y el
dry-run posterior indica que la base remota está actualizada. La lectura admin
de la bitácora se verificó en producción sin crear ni modificar eventos.

Cierre RLS/inmutabilidad 2026-07-14: prueba vinculada dentro de una transacción
con `ROLLBACK`. Anónimo sin lectura; usuario normal con 0 filas visibles; admin
con acceso al único evento sintético; administrador autenticado sin `INSERT` y
`service_role` sin `INSERT`, `UPDATE`, `DELETE` ni `TRUNCATE`. El trigger de
inmutabilidad rechazó también `UPDATE` y `DELETE` privilegiados. Una consulta
independiente posterior confirmó 0 filas del marcador QA. No persistieron
cambios ni se expusieron datos de cuentas.

Revalidación productiva 2026-07-19: matriz vinculada dentro de
`BEGIN`/`ROLLBACK`. Anónimo rechazado en lectura e inserción; usuario normal
`aal1` con 0 filas y sin `INSERT`, `UPDATE` o `DELETE`; admin `aal1` con 0 filas;
admin `aal2` con lectura de los 4 eventos existentes y sin `UPDATE` o `DELETE`;
`service_role` sin `UPDATE` o `DELETE`. El trigger de inmutabilidad permaneció
habilitado. Las 47 migraciones siguen sincronizadas y `db lint --linked` no
reportó errores. No persistieron cambios ni se mostraron identificadores.

### Selección de tipo de cuenta - 2026-07-27

50. `20260727100000_allow_self_role_toggle.sql`: mantiene bloqueados los cambios
    de rol iniciados por clientes y reserva cualquier transición para un
    administrador AAL2. No concede `INSERT` sobre `profiles` y conserva la
    protección de `phone_verified_at`. La activación autoservicio de agente
    pertenece exclusivamente a Fase 2 DEV y se define después en DEV-F2.3 con
    KYC aprobado obligatorio.

Estado 2026-07-27: **corregida en la rama DEV y no aplicada al proyecto
productivo**. Una revisión de seguridad detectó que la versión anterior habría
permitido `buyer → agent` sin que la cadena productiva dispusiera todavía de
las columnas KYC. La versión actual vuelve al cierre por defecto; el flujo
local usa DEV-F2.3, que exige `verification_status = 'verified'`.

### DEV-F2. `dev-migrations/20260801000000_phase2_kyc_and_agents.sql`

- **Estado 2026-07-27**: exclusiva de DEV. Está fuera de `supabase/migrations/` y no forma parte de la cadena productiva, que termina en 50.
- **Prohibido**: no aplicar al proyecto Supabase de producción ni copiarla temporalmente a la carpeta de migraciones productivas.
- Protege los campos de verificación contra autoelevación, exige administrador con AAL2 para revisar y almacena únicamente rutas privadas en `kyc_documents`.
- `get_public_agent_profile(uuid)` expone solo el perfil profesional permitido y agregados de publicaciones activas, sin abrir la tabla `profiles` al público.
- En DEV, el Worker procesa entregas mediante Cron Trigger y secretos server-side; `claim_pending_alert_emails` reclama filas atómicamente con `SKIP LOCKED`, reintenta y evita duplicados por solapamiento.
- El entorno DEV de Wrangler no tiene rutas del dominio productivo y su URL de Supabase queda como marcador no operativo hasta configurar explícitamente un proyecto DEV.
- El bucket privado se crea desde esta migración; no debe crearse manualmente ni usar URLs públicas para documentos KYC.
- **Fecha**: 2026-07-21
- **Propósito**: Fase 2 - Añade soporte para perfiles de agencias/agentes (`agency_name`, `license_number`, `bio`), solicitudes KYC (`kyc_requests`) y funciones RPC seguras (`submit_kyc_request`, `review_kyc_request`) para validación de identidad con RLS.

### DEV-F2.1. `dev-migrations/20260801001000_local_api_grants.sql`

- **Estado 2026-07-22**: exclusiva de DEV/local y fuera de la cadena productiva.
- Reproduce los permisos mínimos de API que el proyecto productivo histórico ya tenía, pero que las primeras migraciones no versionaron: perfil propio, propiedades legibles bajo RLS y notificaciones propias.
- No abre tablas nuevas ni evita RLS; únicamente permite que `authenticated`/`anon` lleguen a las políticas existentes en el stack reconstruido desde cero.

### DEV-F2.2. `dev-migrations/20260801002000_kyc_identity_selfie.sql`

- **Estado 2026-07-23**: aplicada y verificada exclusivamente en Supabase local; fuera de `supabase/migrations/` y de la cadena productiva.
- Añade `selfie_path` y sustituye la RPC de alta para exigir dos objetos privados distintos: documento de identidad y foto de la persona sosteniéndolo.
- Solo acepta carnet de identidad o pasaporte para solicitudes nuevas; la licencia profesional permanece como dato separado del perfil de agente.
- Las rutas nuevas deben usar los prefijos del propietario `document-` y `selfie-`; la RPC comprueba que ambos objetos existen antes de crear la solicitud.
- La RPC administrativa rechaza la aprobación si falta una ruta o cualquiera de los dos objetos, aunque el cliente intente saltarse la interfaz.
- Las solicitudes pendientes del flujo anterior se conservan como historial rechazado para que el usuario presente nuevamente ambas evidencias.
- El cliente convierte ambas imágenes a WebP antes de Storage, elimina metadatos
  al redibujarlas en canvas y limita el lado más largo a 1600 px. Si falla esa
  optimización, no inicia ninguna subida.
- **Prohibido**: no aplicar esta migración, sus datos QA ni el bucket KYC al proyecto productivo sin la autorización posterior expresa de Rodolfo.

### DEV-F2.3. `dev-migrations/20260801003000_require_verified_kyc_for_agent_role.sql`

- Exige `profiles.verification_status = 'verified'` antes de cualquier
  transición hacia `role = 'agent'`; la vuelta de `agent` a `buyer` permanece
  permitida.
- Si una operación interna de KYC cambia a `pending` o `rejected` un perfil que
  era agente, el mismo trigger lo degrada a `buyer` dentro de la transacción.
- Restaura en la función trigger la protección DEV de
  `verification_status`/`verification_reason` y conserva la frontera AAL2.
- Verificación local 2026-07-27: un `PATCH` autenticado de una cuenta
  `buyer/unverified` fue rechazado con `P0001`; tras marcar únicamente la cuenta
  QA como `verified`, Chrome permitió `buyer → agent → buyer`. La fixture quedó
  restaurada a `buyer/unverified`. Una prueba adicional confirmó
  `agent/verified → buyer/rejected` de forma atómica. Producción no fue
  consultada ni modificada.
- Matriz SQL transaccional 2026-07-27: comprobó las dos evidencias privadas,
  aislamiento propietario/tercero/admin AAL1, moderación admin AAL2, bloqueo de
  agente sin KYC, activación posterior a aprobación y degradación al retirar el
  KYC. Terminó con `phase2_local_security: ok` y `ROLLBACK`.

### DEV-F2.4. `dev-migrations/20260801004000_verified_agents_and_contact_metrics.sql`

- Mantiene la migracion exclusivamente en DEV/local y fuera de la cadena
  productiva.
- `get_verified_agent_ids()` publica solo identificadores de perfiles con rol
  `agent`, KYC `verified` y al menos una propiedad publicada. La interfaz usa
  esta proyeccion para insignias y el filtro `Solo Verificados`.
- `get_public_agent_profile(uuid)` devuelve perfiles unicamente cuando rol y KYC
  cumplen la misma invariante; los reportes agregados cuentan solo casos
  `resolved`.
- `increment_contact_clicks(uuid, text, uuid)` registra telefono o WhatsApp,
  deduplica por propiedad, canal, visitante y dia, y actualiza contadores
  persistentes no negativos en `properties`.
- La tabla privada `property_contact_clicks` tiene RLS habilitada y no concede
  lectura directa a `anon` ni `authenticated`.
- Verificacion local 2026-07-27: matriz SQL completa terminada con
  `phase2_local_security: ok` y `ROLLBACK`; la UI y repositorios quedaron
  cubiertos por la puerta de 82 archivos y 317 pruebas.

### DEV-F2.5. `dev-migrations/20260801005000_kyc_evidence_retention.sql`

- **Estado 2026-07-28**: aplicada y verificada únicamente en
  `supabase_db_web`; permanece fuera de `supabase/migrations/` y de la cadena
  productiva.
- Al aprobar una solicitud programa `evidence_purge_after` exactamente 24 horas
  después. El Cron DEV puede ejecutarla en su siguiente intervalo de 15
  minutos.
- `claim_approved_kyc_evidence_for_purge(integer)` reclama trabajos con
  `FOR UPDATE SKIP LOCKED`, recupera reclamos abandonados después de 30 minutos
  y está reservada a `service_role`.
- El Worker elimina documento y selfie mediante la API oficial de Storage. Solo
  después llama `complete_kyc_evidence_purge(uuid)`, que comprueba que los
  objetos ya no existan antes de poner ambas rutas en `NULL` y registrar
  `evidence_purged_at`.
- Un fallo de Storage conserva las rutas y libera el reclamo; un fallo posterior
  se recupera por expiración sin registrar IDs, rutas, credenciales ni errores
  externos.
- Se conserva únicamente el registro mínimo: solicitud, usuario, tipo, estado y
  fechas. La ventana para solicitudes rechazadas se añade después en DEV-F2.6.
- Evidencia local: matriz SQL completa con aislamiento de roles, ventana de 24
  horas, reclamo atómico y protección contra completar antes de Storage;
  resultado `phase2_local_security: ok` y `ROLLBACK`. Gate: lint limpio,
  83 archivos/326 pruebas y build TypeScript/Vite/PWA correcto con 473 URLs;
  dry-run de Wrangler DEV correcto, sin despliegue remoto.
- **Prohibido**: no aplicar esta migración ni desplegar el Cron actualizado en
  producción sin autorización expresa posterior.

### DEV-F2.6. `dev-migrations/20260801006000_rejected_kyc_evidence_retention.sql`

- **Estado 2026-07-28**: aplicada y verificada únicamente en
  `supabase_db_web`; incremental sobre DEV-F2.5 y fuera de la cadena productiva.
- Mantiene 24 horas para solicitudes `approved` y programa una hora para
  solicitudes `rejected`.
- Reemplaza el reclamo exclusivo de aprobadas por
  `claim_kyc_evidence_for_purge(integer)`, que procesa ambos estados con
  `FOR UPDATE SKIP LOCKED`, lease de 30 minutos y acceso exclusivo de
  `service_role`.
- Reutiliza la eliminación por API de Storage, la comprobación de ausencia
  física antes de poner rutas en `NULL` y los reintentos seguros de DEV-F2.5.
- Evidencia: la matriz local confirmó que un rechazo reciente no se reclama y
  que queda elegible al superar una hora, sin alterar la ventana aprobada.
  Resultado `phase2_local_security: ok` y `ROLLBACK`. Gate: lint limpio,
  83 archivos/327 pruebas, build PWA con 473 URLs y Wrangler DEV dry-run
  correcto.
- Trust Score y Web Push permanecen diferidos por decisión de producto.
- **Prohibido**: no aplicar ni desplegar esta retención en producción sin
  autorización expresa posterior.

## Verificación después de aplicar

- Confirmar que `supabase migration list --linked` no muestre diferencias.
- Probar lectura pública únicamente de propiedades publicadas.
- Probar acceso del propietario a borradores y publicaciones propias.
- Probar que otro usuario no pueda editar propiedades, imágenes, favoritos ni alertas ajenas.
- Probar que solo un administrador pueda moderar y consultar denuncias.
- Probar que el cliente publico no pueda insertar contactos o reportes
  directamente y que ambos flujos funcionen solo tras validar Turnstile en el
  Worker principal.
- Probar inserción de contactos y generación de su notificación.
- Probar que un usuario no pueda elevar su rol ni marcar su teléfono como verificado.
- Probar subida y borrado de imágenes dentro de la carpeta autorizada del propietario.
- Probar rechazo de MIME distinto de WebP y de objetos que superen 5 MiB en `property_images` o 1 MiB en `avatars`.
- Registrar cualquier migración nueva en este inventario dentro del mismo cambio.
