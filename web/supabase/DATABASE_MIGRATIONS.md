# Supabase Database Migrations

Registro operativo de las migraciones de Cubitat. La fuente de verdad son los
archivos SQL versionados en `supabase/migrations/`; este documento resume su
orden y propósito, pero no sustituye la lectura del SQL.

Última revisión documental: 2026-10-13.

## Excepción temporal de MFA administrativo en producción — 2026-10-13

- `20261013180000_temporary_admin_mfa_bypass.sql` prepara una suspensión de
  siete días que comienza al aplicar la migración. No elimina factores TOTP.
- La fecha única vive en una tabla sin acceso para clientes; la función
  `is_admin_aal2()` vuelve a exigir AAL2 cuando la fecha vence, sin otra
  publicación. El RPC de lectura solo devuelve esa fecha al usuario admin.
- El panel muestra el vencimiento y se bloquea de nuevo automáticamente; el
  Worker consulta la misma fecha para sus rutas de métricas y moderación IA.
- **Estado:** preparado y probado en código; pendiente fusionar, desplegar el
  Worker y aplicar únicamente esta migración al proyecto de producción
  `tohjzoncoosvjbjcakdl`. El reloj de siete días no empezará antes de aplicar
  la migración. Esta es una excepción de seguridad temporal, no un mecanismo
  para eliminar MFA en la recuperación de una cuenta.

## Auditoría de permisos de Fase 2 en producción — 2026-10-10

- Historial remoto consultado de solo lectura con el proyecto de producción identificado explícitamente (`tohjzoncoosvjbjcakdl`): coincide hasta `20260930160000`. Al inicio de la auditoría, antes del PR #120, la única migración pendiente en `main` era el ajuste del texto de aprobación `20261009100000_simplify_property_approval_notification.sql`.
- La consulta de catálogos mostró que `anon` y `authenticated` todavía pueden ejecutar `claim_pending_push_deliveries(integer)` y `authorize_push_delivery(uuid,integer)`. La primera devuelve credenciales de suscripción Push; solo debe ejecutarla `service_role`.
- También se confirmó grant anónimo de `get_admin_metrics()`, privilegios de tabla más amplios que los requeridos en tablas core y Fase 2, y que `increment_property_view_count(uuid)` permite incrementar vistas de cualquier estado y usa `search_path=public`.
- `20261010110000_harden_production_phase2_privileges.sql` replica el endurecimiento ya aplicado y verificado en DEV: revoca grants históricos innecesarios, preserva las operaciones cliente/RLS requeridas, reserva las RPC Push a `service_role`, quita el grant anónimo de métricas y limita el contador a propiedades publicadas.
- Estado final tras autorización expresa: ambas migraciones se aplicaron a producción el 2026-10-10, en orden, con `supabase db push --linked --yes` desde una copia temporal aislada de las migraciones versionadas. El dry-run previo enumeró exactamente esas dos versiones.
- Cloudflare indicó que `cubitat1` servía al 100% la versión `f704da45-1a0b-4c0d-86f4-3081cdbb3cb0`, subida el 2026-10-11 01:33 UTC. El registro no incluye SHA de Git; no atribuirlo al PR #119 sin evidencia adicional.
- Verificación posterior: el historial remoto registra `20261009100000` y `20261010110000`, sincronizados con local. `has_function_privilege` confirmó que las RPC de entrega Push ya no son ejecutables por `anon` ni `authenticated` y siguen disponibles para `service_role`; `get_admin_metrics()` perdió el permiso anon y conserva authenticated (con su control AAL2 interno). `increment_property_view_count(uuid)` conserva acceso público para el contador, ahora solo actualiza propiedades `published` y usa `search_path=pg_catalog`. En las 11 tablas revisadas no quedan grants de `TRUNCATE`, `TRIGGER` o `REFERENCES` para `anon`/`authenticated`.
- No se leyeron ni modificaron filas de usuarios. La operación no desplegó Worker ni cambió secretos de Cloudflare.
## KYC base de producción — 2026-09-30

50. `20260930100000_add_production_kyc.sql`: incorpora de forma idempotente la
    tabla `kyc_requests`, el bucket privado `kyc_documents`, sus políticas RLS y
    los RPC de envío y revisión KYC con control administrativo AAL2. Esta
    migración es independiente de las migraciones DEV de Fase 2 y se aplica
    únicamente tras validación del esquema productivo.

Estado 2026-09-30: aplicada y verificada en el proyecto remoto vinculado; el
historial remoto coincide y `db lint --linked --level warning` no reporta
errores. No se crearon solicitudes ni documentos QA durante esta migración.

51. `20260930110000_require_verified_kyc_for_agent_role.sql`: exige KYC
    verificado antes de activar el rol `agent` y conserva la degradación segura
    a `buyer` cuando una revisión KYC interna deja de estar aprobada.

Estado 2026-09-30: aplicada y verificada en producción; el trigger existe y
`db lint --linked --level warning` no reporta errores. La consulta previa no
encontró agentes activos, por lo que no se alteraron perfiles existentes.

52. `20260930120000_add_verified_agents_and_contact_metrics.sql`: agrega los
    datos de perfil profesional, proyecciones públicas de agentes verificados y
    métricas de contacto deduplicadas. La escritura de métricas queda reservada
    al `service_role` para que el navegador no controle la clave de deduplicación.

53. `20260930130000_add_property_verification.sql`: crea solicitudes privadas
    de evidencia documental por propiedad, revisión administrativa AAL2 y un
    indicador interno de confianza que no constituye certificación legal.

54. `20260930140000_add_property_duplicate_rules.sql`: detecta coincidencias
    exactas normalizadas, las deja como señal revisable para moderación y
    resuelve la señal al alcanzar estados finales sin rechazar automáticamente.


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

### Endurecimiento de permisos de Fase 2 en producción — 2026-10-10

- `20261010110000_harden_production_phase2_privileges.sql`: migración agregada por PR #120, fusionada en `main` como `2cd21a0c210b7e6f402eeed9add67bb06075bf55` y aplicada en Supabase producción tras autorización expresa el 2026-10-10. Historial y permisos efectivos verificados después.

### Aviso de aprobación de publicación — 2026-10-09

- `20261009100000_simplify_property_approval_notification.sql`: simplifica al usuario la notificación de aprobación. Aplicada a Supabase producción junto con el hardening el 2026-10-10; historial remoto confirmado.

- `20261009100000_simplify_property_approval_notification.sql`: simplifica el
  aviso `ai_approved` a «Revisión aprobada» y «Tu publicación … fue aprobada»,
  sin revelar el mecanismo interno. Aplicada y confirmada en el historial remoto
  de producción el 2026-10-10.
- La variante `dev-migrations/20261009030000_simplify_property_approval_notification.sql`
  se aplica únicamente a DEV; no ejecutar en producción.
- La función remota DEV se verificó después de aplicar la variante DEV; los
  avisos preexistentes conservan el texto con que fueron creados.
- El panel de moderación DEV ya clasifica las distancias y muestra la regla de
  comparación humana; Worker DEV `75fd5a20-2251-4c68-9f2c-b7c4482ccaee`.

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

### Destinos de notificaciones - 2026-09-09

51. `20260909010000_add_notification_destinations.sql`: incorpora un
    `action_path` interno y opcional a las notificaciones; las coincidencias de
    busqueda y los contactos apuntan a la propiedad relacionada, mientras que
    los cambios de estado apuntan a `Mis publicaciones`. La base restringe el
    valor a rutas internas y conserva compatibles los avisos antiguos sin
    destino.

Estado 2026-09-09: **aplicada en produccion** junto con el endurecimiento
pendiente `20260727100000`. `migration list --linked` confirma ambas versiones
sincronizadas, `db lint --linked` no reporta errores y el dry-run posterior
indica que la base remota esta actualizada.

### Web Push por dispositivo - 2026-09-11

52. `20260911010000_add_web_push.sql`: crea suscripciones Push asociadas al
    usuario con RLS, una cola de entrega por notificacion y dispositivo, el
    trigger de encolado y un reclamo atomico `FOR UPDATE SKIP LOCKED` reservado a
    `service_role`. Limita cada entrega a tres intentos y permite recuperar
    trabajos cuyo lease de procesamiento haya vencido.

Estado 2026-09-11: **aplicada en produccion**. El primer lint remoto detecto la
calificacion invalida de expresiones especiales y se corrigio mediante las
migraciones 53 y 54, sin reescribir historial aplicado. `migration list
--linked` confirma sincronizacion y el lint final no reporta errores.

53. `20260911020000_fix_push_claim_limit.sql`: corrige la calificacion invalida
    de la expresion especial `COALESCE` detectada por `supabase db lint
    --linked` despues de aplicar la migracion 52. Conserva el limite entre 1 y
    100 y usa 50 cuando el argumento sea `NULL`.

54. `20260911030000_fix_push_claim_bound.sql`: reemplaza tambien `LEAST` y
    `GREATEST`, que PostgreSQL trata como expresiones especiales, por un `CASE`
    explicito. Esta es la definicion final del limite de reclamo. Worker
    productivo `1438af56-a0e1-473f-9779-2162e7a6a714`, secretos VAPID y Cron de
    un minuto verificados; una ejecucion programada real termino en `ok`.

55. `20260911040000_push_account_isolation.sql`: garantiza aislamiento estricto
    de suscripciones Push entre cuentas en navegadores compartidos. Introduce la
    tabla `push_endpoint_owners`, trigger `enforce_push_endpoint_owner` que
    impide transferencias de endpoints entre usuarios, revoca `INSERT`, `UPDATE`,
    `DELETE` directo de `authenticated` en `push_subscriptions`, purga entregas
    huérfanas de usuarios cruzados y actualiza `claim_pending_push_deliveries` y
    `authorize_push_delivery` para verificar `n.user_id = s.user_id`.

56. `20260911050000_retire_legacy_moderation_rpc.sql`: retira definitivamente la
    RPC obsoleta `set_property_ai_moderation`, revocando permisos de ejecución a
    `PUBLIC`, `anon`, `authenticated` y `service_role`. Cierra el riesgo estático
    de evasión de MFA (AAL2) por llamada directa a la API de Supabase. La
    moderación humana se canaliza por RLS admin AAL2 y la automatizada por
    `set_property_ai_moderation_trusted`.

57. `20260911060000_private_property_addresses.sql`: separa y protege la dirección
    física exacta de inmuebles. Almacena la dirección privada en
    `property_private_addresses` accesible solo por el propietario y admin AAL2
    bajo RLS, implementa `public_property_location` para censurar calles y
    números en vistas públicas/anónimas, y sincroniza automáticamente las
    actualizaciones vía trigger `sync_property_location_privacy`.

58. `20260912010000_private_property_coordinates.sql`: conserva las coordenadas
    exactas en `property_private_coordinates`, con lectura RLS exclusiva del
    propietario, y reduce `properties.coordinates` a una cuadrícula pública de
    `0.02` grados. La migración corrige registros existentes y un trigger aplica
    la misma protección a inserciones y ediciones futuras.

59. `20260912020000_fix_coordinate_function_volatility.sql`: corrige la
    clasificación de volatilidad de las funciones de coordenadas a `STABLE`,
    de acuerdo con las rutinas JSON del catálogo que utilizan, para mantener
    limpio el lint remoto sin modificar su resultado.

60. `20260916010000_include_notification_id_in_push_claim.sql`: amplía el
    reclamo privado de entregas Push para devolver `notification_id`. El Worker
    lo incorpora al payload y la aplicación autenticada puede marcar el aviso
    exacto como leído después de abrirlo desde el sistema, siempre bajo RLS y
    sin incluir credenciales en el service worker.

Estado 2026-09-16: **aplicada en producción**. `migration list --linked`
confirma la versión local/remota `20260916010000`, el dry-run posterior indica
que la base está actualizada y `db lint --linked` no reporta errores.

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
- Su concesion publica historica queda revocada por DEV-F2.7; el navegador ya
  no puede elegir el identificador de visitante.
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

### DEV-F2.7. `dev-migrations/20260802001000_harden_contact_metrics.sql`

- **Estado 2026-08-02**: aplicada y verificada únicamente en
  `supabase_db_web`; permanece fuera de `supabase/migrations/` y de producción.
- Revoca a `anon` y `authenticated` la ejecución directa de
  `increment_contact_clicks(uuid, text, uuid)` y la concede solo a
  `service_role`.
- El Worker Fase 2 valida el payload, limita por IP y deriva mediante HMAC un
  UUID seudónimo diario a partir de IP y agente de usuario. El navegador no
  recibe el secreto ni controla la clave de deduplicación.
- Evidencia local: pruebas unitarias del cliente y handler, y matriz SQL
  `phase2_local_security: ok` con `ROLLBACK`.
- Para habilitarlo en el Worker DEV remoto se requieren los secretos
  `SUPABASE_SERVICE_ROLE_KEY` y `CONTACT_METRICS_SALT`; no usar credenciales de
  producción para cerrar esta prueba.
- **Prohibido**: no aplicar ni desplegar esta migración en producción sin
  autorización expresa posterior.

### DEV-OPS.1. `dev-migrations/20260809000000_audit_log_retention.sql`

- **Estado 2026-08-09**: aplicada y verificada únicamente en
  `supabase_db_web`; permanece fuera de `supabase/migrations/` y de producción.
- Implementa `preview_auth_audit_retention()` con corte fijo de 90 días y salida
  exclusivamente agregada: corte, conteo y rango temporal.
- Prepara `purge_auth_audit_log_entries(integer, boolean)` para lotes de 1 a
  1000; el modo simulación es obligatorio por defecto y la migración no invoca
  la rama destructiva.
- `auth_audit_retention_holds` excluye rangos temporales bajo incidente,
  retención legal o revisión regulatoria; tiene RLS y solo `service_role` puede
  gestionarla.
- `anon` y `authenticated` no pueden consultar la tabla ni ejecutar preview o
  purga. No se crea Cron ni otra invocación automática.
- Evidencia local: matriz transaccional
  `supabase/tests/audit_log_retention_local.sql` terminó con
  `audit_log_retention_local: ok`; preview y dry-run devolvieron cero elegibles
  y `deleted_count = 0`, y una consulta posterior confirmó cero fixtures QA.
- Gate: `supabase db lint --local` sin errores, lint frontend limpio, 91/91
  archivos y 359/359 pruebas, y build/PWA correcto con verificadores de
  aislamiento y sitemap de 473 URLs.
- **Prohibido**: no mover esta migración a la cadena productiva, ejecutar la
  purga con `p_dry_run = false` ni crear un Cron sin autorización posterior
  explícita y respaldo aprobado.

### DEV-F2.8. `dev-migrations/20260810000000_property_verification_and_trust_score.sql`

- **Estado 2026-09-27**: aplicada y verificada únicamente en el proyecto
  Supabase DEV mediante `supabase db query --linked --file`; todavía no forma
  parte de `supabase/migrations/` ni se ha aplicado a producción.
- Crea solicitudes de verificación documental por propiedad, con una sola
  solicitud pendiente, rutas en bucket privado `property_documents`, RLS por
  propietario y lectura administrativa AAL2.
- `submit_property_verification` valida propiedad, carpeta, objeto existente y
  tipo permitido. `review_property_verification` exige AAL2, registra actor,
  fecha y motivo de rechazo.
- Las políticas de inserción, lectura y borrado de Storage exigen además que
  `property-<uuid>` corresponda a una propiedad del usuario autenticado.
- `get_property_trust_score` es un indicador interno de 0 a 100 con factores
  explícitos: identidad verificada, documento aprobado, publicación activa y
  contacto presente. No es una certificación legal y no se concede a `anon`.
- `supabase db lint --linked --level warning` se ejecutó después de aplicar la
  migración y terminó con `No schema errors found`.
- **Pendiente**: QA E2E persistente con cuentas reales. No copiar esta
  migración a la cadena productiva.

### DEV-F2.9. `dev-migrations/20260928010000_property_duplicate_rules.sql`

- **Estado 2026-09-28**: aplicada y verificada únicamente en el proyecto
  Supabase DEV mediante `supabase db query --linked --file`; no se ha aplicado
  a producción ni se incorpora a `supabase/migrations/`.
- Crea `property_duplicate_flags`, privada para administradores AAL2, y una
  huella normalizada de título, ubicación, operación, tipo, precio y área.
- Una coincidencia exacta activa no se rechaza automáticamente: permanece en
  revisión y recibe un aviso seguro para que el moderador confirme o descarte
  el duplicado. La señal se recalcula al crear, editar o cambiar el estado.
- La prueba transaccional asociada es
  `supabase/tests/property_duplicate_rules.sql`; no deja filas persistentes.
- La prueba `supabase/tests/property_duplicate_rules.sql` pasó en DEV dentro de
  `BEGIN`/`ROLLBACK`: creó el flag y el aviso esperado, sin dejar filas QA.
- El lint local no pudo ejecutarse porque no hay PostgreSQL local levantado;
  queda pendiente repetirlo cuando el stack local esté disponible. No mover
  esta migración a la cadena productiva sin revisión de falsos positivos y
  decisión operativa.

### DEV-F2.10. `dev-migrations/20260928020000_resolve_duplicate_flags_on_review.sql`

- **Estado 2026-09-28**: aplicada y verificada únicamente en Supabase DEV
  mediante `supabase db query --linked --file`; no se ha aplicado a producción.
- Actualiza el trigger de señales para resolver flags al pasar a un estado final
  de moderación y reabrirlos cuando la propiedad vuelve a revisión.
- La prueba `supabase/tests/property_duplicate_rules.sql` comprobó ambos
  cambios dentro de una transacción y terminó con `ROLLBACK`.

### DEV-F2.11. `dev-migrations/20260928100000_property_verification_audit.sql`

- Aplicada únicamente en Supabase DEV el 2026-10-08.
- Registra envíos y decisiones de verificación documental en una bitácora
  inmutable, con lectura restringida a administradores AAL2. Conserva un motivo
  seguro y el título de la propiedad, pero nunca la ruta del archivo ni las
  notas privadas.
- Carga el historial de las solicitudes existentes para que los envíos y
  revisiones anteriores también aparezcan en la Bitácora de moderación.
- Expone la vista `admin_moderation_audit_log`, que combina estos eventos con
  cambios y eliminaciones de propiedades para la interfaz administrativa.
- La migración homóloga `migrations/20260930170000_property_verification_audit.sql`
  queda preparada para producción; no se ha aplicado ni se ha desplegado código
  a producción.

### PROD-F2.6. `migrations/20260930150000_add_kyc_evidence_retention.sql`

- **Estado 2026-09-30**: migración productiva preparada para conservar la
  evidencia KYC durante 24 horas después de aprobar o rechazar la solicitud.
- La purga es server-only: solo `service_role` puede reclamar, completar o
  liberar lotes; el Worker elimina los objetos privados y después limpia las
  rutas del registro.
- La migración no crea una purga de auditoría ni modifica la política de
  `auth.audit_log_entries`.

### PROD-F2.7. `migrations/20260930160000_add_alert_email_delivery.sql`

- **Estado 2026-09-30**: migración productiva preparada para la cola de correo
  de alertas de búsqueda.
- La cola es idempotente, limita a tres intentos y solo `service_role` puede
  reclamar entregas. El Worker usa Resend cuando existen sus secretos de
  proveedor.

## Verificación después de aplicar

### PROD-F2.8. `migrations/20261010120000_phase2_seller_badge_and_document_audit.sql`

- Preparada en `feature/phase2-production-profile`; todavía no aplicada.
- Añade la RPC pública `get_verified_seller_ids()` limitada a vendedores no
  agentes con identidad verificada y una propiedad publicada.
- Añade bitácora inmutable de envío/aprobación/rechazo documental y la integra
  en `admin_moderation_audit_log`. La revalidación de solo lectura encontró
  cero solicitudes documentales en producción antes de preparar el backfill.

### PROD-F2.9. `migrations/20261010130000_property_image_phash_duplicates.sql`

- Preparada en `feature/phase2-production-profile`; todavía no aplicada.
- Añade fingerprints y señales privadas pHash, tareas server-only de cálculo,
  estado/cobertura para administración y RPC paginada de candidatas. La lectura
  de hashes exige administrador AAL2; las escrituras quedan en `service_role`.
- La comparación solo genera candidatos para revisión humana. No publica,
  rechaza ni oculta anuncios. El backfill queda limitado a un anuncio por Cron.
- El dry-run de `supabase db push --linked` enumeró solo PROD-F2.8 y PROD-F2.9.
  No aplicar hasta que el código que usa sus objetos esté fusionado en `main`.

### Matriz pgTAP local con el carril DEV

La matriz de `supabase/tests/` combina pruebas de la cadena base con pruebas
de migraciones que permanecen exclusivamente en `supabase/dev-migrations/`.
Por eso `supabase test db --local` debe ejecutarse sobre una base local recién
reiniciada y con las migraciones DEV cargadas únicamente en ese entorno:

```powershell
cd web
supabase db reset --local --no-seed --yes
Get-ChildItem supabase/dev-migrations/*.sql |
  Sort-Object Name |
  ForEach-Object {
    Get-Content -Raw $_.FullName |
      docker exec -i supabase_db_web psql -v ON_ERROR_STOP=1 -U postgres -d postgres
  }
supabase test db --local
```

Evidencia 2026-09-29: la matriz terminó con `All tests successful`, 7 archivos
y 7 pruebas. Incluye `tests/property_verification_local.sql`, que cubre
subida autorizada, solicitud única, Trust Score, bloqueo sin AAL2 y revisión
administrativa AAL2. El reset y la carga DEV son locales; no deben sustituirse por
`supabase db reset --linked` ni ejecutarse contra DEV remoto o producción.

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

## Revalidación de cobertura RLS - 2026-09-28

- Se amplió `tests/phase2_local_security.sql` para cubrir el bloqueo de
  inserciones directas de `anon` en `contacts` y `property_reports`, además del
  aislamiento de actualización de `notifications` por `user_id`.
- Los gates de aplicación posteriores pasaron: lint, 136 archivos y 597
  pruebas, build productivo y build DEV.
- La ejecución de la matriz con `supabase test db --linked` quedó pendiente por
  falta del daemon Docker local requerido para el contenedor `pg_prove`.
- No se aplicaron migraciones, no se modificó el esquema remoto y no quedaron
  datos QA persistentes.

### DEV-F2.12. `dev-migrations/20261008010000_harden_core_table_grants.sql`

- Aplicada únicamente en Supabase DEV el 2026-10-08.
- Reduce los privilegios de `anon` y `authenticated` en `contacts`, `notifications`, `profiles`, `properties` y `property_reports` a las operaciones usadas por la aplicación. Revoca `TRUNCATE`, `TRIGGER` y `REFERENCES` de esos roles, además de escrituras directas innecesarias.
- Conserva SELECT de contactos para usuarios autenticados bajo su política RLS, SELECT/UPDATE de sus notificaciones y perfiles, lectura pública de propiedades publicadas y CRUD autenticado de propiedades bajo RLS, y SELECT/UPDATE de reportes para moderación AAL2.
- La verificación remota de `has_table_privilege` confirma que `anon` y `authenticated` ya no tienen `TRUNCATE`, `TRIGGER` ni `REFERENCES` en las cinco tablas. `service_role` no fue modificado. Producción no fue consultada ni modificada; evaluar sus ACL por separado antes de proponer su migración.


### DEV-F2.13. `dev-migrations/20261008020000_harden_sensitive_rpc_grants.sql`

- Aplicada únicamente en Supabase DEV el 2026-10-08.
- Se corrigieron permisos EXECUTE históricos explícitos que habían sobrevivido a `REVOKE FROM PUBLIC`: `anon` y `authenticated` podían invocar la RPC `claim_pending_push_deliveries`, que expone credenciales de suscripciones Push, y podían invocar `authorize_push_delivery`.
- Ambas RPC quedaron limitadas a `service_role`. Se retiró además el permiso anónimo de `get_admin_metrics`; `authenticated` conserva su llamada, protegida dentro de la función por la comprobación AAL2.
- La verificación con `has_function_privilege` confirmó que `anon` y `authenticated` no pueden ejecutar las RPC de entrega Push y que `service_role` sí; métricas quedó sin permiso anónimo.
- Producción no fue modificada. Revisar sus ACL funcionales por separado antes de cualquier promoción.

### DEV-F2.14. `dev-migrations/20261008030000_limit_public_property_view_counter.sql`

- Aplicada únicamente en Supabase DEV el 2026-10-08.
- La RPC pública `increment_property_view_count` ahora solo actualiza filas con estado `published`; antes podía cambiar el contador de vistas de borradores u ocultas si se conocía su ID.
- Conserva la ejecución de `anon` y `authenticated` para las páginas públicas. Se endureció también el `search_path` a `pg_catalog` y se calificaron los objetos de la función.
- La verificación de la definición remota confirmó el filtro de estado y que los permisos de ejecución permanecen iguales. Producción no fue modificada.

### DEV-F2.15. Revisión de regla anti-duplicados

- La revisión del código y de la función activa en DEV confirma que la coincidencia exige igualdad del fingerprint normalizado de título, ubicación, operación, tipo, precio y superficie. La consecuencia es una señal `Posible publicación duplicada` para revisión administrativa; no rechaza ni oculta automáticamente la publicación.
- Consulta agregada de DEV del 2026-10-08: cero grupos duplicados exactos y cero flags activos. No se consultaron títulos ni datos personales para esta comprobación.
- No se cambió la regla porque no hay un par representativo en DEV con el que medir falsos positivos. Se mantiene pendiente probar dos anuncios legítimos de QA, especialmente unidades distintas del mismo edificio con precio y superficie coincidentes.

### DEV-F2.16. `dev-migrations/20261008040000_harden_phase2_table_grants.sql`

- Aplicada únicamente en Supabase DEV el 2026-10-08.
- Se corrigieron privilegios efectivos excesivos en `kyc_requests`, `property_verification_requests`, `push_subscriptions`, `saved_properties` y `search_alerts`.
- Las solicitudes KYC y documentales conservan SELECT autenticado; sus mutaciones siguen por RPC con controles de propietario/AAL2. `push_subscriptions` queda accesible al Worker mediante `service_role`; el cliente no accede directo. Favoritos y alertas conservan las operaciones de cliente usadas por la app, bajo RLS.
- Verificación global posterior: ninguna tabla del esquema `public` concede `TRUNCATE`, `TRIGGER` o `REFERENCES` a `anon` ni `authenticated`. Producción no se modificó.

### DEV-F2.17. `dev-migrations/20261009010000_property_image_phash_duplicates.sql`

- Crea el inventario privado de hashes perceptuales WebP y la tabla de señales
  entre publicaciones. Solo el service role puede escribir; las fingerprints y
  coincidencias solo son legibles con sesión administrativa AAL2.
- El Worker DEV calcula un pHash de 64 bits usando la imagen de portada y una
  imagen de galería por publicación. Un máximo de 8 bits distintos produce una
  posible coincidencia para moderación; no cambia automáticamente el estado.
- Las publicaciones existentes se indexan gradualmente mediante el Cron DEV,
  una publicación por minuto. Al indexar una imagen antigua se revisan también
  publicaciones `pending_review` y `ai_approved` aún abiertas.
- Los flags se resuelven al concluir la revisión. Aplicada el 2026-10-09 solo
  al proyecto Supabase DEV `bknwerqbbysveehcdmzr`; no incluir en
  `supabase/migrations/` ni en producción. Se verificaron las tablas, RLS,
  lectura anónima denegada y RPC de escritura disponibles únicamente para
  `service_role`.

### DEV-F2.18. `dev-migrations/20261009020000_retry_empty_property_image_hashes.sql`

- Corrige el backfill incremental para volver a intentar registros activos cuyo
  último procesamiento no encontró imágenes elegibles, con enfriamiento de 15
  minutos. Los ya indexados con al menos una imagen se omiten.
- Solo se aplica a Supabase DEV. No incluir en `supabase/migrations/` ni en
  producción.

### DEV-F2.19. `dev-migrations/20261009040000_get_admin_property_image_hash_status.sql`

- RPC de solo lectura, restringida a administración autenticada con AAL2. Devuelve
  estado de procesamiento del anuncio y cobertura agregada del catálogo activo,
  sin exponer fingerprints ni datos de propietarios.
- Permite distinguir hash pendiente, fallo sin imágenes procesables y “sin
  coincidencias” con cobertura completa o parcial. Exclusiva de Supabase DEV.
### DEV-F2.20. `dev-migrations/20261009050000_admin_image_duplicate_candidates.sql`

- Añade una RPC de moderación que entrega IDs únicos de publicaciones con flags
  pHash sin resolver, ordenados y paginados desde PostgreSQL. También devuelve
  el total para el contador del filtro. La consulta usa el índice parcial por
  `property_id` y `resolved_at IS NULL`; el navegador no descarga ni recorre
  todo el catálogo.
- Requiere sesión administrativa AAL2. Aplicar solo a Supabase DEV.

### DEV-F2.21. `dev-migrations/20261010100000_verified_seller_public_badge.sql`

- Añade `get_verified_seller_ids()`, que expone únicamente IDs de perfiles no
  agentes con identidad verificada y al menos una publicación activa.
- La RPC no devuelve información KYC ni perfiles sin anuncios publicados; su
  ejecución pública solo permite decidir si la tarjeta muestra el sello.
- El Worker DEV permite explícitamente esta RPC en su proxy público; prueba de
  proxy y consulta directa anon verificadas. Worker desplegado
  `b0e3ddfe-d6cc-4f7b-a5bf-e6da2355ea9f`.
- Exclusiva de Supabase DEV. La producción no recibe esta RPC ni el distintivo.

### DEV-F2.22. `dev-migrations/20261012170000_include_verified_admin_sellers.sql`

- Incluye perfiles `admin` en `get_verified_seller_ids()` cuando KYC está
  verificado y existe al menos una propiedad publicada. Devuelve únicamente IDs;
  no expone campos ni estados KYC.
- Mantiene el EXECUTE público de la proyección mínima y no cambia RLS ni roles.
- Aplicar únicamente en Supabase DEV.

## Migraciones integrales de Fase 2 en producción — 2026-10-11

Cadena productiva aplicada al proyecto `tohjzoncoosvjbjcakdl`. Estas migraciones son las de `supabase/migrations/`; no convertir las migraciones exclusivas de `dev-migrations/` en productivas.

- `20261010120000_phase2_seller_badge_and_document_audit.sql`: crea la proyección pública mínima `get_verified_seller_ids()` y el registro inmutable de auditoría documental, integrado con `admin_moderation_audit_log`. Aplicada con `supabase db push --linked --yes`; historial remoto confirmado.
- `20261012170000_include_verified_admin_sellers.sql`: amplía `get_verified_seller_ids()` a perfiles `admin` con KYC verificado y al menos una propiedad publicada; solo devuelve IDs. Aplicada a `tohjzoncoosvjbjcakdl` el 2026-10-12. `migration list --linked` confirmó sincronía y una consulta sin exponer IDs confirmó que el anuncio productivo «Casa en venta en Holguín» califica.
- `20261010130000_property_image_phash_duplicates.sql`: crea fingerprints perceptuales privados, señales de coincidencia y RPC de estado/candidatas para moderación AAL2. Las escrituras de indexación están limitadas al Worker/service role. Aplicada con `supabase db push --linked --yes`; historial remoto confirmado.
- Verificación de permisos: `anon` no ejecuta RPCs administrativas ni lee tablas privadas. `authenticated` conserva grants SELECT sujetos a políticas RLS/AAL2; `get_verified_seller_ids()` está disponible para la consulta pública mínima.
- La sincronización observada inicialmente llegó hasta `20261010130000`; desde
  entonces se aplicaron `20261012170000` y `20261013110000` en producción. El
  workflow 38366110447 confirmó que `20261013110000` era la única migración
  pendiente, la aplicó y verificó el historial remoto.
- Antes de esta operación se intentó el workflow de respaldo de GitHub: falló por `SUPABASE_DB_PASSWORD` ausente. El panel Supabase informa que Free no incluye backups del proyecto. No se hizo dump local porque esta máquina no tiene Docker/pg_dump. Las migraciones son aditivas; para cambios destructivos futuros, disponer primero de un respaldo recuperable.

### Cobertura comparable pHash — 2026-10-13

- `20261013110000_count_only_comparable_property_images.sql` conserva la RPC
  `get_admin_property_image_hash_status(uuid[])` y su requisito AAL2, pero su
  denominador cuenta solo imágenes servidas desde el bucket productivo
  `property_images` dentro de la carpeta de su propietario.
- Las URLs externas, fotos de stock y anuncios sin imagen propia ya no inflan
  el total elegible. No se alteran filas, hashes existentes, umbral ni señales.
- Aplicada al proyecto productivo el 2026-10-13; moderación AAL2 confirmó 3/3
  publicaciones con fotos WebP propias procesables indexadas.
- El workflow manual `.github/workflows/supabase-production-phash-migration.yml`
  ejecuta un dry-run y se detiene si encuentra cualquier migración pendiente
  adicional a `20261013110000`; después registra el historial remoto con la CLI.

## Candidata de migración Fase 3 — no aplicada

- `20261103120000_agent_application_intake.sql` crea intake privado de postulaciones, documentos en bucket privado y una RPC de inserción solo para `service_role`.
- Está en la rama candidata `feature/phase3-production-main`, PR borrador #186. Se añadió un test de contrato `supabase/tests/agent_application_intake_local.sql`. No se aplicó a Supabase local persistente, DEV ni producción; tampoco se ejecutó `db push` o `migration repair`.
- 2026-11-03: aplicada correctamente en una instancia Supabase scratch temporal, junto con prerequisitos mínimos aislados. Test pgTAP de contrato **6/6 PASS** con `supabase test db --local`; se usó la red aislada con nombre estándar esperado por el runner. Se detuvo el stack y retiró su red; no se tocaron otros contenedores, ni Supabase local persistente, DEV o producción. La migración quedó validada en scratch, no aplicada remotamente. No considerar cerrados revisión AAL2, notificación, cupo provincial ni purga documental: todavía no están implementados.
- `20261103130000_agent_application_review_actions.sql` añade cambios auditados AAL2 a `reviewing`, `waitlisted` y `rejected`; el rechazo exige motivo y programa la purga para 30 días. Aprobación queda expresamente fuera hasta tener asignación transaccional del cupo provincial.
- La segunda migración solo existe en `feature/phase3-production-main`, PR borrador #186; su contrato pgTAP está en `supabase/tests/agent_application_review_local.sql`. No aplicar a local persistente, DEV ni producción hasta validar el historial de migraciones y el scratch completo.
