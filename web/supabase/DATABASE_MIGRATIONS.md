# Supabase Database Migrations

Registro operativo de las migraciones de Cubitat. La fuente de verdad son los
archivos SQL versionados en `supabase/migrations/`; este documento resume su
orden y propósito, pero no sustituye la lectura del SQL.

Última revisión documental: 2026-11-28.

## Municipio de Materiales junto a coordenadas — aplicada en producción — 2026-11-28

- `migrations/20261128120000_material_municipality_coordinates_contract.sql`
  conserva provincia y municipio al crear/editar anuncios; la RPC del
  propietario también devuelve municipio junto con coordenadas exactas para que
  Mis anuncios y el formulario de edición los restauren.
- La lectura pública y las tarjetas incorporan el municipio cuando existe; los
  anuncios históricos sin municipio conservan su provincia como ubicación.
- La ejecución E2E local autenticada verificó creación y edición con provincia,
  municipio, coordenadas y fotos privadas. El cambio de catálogo conserva el
  municipio cuando está disponible y usa la provincia como fallback histórico.
- El snapshot previo verificó 174 versiones hasta `20261126120000`, sin fuentes
  canónicas ausentes, y confirmó que esta era la única versión pendiente.
- PR #301 quedó integrado a `main` con merge commit
  `89001ba1198adbfe6d2430e2d5cf0b402af2c3c8`. Los checks requeridos
  `quality` y `database-security` pasaron; la protección de `main` no exige
  aprobación de otra persona.
- El workflow `Apply publication coordinates migration to production` terminó
  correctamente en [run 46176314587](https://github.com/BladeX1X/Cubitat/actions/runs/46176314587),
  con la confirmación autorizada `APPLY PUBLICATION COORDINATES TO PRODUCTION
  WITHOUT BACKUP`. No se creó respaldo. El postcheck confirmó la RPC,
  `SECURITY DEFINER`, `search_path`, owner checks y grants esperados.
- Después de verificar la base, el Worker `cubitat1` se desplegó al 100 % con
  versión `f80cf97d-9159-4e77-ab34-c7df4e070564`. Inicio, resultados, Servicios,
  Materiales y el formulario de publicación devolvieron HTTP 200; el bundle de
  Materiales incluyó el contrato de `municipality`.
- La publicación/edición autenticada completa aún requiere un recorrido QA en
  Producción. No usar `db push` global ni ejecutar desde un checkout local.

## Lista administrativa de agentes con plaza de administrador — candidata en PR — 2026-11-26

- `migrations/20261126120000_agent_admin_assignment_moderation_list.sql`
  amplía la respuesta de `list_active_agents_for_moderation()` con el rol e
  incluye perfiles `admin` únicamente si tienen una asignación provincial
  activa. Los perfiles administradores sin plaza permanecen fuera de la lista.
- La interfaz identifica la plaza de un administrador y no muestra la acción
  de retiro; `revoke_agent_access()` conserva su restricción al rol `agent`.
- `tests/agent_role_revocation_local.sql` cubre la forma y el alcance de la RPC.
- Hallazgo productivo verificado en lectura: había una plaza activa asociada a
  un perfil `admin`, mientras la RPC listaba solo perfiles `agent`; por eso
  Moderación mostraba un estado vacío. No se modificó ninguna fila productiva.
- Estado: candidata en PR #290; aún no aplicada. Tras integrar código y
  migración, ejecutar únicamente `Apply agent admin moderation list migration
  to production` desde `main`. El workflow exige la confirmación
  `APPLY AGENT ADMIN MODERATION LIST WITHOUT BACKUP`, verifica proyecto,
  ledger, checksum, estado inicial y dry-run de una sola versión, y comprueba
  la firma, seguridad y permisos posteriores. No crea respaldo por instrucción
  expresa del usuario. No aplicar desde el Dashboard ni con `db push` global.

## Coordenadas opcionales de Servicios y Materiales — registrada en producción — 2026-11-24

- `migrations/20261124100000_marketplace_publication_coordinates.sql` añade un
  punto opcional a ambas categorías. Un trigger separa el punto exacto a
  `home_service_private_coordinates` o `material_private_coordinates`, con RLS
  de propietario; las respuestas públicas reciben una coordenada redondeada a
  0.005 grados. Las RPC de propiedad recuperan el punto exacto para editar.
- Incluye lectura pública de la columna aproximada, inserción autenticada
  acotada por los grants existentes y reemplazo explícito de las RPC de lectura
  de propietario y actualización.
- `tests/marketplace_publication_coordinates_local.sql` valida la privacidad,
  el redondeo y la lectura exacta por propietario en Supabase local aislado.
- El ledger productivo la registra como aplicada. El snapshot de solo lectura
  del 2026-11-28 confirma las tablas privadas, RPC y triggers esperados; no se
  volvió a ejecutar ni a reparar esta migración.
- La versión `20261128120000` alineó las RPC activas de Materiales con municipio
  y coordenadas; su aplicación productiva quedó verificada el 2026-11-28 según
  la evidencia del bloque anterior.
- La rama de conciliación restauró en `migrations/20261120203809_material_listing_municipality.sql`
  la fuente canónica exacta del commit `ba3359065b838dbf4c155b78a6174f80058c5a2f`;
  ese cambio solo recupera una versión que ya está registrada en producción y
  no debe volver a ejecutarse allí. El primer preflight abortó antes del dry-run
  porque la fuente faltaba de `main`; no modificó la base. La siguiente ejecución
  valida que no haya otros huecos en el ledger antes de la migración candidata.

## Reportes de Servicios y Materiales — aplicada y verificada en producción — 2026-11-23

- `migrations/20261123100000_marketplace_listing_reports.sql` agrega una cola común de reportes de marketplace. Solo `authenticated` puede leerla y RLS limita lectura/revisión a administradores; el Worker registra envíos mediante RPC de `service_role`, valida que el anuncio siga publicado y obtiene el título desde la base de datos. Resolver o descartar no cambia automáticamente el estado del anuncio.
- Preflight en `tohjzoncoosvjbjcakdl`: 168 versiones registradas, última `20261123090000`; tablas/columnas dependientes y `is_admin_aal2()` presentes; la versión objetivo no estaba aplicada. La CLI detectó una versión remota antigua sin fuente local (`20261120203809`); se añadió solo a un manifiesto temporal como ya aplicada, sin ejecutarla. `migration list` confirmó que la única pendiente era `20261123100000`.
- Aplicada con `supabase migration up --db-url` usando un directorio temporal que contenía las fuentes locales y solo una migración pendiente; no se usó `db push` global ni `migration repair`. Sin respaldo, a solicitud explícita del usuario.
- Postcheck: ledger 169 versiones con `20261123100000` como última; tabla y ambas RPC presentes; RLS habilitada y política de administrador; `anon` sin SELECT, `authenticated` con SELECT y `service_role` con EXECUTE en la RPC confiable.
- Worker/UI desplegados como `cubitat1` versión `408b4581-fba4-4e0d-b459-e97a9e71dc36`. Gates: lint, 251 archivos/1,156 pruebas PASS/1 omitida, build `phase4-production` y verificadores PASS. `/`, `/resultados?operacion=venta`, `/servicios`, `/materiales`, `/moderar` y bundles de reporte/Moderación HTTP 200.
- Pendiente: prueba autenticada de enviar y revisar un reporte; no se insertaron reportes de prueba.

## Moneda declarada en anuncios inmobiliarios — aplicada en producción — 2026-11-17

- `migrations/20261116140000_property_price_currency.sql` agrega `price_currency`
  (USD por defecto para filas históricas, con USD/CUP/MLC), los grants de lectura,
  inserción y edición y la validación del valor.
- La migración limita comparables de valoración y alertas con rangos antiguos a
  USD, porque esos contratos comparan importes sin moneda. Las alertas sin rango
  pueden seguir coincidiendo con anuncios de cualquier moneda. Los rangos del
  catálogo se expresan en USD.
- Validación local aislada (2026-11-16): campo y funciones creados, permisos
  comprobados, CUP aceptado y EUR rechazado; las filas de prueba se revirtieron.
- Producción (2026-11-17): aplicada por el workflow dedicado en run
  [44024846650](https://github.com/BladeX1X/Cubitat/actions/runs/44024846650).
  Backup reciente, target productivo, ledger exacto de 165 versiones antes del
  cambio, preflight y dry-run pasaron; el postcheck confirmó ledger de la nueva
  versión, campo/default USD, constraint USD/CUP/MLC, índice, funciones y
  privilegios. No usar `db push` global ni `migration repair`.

Última revisión documental: 2026-11-16.

## Moneda declarada en propiedades — candidata local — 2026-11-16

- `migrations/20261116140000_property_price_currency.sql` agrega
  `properties.price_currency` con `USD` por defecto para mantener la
  interpretación de todos los anuncios existentes; permite `USD`, `CUP` y
  `MLC` y otorga solo lectura pública y escritura autenticada de esa columna.
- El importe permanece en `price_usd` por compatibilidad histórica, pero se
  interpreta exclusivamente junto a `price_currency`; no se convierte.
- Estado: validado en Supabase local aislado y aplicado/verificado en producción
  por el run [44024846650](https://github.com/BladeX1X/Cubitat/actions/runs/44024846650).
  No se aplicó en DEV alojado.

## Aplicación de migraciones de producción Fases 3/4 — 2026-11-16

El workflow controlado [43916761042](https://github.com/BladeX1X/Cubitat/actions/runs/43916761042)
aplicó las 64 migraciones revisadas desde el conjunto inmutable de fuentes del
release. La comprobación del target, huella del ledger, preflight, dry-run y
postcondiciones terminó correctamente. El guard de ausencia del bucket
`home-service-photos` se corrigió e integró mediante PR #233 antes de ejecutar
la secuencia. La restauración aislada del backup `43829229062` había superado
el replay previo. La ejecución remota se limitó al proyecto de producción
`tohjzoncoosvjbjcakdl`; no usar esta referencia para enlazar el CLI a DEV.

### Sondeo de objetos — 2026-11-16

Consulta `SELECT` solo de catálogo sobre producción: de una muestra de 26
funciones/tablas candidatas asociadas con las 57 fuentes locales no registradas,
solo aparecieron `public.property_verification_audit` y
`public.is_admin_aal2`; `public.property_contact_details` no existe. La primera
está presente sin una versión de migración correspondiente en el ledger, por lo
que hay deriva entre ledger y esquema. Es una muestra, no clasificación final ni
prueba de que el resto de SQL se deba aplicar. No se leyeron filas de usuarios ni
se ejecutó DDL/DML. La carpeta quedó desvinculada de producción al terminar.

## Ledger de Supabase producción — lectura de solo lectura — 2026-11-15

Con el proyecto `tohjzoncoosvjbjcakdl` enlazado, `supabase migration list
--linked` reportó 158 fuentes locales: 101 registradas también en el ledger
remoto, 57 solo locales y 0 versiones remotas sin fuente local en este árbol.
Las 15 versiones F3 (`20261013130000`, `20261024190000`, `20261025010000`,
`20261025020000`, `20261025140000`, `20261027100000`, `20261028193000`,
`20261103120000`–`20261103180000`, `20261106100000`) y las ocho F4
(`20261105120000`–`20261105180000`) constan en remoto.

Las 57 versiones solo locales no son una lista aprobada para ejecutar. Algunas
pueden ser overlays DEV, propuestas no aplicadas o cambios cuyo efecto ya se
introdujo manualmente. No usar `db push` global ni `migration repair`; clasificar
cada fuente contra el esquema productivo, reconciliar procedencia y dependencias,
y validar cualquier conjunto pequeño en una base aislada. El listado exacto de
IDs observados está en
[`docs/PRODUCTION_RELEASE_READINESS_2026-11-15.md`](../../docs/PRODUCTION_RELEASE_READINESS_2026-11-15.md).
No se aplicó SQL en esta comprobación.
`supabase db lint --linked --level warning` también pasó sin errores de esquema.
La carpeta release quedó desvinculada tras las consultas para evitar comandos
`--linked` accidentales contra producción.
El `db dump` schema-only no se completó (la CLI no terminó de descargar su
imagen de `pg_dump`); no se obtuvo comparación de definiciones y no se modificó
la base.

> Actualización 2026-11-16: estado histórico supersedido por el workflow
> [`Supabase Production Schema Snapshot`](https://github.com/BladeX1X/Cubitat/actions/runs/43832798096),
> que obtuvo correctamente una instantánea `pg_dump --schema-only` sin ejecutar
> SQL. El artefacto privado `cubitat-production-schema-43832798096` contiene el
> DDL y ledger remoto (101 versiones), vence el 2026-11-17 08:38 UTC y no
> contiene filas de negocio. La clasificación exhaustiva de las 63 fuentes
> locales sin registro continúa pendiente; no usar `db push` global ni
> `migration repair`.

Esta observación actualiza cualquier estado histórico inferior que describa
estas mismas versiones como pendientes o no aplicadas. Los bloques fechados se
conservan como evidencia de su momento; no usar sus instrucciones genéricas de
`db push` para el estado productivo actual.

## Migraciones Fase 4 para release coordinado — 2026-11-16 — no aplicadas

Se añadieron migraciones forward para las funciones nuevas que requiere el
paquete de código: `20261115120000_phase4_service_owner_id_insert_privilege.sql`
otorga solo la columna `id` para publicación idempotente de servicios;
`20261115130000_atomic_property_report_resolution.sql` resuelve un reporte
pendiente y pausa su propiedad dentro de una operación AAL2;
`20261116100000_phase4_saved_marketplace_listings.sql` crea favoritos privados
de Servicios y Materiales con RLS e índices únicos;
`20261116110000_phase4_home_service_photo_storage.sql` configura el bucket
privado WebP de servicios, límites y políticas de acceso a fotos;
`20261116120000_phase4_saved_marketplace_privileges.sql` elimina permisos
heredados por defecto de la tabla de favoritos y concede a `authenticated`
solo lectura, alta y baja.

Estas cinco fuentes aún no se aplicaron a producción. La migración de contacto
`20261025160000_separate_property_contact_details.sql` y sus dependientes
requieren reconciliación aparte: mueve datos privados y no debe incluirse sin
respaldo recuperable y revisión de dependencias. El historial productivo
mantiene 57 versiones locales sin clasificar; estas cuatro nuevas fuentes no
hacen seguro un `db push` global.

### Refresh directo de ledger/catálogo — 2026-11-16

La consulta de solo lectura a `supabase_migrations.schema_migrations` confirmó
101 versiones remotas. La lista CLI, ahora con las seis fuentes de promoción
incluidas en este checkout, muestra 63 fuentes locales sin registro remoto y
ninguna fuente remota sin archivo local. El total actual es 164 fuentes
canónicas; las 57 locales sin registro observadas el 2026-11-15 quedan como
conteo histórico.

Una consulta de solo lectura al catálogo confirmó que existen
`home_service_providers`, `material_listings`, `property_reports`,
`property_verification_audit`, `is_admin_aal2()` y la vista
`admin_moderation_audit_log`; existen `material-listings` y la RPC
`get_public_marketplace_contact`. No existen `property_contact_details`,
`get_public_property_contact`, `resolve_property_report`, la tabla de favoritos,
el bucket `home-service-photos` ni sus helpers. Esto confirma gaps concretos
para el bundle promocionado, pero no clasifica por completo las otras 63
fuentes. No se consultaron filas de negocio ni se ejecutó DDL/DML.

## Preparación del release productivo Fases 3/4 — 2026-11-16

- Se verificó el respaldo de producción del workflow `Supabase Backup` (run
  `43829229062`) mediante restauración aislada con PostgreSQL/Supabase 17.6.1;
  la restauración no se hizo sobre ningún proyecto alojado.
- Sobre una copia local de esa restauración se reprodujeron, en orden, las 64
  fuentes que no aparecen en el ledger remoto de 101 versiones. Las 64
  terminaron sin error y se verificaron en agregado el traslado de contactos a
  almacenamiento privado, la privacidad de fotos, los eventos de auditoría,
  los permisos de favoritos/fotos de servicios y las RPC nuevas. No se cambió
  producción.
- La ejecución productiva preparada está en
  `.github/workflows/supabase-production-phase34-migrations.yml`. Solo se podrá
  iniciar desde `main`, con frase explícita, respaldo exitoso de menos de 24
  horas, fingerprint exacto del ledger, guards agregados de datos, dry-run de
  exactamente 64 versiones y postchecks. La fuente de migraciones se fija al
  commit `47b576c2773a9b9b80127bd43b15ad6065ed9356`; el conjunto se aborta ante
  cualquier diferencia. El workflow aún requiere integrarse en `main` y
  ejecutarse; hasta entonces no marcar estas migraciones como aplicadas.
- La primera ejecución del workflow, run `43914299622`, se detuvo antes del
  dry-run. La inspección directa de solo lectura confirmó que el bucket
  `home-service-photos` no existe y no tiene objetos ni políticas; seis tablas
  `home_service_*` sí existen, como permiten las migraciones anteriores. El
  control anterior contaba filas para representar ausencia y produjo un falso
  bloqueo. La consulta ahora verifica la ausencia con `NOT EXISTS`; hay que
  integrar la corrección y repetir el preflight antes de aplicar SQL. No se
  ejecutó ninguna migración en ese intento.
- Orden planeado: integrar primero este workflow operativo y correrlo con el
  backup verificado; comprobar el ledger y los postchecks; después integrar el
  release de código PR #228 para que el Worker empiece a usar las capacidades
  nuevas. El merge de la rama operativa solo vuelve a desplegar el bundle de
  `main` que ya estaba en producción.
- No se usa `migration repair`, no se mezcla con migraciones DEV y no se
  ejecuta `db push` desde el conjunto completo del checkout. Evidencia de
  restore/replay en el informe local de preparación; la evidencia productiva
  solo se añadirá después de que el workflow termine correctamente.

## Preflight agregado de datos de contacto en producción — 2026-11-16

- El workflow manual `.github/workflows/supabase-production-schema-snapshot.yml`
  captura además el esquema, el ledger y un resumen agregado de la forma de
  `properties.contact_info` para preparar la migración que separa los datos de
  contacto. El archivo `property-contact-data-shape.txt` contiene únicamente
  conteos por categoría y límites de longitud; no exporta nombres, teléfonos,
  correos ni valores JSON de anuncios.
- El resumen permite comprobar si existen objetos con claves no contempladas,
  JSON que no sea objeto, valores de contacto no-string o valores mayores que
  los límites del destino antes de mover o limpiar información. Su ejecución es
  de solo lectura y su artefacto dura un día. No sustituye la revisión de la
  migración ni autoriza aplicarla.

## Retiro auditado de agentes — migración 2026-11-06

- `20261106100000_agent_access_revocation.sql` agrega RPCs AAL2 para consultar
  agentes activos y retirar el rol con motivo obligatorio. El cambio conserva
  cuentas/anuncios, libera la plaza y registra una bitácora inmutable en una
  transacción. La lista solo expone nombre, provincia e ID e incluye agentes
  heredados sin asignación para permitir retirarles el rol.
- pgTAP: `supabase/tests/agent_role_revocation_local.sql`.
- DEV: el esquema se aplicó por CLI y una consulta confirmó tabla y RPC, pero
  el ledger no quedó registrado; la reconciliación del historial remoto sigue
  pendiente. No ejecutar `db push` global ni `migration repair` en DEV.
- Producción: rectificación 2026-11-15 — el ledger remoto consultado ahora
  registra `20261106100000`; el estado anterior de este bloque queda supersedido.
  No repetir la migración ni ejecutar el workflow histórico
  `.github/workflows/supabase-production-agent-revocation.yml` para esta versión.
- La prueba SQL del contrato es `supabase/tests/agent_role_revocation_local.sql`;
  ejecución alojada de revocación con usuario sintético aún pendiente.

## Preparación de Fase 4 para producción — 2026-11-05

Se prepararon ocho migraciones productivas separadas, en orden:

1. `20261105120000_phase4_home_services.sql`
2. `20261105121000_phase4_services_moderation_lint.sql`
3. `20261105130000_phase4_service_reviews.sql`
4. `20261105140000_phase4_materials_marketplace.sql`
5. `20261105150000_phase4_materials_private_storage.sql`
6. `20261105160000_phase4_business_benefits.sql`
7. `20261105170000_phase4_private_marketplace_contact.sql`
8. `20261105180000_phase4_valuation.sql`

El workflow manual `.github/workflows/phase4-production-migrations.yml` prepara
una carpeta aislada con las ocho migraciones pendientes y únicamente los
archivos fuente canónicos correspondientes a versiones que ya constan en el
ledger productivo. Esto permite que Supabase CLI valide el historial sin
repararlo ni cargar migraciones locales ajenas a producción. Si falta una fuente
local de cualquier versión remota, se detiene. Se excluye
`20261103180000_add_billing_plan_catalog.sql`, catálogo informativo DEV sin
consumidores productivos. Antes de aplicar, exige que los pendientes sean
exactamente las ocho versiones anteriores, valida el esquema base requerido,
la ausencia del catálogo DEV y que no haya objetos F4 parciales. Ejecuta un
dry-run que debe enumerar solo F4; después verifica ledger, esquema, Storage y
grants de privacidad. El workflow `42009714135` terminó correctamente el
2026-11-05: aplicó las ocho versiones y confirmó las verificaciones posteriores.
Los intentos anteriores se detuvieron antes de DDL y no modificaron producción.
Evidencia: https://github.com/BladeX1X/Cubitat/actions/runs/42009714135.

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

### Catálogo informativo Fase 3 — DEV (2026-11-03)

- `20261103180000_add_billing_plan_catalog.sql` crea versiones inmutables del
  catálogo CUP aprobado y `get_active_billing_plans()` de solo lectura. No crea
  cuentas de facturación, pruebas, suscripciones, pagos ni permisos de acceso.
- La prueba `supabase/tests/billing_plan_catalog_local.sql` se añadió al job
  `database-security`; PR #190 pasó `quality` y `database-security` y se fusionó
  en `main` como `652b090`. Docker local no pudo asignar otra subred; el replay
  aislado de CI y pgTAP pasaron.
- Aplicada únicamente a DEV después de un dry-run que enumeró esta migración y
  excluyó las cinco F2 pendientes. El historial registra `20261103180000` y
  una consulta de solo lectura devuelve los cuatro precios CUP y confirma que
  `anon`, `authenticated` y `service_role` no tienen privilegios directos sobre
  la tabla. Producción intacta.

### Reconciliación DEV — fuentes encontradas en checkout de auditoría (2026-11-03)

- Se localizaron 56 fuentes correspondientes a versiones del ledger DEV en
  `D:\cubitat\web\supabase\migrations`; copias aisladas en esta rama tienen
  SHA-256 idéntico. Como el checkout de origen las tenía sin registrar en Git,
  trátalas como candidatas hasta pasar replay y cotejo de catálogo; no implica
  que estén aplicadas a DEV ni autoriza reparar su ledger.
- `20261101185000_phase4_listing_ai_moderation_claims_reconciled.sql` se encontró
  bajo `D:\cubitat\web\supabase\dev-migrations` y se conserva en
  `web/supabase/dev-migrations/`. Es DEV-only; no mover a `migrations/` ni
  incluir en una promoción productiva.
- Ningún `db push`, `migration repair`, DDL hosted o cambio de producción se
  ejecutó. Consultar `docs/RECONCILIACION_F3_DEV_2026-11-03.md` para los
  hallazgos de esquema F3 y el orden restante.

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

## F3 candidata — outbox de notificación por correo — no aplicado

- `20261103140000_agent_application_email_outbox.sql` crea intención atómica de correo al recibir una postulación y expone RPC service-role para claim/complete/retry, con máximo 3 intentos.
- `supabase/tests/agent_application_email_outbox_local.sql` comprueba permisos, RLS y trigger. GitHub Actions ejecutará el contrato después de reconstruir el esquema aislado.
- Worker DEV envía por Resend solo con `PHASE3_ENABLED=true` y configuración completa. `AGENT_APPLICATION_EMAIL_TO` es un secreto externo; no se define aquí ni se envió correo. Enlaces firmados de CV/título: 10 min, sin adjuntos.
- No aplicar a Supabase persistente, DEV o producción sin revisar el resultado de CI y reconciliar primero el ledger.

## F3 candidata — cupo provincial — no aplicado

- `20261103150000_agent_application_province_capacity.sql` guarda asignaciones activas e históricas, limita a cuatro por provincia bajo lock transaccional, exige KYC y libera la plaza al dejar de ser agente verificado.
- La aprobación devuelve `approved` o `waitlisted`; el panel administrativo anuncia el resultado.
- `supabase/tests/agent_application_province_capacity_local.sql` cubre contrato, permisos, índices y triggers; queda agregado al CI aislado.
- No aplicar a Supabase persistente, DEV ni producción antes de reconciliar perfiles agent previos con una provincia principal.

## F3 candidata — retención de documentos — no aplicada

- `20261103160000_agent_application_evidence_retention.sql` limita la purga a solicitudes aprobadas/rechazadas con el plazo vencido, reclama con `SKIP LOCKED`, limita intentos a tres y limpia las rutas privadas tras borrar los objetos.
- Revoca a `authenticated` las columnas de rutas documentales; los enlaces pasan por el Worker AAL2 con expiración corta.
- `supabase/tests/agent_application_evidence_retention_local.sql` está añadido al job `database-security`. No aplicar a Supabase persistente o hosted antes de conciliar los perfiles agent y revisar CI.

## F3 candidata — atribución de altas nuevas — no aplicada

- `20261103170000_agent_signup_referral_attribution.sql` crea un ledger privado e inmutable con una fila por cuenta nueva y reemplaza el trigger `handle_new_user()` para resolver en el servidor códigos activos de agentes/admin verificados.
- Solo el registro por correo transmite el código de referido; la metadata de rol del cliente se ignora y el perfil nace como `buyer`. OAuth, visitas, contactos y comisiones permanecen fuera de este cambio y pausados.
- `supabase/tests/agent_signup_referral_attribution_local.sql` verifica elegibilidad, seguridad del ledger, inmutabilidad y protección contra elevación de rol. El contrato se añade al job `database-security`.
- Candidata de `feature/phase3-production-main`, PR borrador #186. No aplicar a Supabase local persistente, DEV ni producción; reconciliar primero historial de migraciones y obtener CI verde.

## Perfil Worker F3 preparado — no activado (2026-11-03)

- El Worker productivo incluye rutas de postulación/documentos y tareas programadas de correo/purga detrás de `PHASE3_ENABLED`.
- `web/wrangler.jsonc` fija `PHASE3_ENABLED=false`; esto no sustituye ni crea objetos SQL/Storage.
- `ensure_agent_referral_link()` solo se añadió a la allowlist autenticada. La migración de atribución sigue candidata y el esquema hosted DEV permanece pendiente de reconciliación; no habilitar el Worker ni desplegar el bundle F3 antes de confirmar el esquema y permisos reales.

## Actualización de lectura hosted DEV — 2026-11-03

La lectura más reciente encontró 11 versiones locales sin marca remota y 58 versiones remotas sin fuente en este checkout. No asumir que el diff del listado significa que cada migración local carece de esquema: el detalle de los seis objetos F3 comprobados y la secuencia segura de reconciliación está en `docs/RECONCILIACION_F3_DEV_2026-11-03.md`. No usar `db push` ni `migration repair` aún.

### Integración del candidato F3 en main — 2026-11-03

PR #186 fusionada como `99e315369c3d1f69f58a699a9d1a635971bbb4ef`. Los contratos SQL y replay completo de CI pasan en entorno aislado. Esto valida la cadena versionada, no aplica ni reconcilia cambios en DEV/producción. El Worker conserva `PHASE3_ENABLED=false`. Ver `docs/RECONCILIACION_F3_DEV_2026-11-03.md`; no ejecutar `db push` global ni `migration repair` hasta cerrar dependencias.

### Inventario F2 DEV sin registrar — lectura 2026-11-03

Los cinco archivos F2 locales y sus estados de catálogo/ACL están detallados en `docs/RECONCILIACION_F3_DEV_2026-11-03.md`. Dos cambios pHash están funcionalmente presentes sin fila de ledger; la tabla de auditoría también está presente pero falta `get_verified_seller_ids()`; el bypass temporal MFA no existe en DEV. No aplicar ni reparar versiones para cuadrar el listado. Producción no fue consultada.

### Rectificación operativa F3 en DEV — 2026-11-03

El estado anterior describe la revisión previa al despliegue controlado y queda supersedido para DEV. Se aplicaron las seis migraciones F3 `20261103120000`–`20261103170000` al proyecto DEV `bknwerqbbysveehcdmzr`, mediante un directorio temporal de migraciones que mostró solo esas seis en dry-run. La fuente remota DEV-only `20261101185000` se incluyó en dicho directorio para satisfacer la reconciliación del ledger. La lista remota confirmó después las seis versiones registradas. Las cinco migraciones F2 que continúan solo locales fueron excluidas y siguen sin aplicar; no se usó `migration repair`. Producción no fue objetivo del comando.

El catálogo remoto confirmó las tablas de postulaciones, eventos, outbox y cupos, el bucket privado, y las RPC de intake, revisión, entrega y purga. Se desplegó a continuación Worker DEV `26fa86b6-9b91-4c96-98f1-c39aedaf68de` con la bandera de runtime habilitada por override de CLI; la configuración versionada conserva `PHASE3_ENABLED=false`. Sin sesión QA autenticada no se completó una postulación ni el ciclo de revisión. No se cargaron archivos ni se enviaron correos. Producción permanece intacta.

## F3 productiva — estado verificado 2026-11-04

La nota anterior de migraciones F3 candidatas/no aplicadas describe el estado previo y queda supersedida para la base productiva por evidencia del dashboard compartida por el propietario: las versiones `20261103120000`–`20261103170000` aparecen registradas, y existen las tablas, funciones RPC y bucket privado de solicitudes. El despliegue del Worker no aplicó migraciones ni modificó el esquema. `PHASE3_ENABLED=true` quedó activo en Worker `cubitat1`; para evidencia y pendientes de QA ver la sección de rectificación en `docs/DESPLIEGUE_COMPLETO.md`.

### Rectificación por verificación directa del ledger productivo — 2026-11-07

La ejecución de solo lectura del workflow controlado de retiro de agentes contra `tohjzoncoosvjbjcakdl` contradijo el estado documentado arriba. La base productiva registra únicamente las migraciones F3 `20261025210000`, `20261025220000` y `20261026200000` de la cadena revisada. No registra `20261013130000`, las migraciones intermedias de leads/referidos, ni `20261103120000`–`20261103180000` o `20261106100000`. El catálogo tampoco encontró tablas públicas `agent_*` ni funciones base de referidos, postulaciones o revocación. Sí aparecen las ocho migraciones Phase 4 `20261105120000`–`20261105180000`; los prerequisitos `profiles`, `is_admin_aal2()` y los roles base existen.

El diagnóstico no ejecutó `db push` ni aplicó SQL. Por tanto, la nota del 2026-11-04 queda supersedida por esta lectura directa. `web/wrangler.jsonc` mantiene `PHASE3_ENABLED=true` para `cubitat1`, pero el esquema productivo aún no cubre los módulos F3; los flujos autenticados que dependen de esas tablas/RPC pueden fallar. El nuevo workflow `.github/workflows/supabase-production-phase3-migrations.yml` prepara una promoción aislada con lista explícita, requisitos de esquema, dry-run exacto y verificaciones posteriores. No activar pruebas funcionales hasta que la migración y el bundle de Worker estén desplegados.

### Rectificación — migraciones F3 aplicadas en producción 2026-11-07

El estado de solo lectura inmediatamente anterior queda supersedido. El workflow
controlado [42364846320](https://github.com/BladeX1X/Cubitat/actions/runs/42364846320)
completó en `main` el preflight, dry-run exacto, aplicación y verificación de
esquema/permisos para las 15 migraciones revisadas:
`20261013130000`, `20261024190000`, `20261025010000`, `20261025020000`,
`20261025140000`, `20261027100000`, `20261028193000`, `20261103120000`–
`20261103180000` y `20261106100000`. La verificación incluyó ledger, tablas y
RPC requeridas, bucket privado de documentos y grants críticos. No usar
`migration repair` ni repetir `db push` para esta cadena sin un nuevo
diagnóstico. El Worker de aplicación también se publicó después; el QA
autenticado de envío, revisión, documentos y correo sigue siendo necesario
antes de marcar F3 funcionalmente cerrada.

## Captura de esquema productivo para conciliación

El workflow manual `.github/workflows/supabase-production-schema-snapshot.yml`
se ejecuta desde `main` y genera un volcado solo de esquema, el ledger remoto y
las fuentes SQL de `release/phase34-production-20261115`. Comprueba que la URI
corresponda al proyecto `tohjzoncoosvjbjcakdl`, no ejecuta SQL de migración y
retiene el artefacto privado durante un día. No incluye filas de las tablas de
negocio.

Usar la captura para comparar objetos, grants, políticas, funciones, triggers y
versiones reales antes de preparar la lista exacta de SQL forward. No es un
respaldo ni una prueba de restauración; no habilita `db push` global ni
`migration repair`.

### Revalidación de CI del release — 2026-11-16

GitHub Actions run [43841317949](https://github.com/BladeX1X/Cubitat/actions/runs/43841317949) terminó `quality` y `database-security` en PASS, incluyendo pruebas, lint, build y perfiles productivos F2/F3/F4. El check externo Cloudflare Workers Builds continúa en FAILURE para el build `78d47b38-11ff-4cde-95d8-01f05337b546`; GitHub no incluye la causa. No se desplegó Worker ni se aplicó DDL/DML productivo.

La clasificación de las 63 fuentes del árbol local sin ledger remoto sigue siendo pendiente. La inspección del snapshot schema-only confirma deriva (objetos sin ledger y objetos requeridos ausentes); las coincidencias por nombre de objeto en SQL no determinan por sí solas qué migraciones se aplicaron. No ejecutar `db push` global ni `migration repair`. El replay aislado no se ha ejecutado en este equipo: Docker Desktop Engine no está disponible.

CI final del commit `f44d5f4` — run [43842815133](https://github.com/BladeX1X/Cubitat/actions/runs/43842815133): `quality` y `database-security` PASS, con perfiles F2/F3/F4 PASS. No cambia la necesidad de reconciliar las 63 migraciones no registradas ni habilita una aplicación global.

### Hallazgo del replay schema-only — privilegios de Favoritos — 2026-11-16

Un replay aislado sobre el snapshot schema-only de producción [43839389470](https://github.com/BladeX1X/Cubitat/actions/runs/43839389470) ejecutó sin error 11 fuentes seleccionadas del flujo release. La base de replay no contenía filas de negocio. El control SQL detectó que los ACL por defecto del esquema daban `UPDATE` sobre `saved_marketplace_listings` a `authenticated` y lectura a `service_role`, pese a que `20261116100000` solo declara `SELECT/INSERT/DELETE`.

La migración forward `20261116120000_phase4_saved_marketplace_privileges.sql` limpia explícitamente los grants a `PUBLIC`, `anon`, `authenticated` y `service_role`, y luego concede únicamente `SELECT`, `INSERT`, `DELETE` a `authenticated`. Tras la corrección, `phase4_marketplace_rollout_local.sql` pasó 14/14 y la consulta de ACL confirmó que `anon` no lee, `authenticated` no actualiza y `service_role` no lee. La prueba de contacto con filas sintéticas dentro de transacción también pasó y terminó en rollback.

El replay prueba solo el subconjunto seleccionado; no aprueba las otras fuentes pendientes. El inventario actualizado es 165 fuentes locales, 101 en ledger, 64 locales sin registro y cero remotas sin fuente. No aplicar `db push` global ni `migration repair`; producción sigue sin escritura.

### Estado actualizado del replay de release — 2026-11-16

La nota anterior sobre replay limitado a 11 fuentes queda supersedida: el commit
`597f61b0d5cf0d06cd6ea7c3af708369aeaf0d6b` fue reproducido en un Postgres
local aislado, partiendo del schema-only productivo, y las 64 fuentes locales
sin fila en ledger terminaron sin error SQL. El replay no incluyó filas de
negocio. La prueba de catálogo Fase 4 obtuvo 14/14; la prueba transaccional de
contacto terminó con rollback.

El replay permite continuar el análisis de sintaxis y dependencias, pero no
convierte las 64 fuentes en una allowlist para producción. Se identificaron
DML ejecutado en aplicación para auditoría histórica de verificaciones,
retención KYC, migración de contactos, cambio de visibilidad del bucket
`property_images` y backfill temporal de tombstones push. Antes de aplicarlos se
requieren conteos agregados, guardas y postchecks sobre el estado productivo
actual, además de reconciliar objetos que existen sin registro de migración.

Run CI [43846726074](https://github.com/BladeX1X/Cubitat/actions/runs/43846726074)
terminó `quality` y `database-security` PASS, incluidos perfiles F2/F3/F4.
Cloudflare Workers Builds falló para `4d44a71c-e7fa-4517-8172-09d4a7734ad7`
sin log de causa visible desde GitHub. No desplegar ni ejecutar `db push` global
hasta resolver ese check y cerrar la allowlist incremental.

El sondeo de datos agregado preparado en
`supabase/preflight/phase34-production-data-preflight.sql` devuelve solamente
conteos para auditoría, retención KYC, forma del JSON de contacto, bucket de
fotos y cantidad de filas de push. Se comprobó sintácticamente en una instancia
local mínima y después contra una restauración local del schema-only productivo;
las 16 filas de salida se pudieron calcular con las columnas reales. Sus ceros
son consecuencia de que el snapshot no incluye datos de negocio y no representan
conteos productivos. Aún no se ejecutó en producción. Cualquier valor fuera de
los criterios descritos debe investigarse antes de ejecutar la migración
asociada.

La CLI del entorno de trabajo no tiene `projects_read` (403). No se enlazó el
proyecto ni se intentó escritura remota; falta ejecutar el sondeo mediante un
canal de solo lectura con el secreto de conexión de producción y revisar los
conteos resultantes.

Comparación posterior del catálogo en replay local sin filas: la cadena de 64
fuentes agrega tres tablas y reemplaza políticas RLS y privilegios en módulos
de propiedades, perfiles, KYC, contactos, push, notificaciones, alertas y
Storage (44 políticas añadidas, 45 retiradas/reemplazadas y 318 líneas de
grants/revokes en el diff). Esto confirma que el release debe revisar y probar
la cadena completa de hardening; seleccionar solo las últimas migraciones
dejaría dependencias y controles de seguridad fuera del bundle.

Con las 64 fuentes aplicadas, `phase4_marketplace_rollout_local.sql` pasó
14/14 y `public_property_contact_privileges_local.sql` terminó con rollback.
No se ejecutó ninguna consulta de escritura en producción.


## Favoritos SVC/MAT — verificación read-only de producción — 2026-11-23

La consulta de producción confirmó que public.saved_marketplace_listings existe, las versiones 20261116100000 y 20261116120000 están registradas, `authenticated` tiene SELECT/INSERT/DELETE, `anon` y service_role carecen de SELECT, y hay tres políticas RLS. No se ejecutó DDL/DML. El ledger remoto contiene 167 versiones y no coincide con la huella de 101 que esperaba el paquete Phase 3/4; no repetir ese paquete ni aplicar SQL de favoritos duplicado hasta reconciliar el drift. Falta QA autenticado desde la UI. Evidencia: docs/FAVORITES_PRODUCTION_STATE_2026-11-23.md.


## 2026-11-23 — Favoritos SVC/MAT

Read-only production inspection confirmed `saved_marketplace_listings`, versions `20261116100000` and `20261116120000`, authenticated SELECT/INSERT/DELETE grants, and three owner RLS policies. The failure was the Worker allowlist; production Worker `bf754180-1310-4077-905c-65e70dbb0f3c` now includes the table. An invalid-JWT POST was rejected downstream with HTTP 401 and made no data change. The production migration ledger has 167 versions and still differs from the old workflow baseline. Do not repeat favorites DDL or the stale migration bundle. Authenticated UI QA remains pending.
## MFA administrativo — aplicada y verificada en producción — 2026-11-23

`20261123090000_disable_admin_mfa_requirement.sql` cambia `public.is_admin_aal2()` para delegar en `public.is_admin()`. El rol `admin` se conserva en RPC/RLS; se retira el requisito AAL2. Los factores TOTP existentes no se eliminan.

Preflight con la conexión directa: ledger remoto de 167 versiones; se usó el conjunto completo de fuentes del release `ba3359065b838dbf4c155b78a6174f80058c5a2f` y el dry-run enumeró únicamente `20261123090000`. Aplicada sin respaldo a solicitud expresa del usuario. Postcheck: ledger de 168, versión registrada y definición confirmada. La CLI reportó un aviso no bloqueante al exportar caché pg-delta por un certificado auxiliar ausente; la aplicación terminó correctamente y las consultas posteriores verificaron el resultado.

Frontend/Worker `cubitat1` desplegado en `0d79f4a9-9947-4b20-8eb1-91b3d887cf2a` al 100%; gates de lint, pruebas y build Fase 4 aprobados. Smoke HTTP de Inicio, Moderar y Recuperación: 200. QA autenticado AAL1 y revisión de requisito Supabase Auth independiente quedan pendientes. La credencial temporal compartida en el chat debe rotarse y actualizar el secreto de despliegue; no almacenarla en el repositorio.


## Source reconciliation — 2026-11-24

Production preflight for the publication coordinates release found recorded version 20261124090000 without its canonical migration source in main. Restored the historical source 20261124090000_disable_admin_aal2_requirement.sql from the local production-release workspace as a ledger reconciliation only. Production already records this version; this source is staged for Supabase CLI consistency and must not be re-applied. The migration preflight stopped before dry-run or DDL. Resume only after CI and exact-ledger verification.


## Candidata local — métricas de captación de agente — 2026-11-25

La migración `20261125100000_agent_acquisition_metrics.sql` depende del ledger de altas `20261103170000_agent_signup_referral_attribution.sql`. Agrega `get_own_agent_acquisition_metrics()`, una RPC `SECURITY DEFINER` con `search_path` fijo que exige `auth.uid()` y perfil agent/admin verificado y devuelve solo un conteo por agente. `anon`, `service_role` y clientes autenticados no tienen acceso directo al ledger; solo `authenticated` puede llamar la función. La cifra de pagadores se devuelve como `NULL` y la disponibilidad como `false` porque el sistema no tiene procesamiento de pagos de suscripción. No aplicar a una base hosted hasta conciliar el ledger y seguir el workflow productivo vigente; no ejecutar `db push` global ni reparar migraciones.

Contrato de seguridad/aislamiento: `supabase/tests/agent_acquisition_metrics_local.sql`. La acción `database-security` debe ejecutar ese contrato después de replay de migraciones. La función se añade a la allowlist autenticada de `worker-phase2-production.ts`.

Tras integrar y aprobar los checks requeridos, aplicar únicamente mediante el workflow manual `Apply agent acquisition metrics migration to production`, indicando la frase de confirmación `APPLY AGENT ACQUISITION METRICS WITHOUT BACKUP` conforme a la instrucción expresa del usuario. El workflow valida el proyecto esperado, el ledger remoto, todas las fuentes canónicas registradas, el prerequisito de atribución, el estado previo de esquema, un dry-run de una sola versión y privilegios posteriores. No ejecutar `db push` desde la estación local ni incluir otras migraciones.

## Atribución OAuth Google — candidata local — 2026-11-25

`20261125110000_oauth_agent_signup_attribution.sql` agrega `attribute_own_oauth_agent_signup(text)`. La función solo permite que la sesión autenticada atribuya su propia cuenta `buyer` creada originalmente por Google en los últimos 15 minutos; exige un código válido de un enlace activo cuyo agente tenga KYC verificado y rechaza autoatribución. Inserta en el ledger existente e inmutable, sin exponerlo a clientes. La allowlist autenticada del Worker es necesaria para que PostgREST ejecute la RPC. La captura del código sigue en `sessionStorage` de la misma pestaña hasta el callback OAuth.

Contrato pgTAP: `supabase/tests/oauth_agent_signup_attribution_local.sql` (10 comprobaciones). Se ejecutó en Supabase local dentro de una transacción y terminó con `ROLLBACK`; no se modificó una base hosted. La migración queda pendiente de CI, integración y aplicación controlada en producción. El workflow dedicado comprueba el target exacto, el ledger reconciliado, la fuente canónica de cada versión, que esta sea la única migración pendiente, el hash fijado y los grants/RLS antes y después. No genera respaldo.

## Atribución OAuth Google — aplicación y producción — 2026-11-26

`20261125110000_oauth_agent_signup_attribution.sql` quedó integrada y aplicada a producción mediante el workflow dedicado `Apply Google referral attribution migration to production`, sin respaldo conforme a la solicitud explícita del usuario. El preflight confirmó las migraciones canónicas y el único cambio candidato; dry-run de una sola migración y postcheck de función/grants PASS. PR #288 en `main`: `bfa5e75b6025f4faa148f8a1630df136fe880aa0`. Worker `cubitat1` versión `250879f7-8306-4281-96fc-65e6d84c2616` al 100 %. Bundles principal y callback publicados responden HTTP 200 y contienen el seguimiento del código y la llamada RPC. Cuenta buyer Google creada hace menos de 15 minutos y agente verificado siguen siendo requisitos. QA autenticado real de alta nueva y login existente pendiente; no crear usuarios productivos solo para probar.

## 2026-11-28 — Reparación del snapshot de esquema productivo

La ejecución de solo lectura `Supabase Production Schema Snapshot` falló porque intentó obtener SQL de `release/phase34-production-20261115`, rama que ya no existe. El workflow se actualizó en una rama de corrección para tomar las migraciones canónicas del mismo `main` que contiene el workflow. No se accedió a la base ni se modificó producción en esta reparación. Después de integrar el cambio, volver a ejecutar el snapshot, comprobar el ledger/esquema actual y recién entonces preparar el preflight aislado para `20261128120000_material_municipality_coordinates_contract.sql`.
