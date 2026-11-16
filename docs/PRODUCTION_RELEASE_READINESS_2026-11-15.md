# Preparación de release de producción — 2026-11-15

## Estado

**No listo para desplegar.** Este documento prepara la promoción de los cambios
posteriores al último release de Fases 1–4. No autoriza ni ejecuta despliegues,
DDL, cambios de datos, secretos ni configuración hosted.

## Fuente limpia

- Rama de trabajo: `release/phase34-production-20261115`.
- Base: `origin/main`, commit `59cf3b41f7918970cfe5686e66262a7c141f1399`.
- El checkout `D:\cubitat` está en otra rama, 183 commits detrás de
  `origin/main`, 655 entradas de estado Git y miles de rutas sin seguimiento.
  El checkout DEV también tiene commits/cambios propios. Ninguno se copia en
  bloque como fuente de producción; se deben seleccionar cambios revisados y
  trasladarlos como commits identificables.

## Fases y esquema que ya constan como desplegados

Los registros de `docs/DESPLIEGUE_COMPLETO.md` indican que la producción ya
recibió Fase 3 el 2026-11-07 y Fase 4 el 2026-11-05. El workflow histórico de
Fase 4 aplicó exactamente `20261105120000`–`20261105180000`; el workflow Fase 3
reportó estas 15 versiones el 2026-11-07: `20261013130000`, `20261024190000`,
`20261025010000`, `20261025020000`, `20261025140000`, `20261027100000`,
`20261028193000`, `20261103120000`–`20261103180000` y `20261106100000`.
Lectura de solo lectura del ledger productivo realizada el 2026-11-15 con
`supabase migration list --linked` y ref `tohjzoncoosvjbjcakdl`: de las 158
fuentes SQL del baseline, 101 coinciden con una versión remota y 57 aparecen
solo localmente; no hubo versiones remotas sin fuente local en esta rama. Las
15 migraciones F3 y ocho F4 citadas arriba están registradas. Los 57 IDs abajo
son **no registrados**, no una autorización para aplicarlos en bloque: hay que
clasificar variantes DEV-only, reconciliar efectos ya aplicados manualmente,
comprobar dependencias y probar el conjunto incremental en una base aislada.
`supabase db lint --linked --level warning` terminó sin errores de esquema.
Al terminar, se desvinculó esta carpeta del proyecto productivo para evitar que
futuros comandos `--linked` apunten allí por accidente.
El volcado schema-only no se completó porque la CLI quedó descargando su imagen
de `pg_dump`; se detuvo antes de crear un volcado utilizable. Por tanto, aún no
se compararon los efectos de las 57 fuentes con las definiciones actuales.

> Estado histórico supersedido por la instantánea de solo lectura del
> 2026-11-16, documentada al final de este archivo. La instantánea sí se obtuvo
> después mediante el workflow dedicado; no se aplicó SQL.

### Sondeo de catálogo productivo — 2026-11-16

Tras volver a autenticar la CLI se hizo una consulta SQL `SELECT` contra el
catálogo PostgreSQL, sin leer filas de negocio ni modificar el esquema. Entre
29 nombres representativos de funciones/tablas extraídos de las migraciones
locales, el catálogo encontró `public.property_verification_audit` y la función
`public.is_admin_aal2`; los otros 27 nombres de esa muestra no aparecieron.
También se confirmó que `public.property_contact_details` no existe. Esto
corrobora que al menos una fuente sin fila de ledger tiene efecto en producción
y que la separación privada de contactos no está presente con ese nombre. No
permite concluir si objetos ausentes son seguros de aplicar: hay migraciones
superpuestas, dependencias y cambios de grants/policies cuyo estado requiere una
comparación completa. La lista de 29 es una sonda representativa, no un
inventario exhaustivo. Se desvinculó la carpeta release al terminar.

## Migraciones para la siguiente promoción

1. **No usar `supabase db push` global ni `migration repair`.** La lectura
   actual encontró 57 versiones locales no registradas; primero comparar cada
   fuente y su efecto con el esquema productivo, y acordar conjuntos pequeños
   aprobados. No marcar versiones aplicadas solo para silenciarlas.
2. `20261111180000_get_public_property_contact.sql` está en el checkout de
   release y no figura en el ledger ni en el esquema productivo. Si se
   decide incluir el cambio de Contactar, conservarla como migración forward,
   revisar su contrato Worker/service-role y añadir pruebas/postchecks al
   procedimiento productivo. No modificar migraciones históricas.
3. El checkout DEV contiene más SQL de Servicios/Materiales y galerías que aún
   requiere revisión contra el esquema y el ledger de producción. No trasladar
   los overlays marcados DEV-only, cambios retrospectivos ni migraciones con
   procedencia/ID no reconciliados.
4. La fuente canónica de favoritos SVC/MAT es
   `20261116100000_phase4_saved_marketplace_listings.sql`; no está registrada
   ni presente en el esquema productivo. Validarla con el conjunto incremental
   antes de anunciar favoritos como parte del release.
5. Crear un workflow de migración limitado al conjunto exacto aprobado para
   esta promoción, con comprobación del ref productivo, dry-run, abort si el
   ledger/esquema es parcial o inesperado, aplicación y postchecks de grants,
   RLS, tablas y Storage. El workflow histórico `phase4-production-migrations`
   espera un esquema F4 prístino y no es una vía para cambios incrementales.

### Versiones locales sin registro remoto observadas

```text
20260930170000 20261022140000 20261023170000 20261023190000 20261023200000
20261024120000 20261024130000 20261024140000 20261024150000 20261024170000
20261024180000 20261024220000 20261024230000 20261024235000 20261024235950
20261024235955 20261024235957 20261024235958 20261024235959 20261025000000
20261025030000 20261025040000 20261025050000 20261025060000 20261025070000
20261025100000 20261025110000 20261025120000 20261025130000 20261025150000
20261025160000 20261025170000 20261025180000 20261025190000 20261025200000
20261025230000 20261025235900 20261025250000 20261026210000 20261026220000
20261026231000 20261026232000 20261026233000 20261026234000 20261027120000
20261027223000 20261028170000 20261028180000 20261028190000 20261028200000
20261029100000 20261029120000 20261029130000 20261029140000 20261030100000
20261030150000 20261030160000
```
6. El intento de enlace read-only al proyecto productivo fue rechazado por el
   CLI: falta `api_gateway_keys_read`. No se enlazó esta carpeta ni se consultó
   o escribió la base. Habilitar ese permiso de lectura de API Keys (sin
   compartir el token) antes de continuar el preflight.

## Código y verificación

- No se integraron aún cambios de DEV ni del checkout mezclado a la rama limpia.
- En esta rama limpia: `npm ci` terminó; `npm run lint` pasó.
- Suite del baseline: 196 archivos, 881 PASS y 1 SKIP.
- El primer `build:phase4-production:ci` quedó bloqueado por falta de clave.
  Tras autenticar la CLI, se obtuvo la clave pública de producción sin imprimirla
  y se completó `npm run build:phase4-production`: PASS, sitemap dinámico de
  446 URLs y guards de fases 2, 3, 4, Worker y secretos PASS. No se copió
  ninguna clave al repo. Advertencia pendiente: chunk MapLibre de ~1.08 MB y
  avisos de configuración Vite/PWA.
- Tras seleccionar e integrar los cambios, repetir lint, suite, build completo
  `phase4-production`, guards de bundles, pruebas E2E relevantes y revisión del
  diff desde esta rama. El build `:ci` usa sitemap estático y no reemplaza el
  build de release con sitemap dinámico.

## Bloqueos de aceptación antes de publicar

- QA autenticado de propietario para publicar/editar y confirmar persistencia,
  orden y lectura de varias fotos reales; el estado DEV reciente todavía marca
  pendiente esa prueba propietaria.
- Verificar el flujo de contacto y consulta con teléfono/WhatsApp en las rutas
  de Comprar, Servicios y Materiales tras integrar la RPC y su gateway.
- Confirmar mapas y fotos en la versión candidata y revisar carga móvil.
- Completar QA autenticado de postulación/administración F3 y de reseñas,
  moderación y contacto F4 que los registros de producción dejan pendientes.
- Clasificar y probar las 57 versiones no registradas, y confirmar configuración
  de Worker, cron, Auth, dominios y secretos sin copiar valores privados al repo.
- La instantánea de esquema ya se obtuvo; completar la clasificación de las 63
  fuentes sin registro comparando grants, policies, funciones, triggers,
  vistas, tablas, dependencias y efectos sobre datos antes de aprobar cualquier
  conjunto.
- Seguir el checklist de contenido/legal y backup/restore; no marcar como
  verificados elementos que solo pasaron en local o DEV.

## Decisión de release

El paquete no está listo para producción hasta que exista una lista cerrada de
commits de código, se clasifiquen y prueben las 57 versiones sin registro, se
reconcilien efectos ya aplicados manualmente, y se complete QA autenticado de
los flujos afectados. El build de código base ya pasó, pero no incluye fixes
recientes de DEV/local.
Después de completar esos puntos, crear PR de release y revisión final; el
despliegue y la aplicación de SQL son pasos posteriores y separados.

## Actualización de avance — 2026-11-16

Se trasladaron de forma selectiva a esta rama limpia los cambios de producto
Fase 4 y se añadieron cuatro migraciones forward para la publicación de
servicios, resolución de reportes, favoritos SVC/MAT y Storage de fotos de
servicios. Sus contratos de migración se agregaron a la suite y a CI. No se
aplicó SQL ni se desplegó código en producción.

La última lectura del ledger detectó 57 migraciones locales no registradas y
una deriva entre ledger y esquema. El respaldo automático de GitHub no pudo
obtener `SUPABASE_DB_PASSWORD`; Supabase Free no ofrece backups administrados,
y el intento de dump de esquema no terminó. Por eso no se debe ejecutar aún una
migración productiva con movimiento de datos, ni promover un bundle cuya
RPC/Storage dependa de ella. El principal bloqueo es recuperar una fuente de
respaldo verificable y reconciliar el ledger completo con el esquema.

Validación actualizada: `npm run lint` pasó; `npm run test:run --
--maxWorkers=2` pasó con 238 archivos, 1,088 pruebas correctas y 1 omitida.
`supabase db reset` reprodujo todas las migraciones de producción hasta las
cuatro nuevas; el contrato pgTAP Fase 4 obtuvo 14/14. `npm run build` y
`npm run build:phase4-production` pasaron; el último generó sitemap dinámico de
446 URLs y pasó guards F2/F3/F4/Worker/secretos. El chunk MapLibre de ~1.08 MB
y advertencias Vite/PWA siguen siendo avisos no bloqueantes. Se detuvo el stack
Supabase temporal dedicado a esta prueba; no se tocaron otros proyectos.

Playwright E2E local: 30/30 PASS para publicación/edición de propiedad con
fotos, flujos de contacto/consulta, favoritos, publicación de Servicios y
Materiales con varias fotos, mapas móviles y coordenadas. La primera ejecución
halló un patrón de URL incorrecto en el mock de la prueba de descarga privada;
se actualizó para cubrir el endpoint autenticado y el reintento automático de
Storage, y luego pasó el grupo completo. Estas pruebas interceptan backend y
no sustituyen la validación autenticada contra los servicios productivos.

Estos resultados verifican el código y replay local, no la base ni el sitio de
producción. No se ejecutó despliegue ni SQL remoto.

### Refresh read-only productivo — 2026-11-16

El query de catálogo por Management API confirmó 101 filas en el ledger remoto.
Con seis fuentes de promoción nuevas, la lista CLI muestra ahora 63 fuentes
locales no registradas y ninguna fuente remota sin archivo local. La sonda
directa confirma tablas base SVC/MAT/reportes y `is_admin_aal2()` presentes,
así como `get_public_marketplace_contact` y el bucket privado `material-listings`.
Faltan `property_contact_details`, `get_public_property_contact`,
`resolve_property_report`, `saved_marketplace_listings`, el bucket
`home-service-photos` y los helpers de galería de Servicios. Estas ausencias
explican por qué el bundle no se debe desplegar todavía sin una secuencia SQL
incremental reconciliada. Las consultas fueron exclusivamente a catálogo/ledger;
no se leyeron filas de negocio ni se ejecutó SQL de escritura. La rama quedó
desvinculada de producción tras la lectura.

### Instantánea completa schema-only — 2026-11-16

El workflow manual [`Supabase Production Schema Snapshot`](https://github.com/BladeX1X/Cubitat/actions/runs/43832798096)
terminó correctamente en `main` (43 s). Verificó el destino por referencia del
proyecto, obtuvo `pg_dump --schema-only`, leyó el ledger remoto y empaquetó las
fuentes SQL de la rama release como datos. El artefacto privado
`cubitat-production-schema-43832798096` mide 261,357 bytes y vence el
2026-11-17 08:38 UTC. No incluye filas de negocio; el workflow no ejecuta SQL.

Comparación reproducible del archivo de versiones: 101 versiones remotas, 164
fuentes locales y 63 fuentes sin registro; cero versiones remotas sin fuente
local. La inspección del DDL confirma objetos base de Fase 4 y auditoría ya
presentes, pero siguen ausentes `property_contact_details`,
`get_public_property_contact`, `resolve_property_report`,
`saved_marketplace_listings` y el bucket `home-service-photos`. Por tanto, el
bundle actual aún depende de cambios de esquema pendientes. El estado no se
resuelve ejecutando las 63 fuentes a ciegas: al menos un objeto existe sin su
correspondiente fila de ledger y varios objetos requeridos sí faltan.

No se aplicó migración, no se leyó contenido de anuncios ni se restauró el
respaldo. La clasificación objeto por objeto de las 63 fuentes, el análisis de
duplicados/overlays históricos, las pruebas de un conjunto forward aislado y la
recuperación de respaldo verificable siguen pendientes. **Decisión:** no
desplegar aún el bundle ni ejecutar migraciones en producción.

### Replay de las 64 fuentes pendientes — 2026-11-16

Se reprodujo el snapshot `schema-only` en Postgres aislado, sin filas de
negocio, y se aplicaron secuencialmente las 64 fuentes no registradas del
checkout release. Las 64 terminaron sin error SQL. Después del replay, la
prueba de catálogo de Favoritos pasó 14/14 y la prueba transaccional de
privilegios/contacto terminó correctamente. Esto valida sintaxis, dependencias
DDL observables y algunos contratos de catálogo; no prueba backfills con datos
reales ni reconcilia la deriva entre ledger y objetos productivos.

La inspección de las fuentes identificó estas escrituras ejecutadas al aplicar
migraciones, que requieren conteos/guardas sobre producción antes de cualquier
promoción:

- `20260930170000_property_verification_audit.sql`: inserta eventos históricos
  desde solicitudes de verificación; es idempotente por conflicto, pero puede
  crear un volumen de auditoría considerable.
- `20261024180000_backfill_kyc_evidence_retention.sql`: asigna fecha de purga a
  evidencias de solicitudes aprobadas/rechazadas aún no purgadas. Requiere
  contar candidatos y confirmar que los campos destino siguen nulos.
- `20261025160000_separate_property_contact_details.sql`: copia los campos
  reconocidos de `properties.contact_info` a una tabla privada y limpia el JSON
  legado. Un sondeo agregado anterior halló 315 objetos no vacíos y cero claves
  desconocidas, tipos no-string o valores sobre los límites; falta guardar una
  comprobación de igualdad de cantidades inmediatamente antes/después.
- `20261025230000_private_property_image_access.sql`: cambia el bucket
  `property_images` a privado; requiere verificar configuración actual y
  postchecks de lecturas autorizadas/no autorizadas.
- `20261030160000_bound_push_subscription_growth.sql`: marca las filas
  históricas sin fecha como anteriores a la ventana de 24 horas, preservando
  sus tombstones. Requiere conteo previo/posterior de nulos.

Las demás apariciones de `UPDATE`/`INSERT` observadas en esta pasada pertenecen
a cuerpos de funciones, políticas o pruebas transaccionales, no son backfills
ejecutados al crear la función. No se ha aprobado todavía ninguna allowlist de
producción: además de estos datos, siguen pendientes los overlays duplicados,
objetos preexistentes fuera del ledger, orden/dependencias y el error de build
de Cloudflare.

GitHub Actions run
[`43846726074`](https://github.com/BladeX1X/Cubitat/actions/runs/43846726074)
completó `quality` y `database-security` en PASS el 2026-11-16; los perfiles
productivos F2/F3/F4 quedaron incluidos. El check externo Cloudflare del PR
falló otra vez (`4d44a71c-e7fa-4517-8172-09d4a7734ad7`) y GitHub solo expone el
enlace al detalle, no el log de causa. El PR #228 sigue draft y producción no
ha recibido DDL/DML ni bundle.

Se preparó
[`web/supabase/preflight/phase34-production-data-preflight.sql`](../web/supabase/preflight/phase34-production-data-preflight.sql),
un sondeo de solo lectura que informa 16 conteos/indicadores para estas
operaciones y no devuelve valores de contactos, documentos ni endpoints. La
consulta pasó sintaxis sobre un esquema local mínimo con las columnas
observadas en el snapshot; esa comprobación no sustituye su ejecución contra
producción. El resultado productivo se debe revisar y guardar como evidencia
agregada antes de fijar la allowlist.

La CLI autenticada local sigue sin permiso `projects_read` (403); no se enlazó
ni se ejecutó contra producción. El workflow de snapshot dispone del secreto de
conexión usado para consultas de solo lectura, pero aún no incluye este sondeo.
El build Cloudflare más reciente es
`54f0a52f-cbce-4457-b312-a1ccb99acc84`; el detalle continúa pendiente.

### Diferencia de catálogo de la cadena completa — 2026-11-16

Se volvió a restaurar la misma captura `schema-only` con rol administrador en
un contenedor local aislado; el conteo de propiedades fue cero. Tras aplicar
las 64 fuentes, `pg_dump --schema-only` comparado antes/después mostró que la
cadena no es solo el conjunto de nuevas tablas de Fase 4: agrega las tablas
`property_ai_moderation_claims`, `property_contact_details` y
`saved_marketplace_listings`; crea o reemplaza RPC, triggers de publicación y
carga de fotos; y cambia políticas RLS de properties, perfiles, KYC,
notificaciones, contactos, push, anuncios guardados, alertas y Storage. El
diff normalizado registró 44 políticas nuevas, 45 retiradas/reemplazadas,
varios cambios de triggers y 318 líneas de grants/revokes. Es un cambio amplio
de seguridad y permisos que debe desplegarse como una cadena revisada, no como
solo las cinco migraciones más recientes.

En ese replay completo volvieron a pasar `phase4_marketplace_rollout_local.sql`
(14/14) y `public_property_contact_privileges_local.sql` (transacción con
rollback). El test de storage de fotos de Servicios para entorno local no es
un gate de producción: depende de overlays DEV antiguos que no pertenecen a
esta captura. La verificación confirma compatibilidad de catálogo y SQL sobre
esquema vacío; no valida el comportamiento con filas actuales.

### Revalidación de CI del release — 2026-11-16

La primera CI posterior al merge de `main` encontró un error no manejado de
Vitest durante teardown: la ficha lanzaba su registro de vistas contra un
Worker local inexistente y el aviso asíncrono sobrevivía al cierre del entorno.
Se aisló `fetch` en `DetailPage.test.tsx` para que la suite no dependa de ese
servicio. En el commit `d39f28873e51e4cda57015c3fc34fbee55905695`, workflow
[`43834765207`](https://github.com/BladeX1X/Cubitat/actions/runs/43834765207)
terminó `quality` PASS (5m43s) y `database-security` PASS (2m42s). Localmente
también pasaron lint, 238 archivos/1,088 pruebas/1 omitida y build base.

El check externo de Cloudflare Workers Builds sigue en FAILURE, build
`734bb872-1f06-4e30-8794-aec26d81025b`; GitHub solo devuelve el enlace, no el
motivo del error. La consulta de versiones del Worker DEV confirma que no hubo
despliegue: sigue activa `36efd098-375e-46d0-b0e7-a38d6f8ff83e` del 2026-11-15.
El PR #228 permanece abierto y no desplegado.

### Forma de datos para separar contactos — 2026-11-16

El snapshot privado [`43839389470`](https://github.com/BladeX1X/Cubitat/actions/runs/43839389470)
repitió la captura de esquema/ledger y ejecutó un conteo agregado de
`properties.contact_info`: 317 propiedades; 315 objetos JSON no vacíos y 2
vacíos; cero NULL, valores no objeto, claves distintas de `name/phone/email`,
valores no-string en esos campos y valores sobre los límites de destino. No se
exportaron valores ni se escribió en producción. La forma observada no presenta
objeciones de datos conocidas para el movimiento; aún falta validar el conjunto
de migraciones y sus overlays antes de aplicarlo.

La revisión del código del panel encontró que `propertiesRepository` todavía
seleccionaba `properties.contact_info`, lo cual fallaría al desplegar la
migración `20261026231000_restrict_property_contact_info_select.sql`. En la
rama de release se cambió la consulta general para excluir esa columna y cargar
el contacto mediante `get_admin_property_contact_details` con sesión AAL2. La
regresión primero falló por la selección insegura y luego pasó. CI del commit
`2c6ba04` también terminó PASS en `quality` y `database-security`, con
validaciones de perfiles productivos F2/F3/F4 en run
[`43840482215`](https://github.com/BladeX1X/Cubitat/actions/runs/43840482215).
Producción no ha recibido DDL/DML ni bundle.

Las versiones asociadas al flujo de contacto siguen no registradas en el ledger
remoto; incluir al menos `20261025160000`, `20261025190000`, `20261026220000`,
`20261026231000`, `20261026234000` y `20261111180000` en la revisión de
dependencias. No aplicar una secuencia parcial ni `db push` global.

El check externo de Cloudflare Workers Builds volvió a fallar con build
`04bf101e-753e-486f-874f-2847d645d1a3`; GitHub no expone el motivo. El PR #228
sigue draft y sin despliegue. No se usó bypass del check.

### Revalidación de perfiles y estado del build — 2026-11-16

GitHub Actions run [43841317949](https://github.com/BladeX1X/Cubitat/actions/runs/43841317949) completó `quality` y `database-security` en PASS. Incluyó lint, dependencias, pruebas unitarias, build estándar y checks de aislamiento de perfiles productivos F2, F3 y F4. Esto verifica el bundle contra los perfiles CI; no constituye despliegue ni verifica la base productiva.

El check externo de Cloudflare para PR #228 sigue en FAILURE, build `78d47b38-11ff-4cde-95d8-01f05337b546`. GitHub devuelve solo el vínculo al build y ningún log/anotación con la causa. No hay sesión de navegador conectada al agente. El motor local de Docker tampoco está iniciado, así que no se simuló aquí la aplicación de las migraciones sobre la instantánea de esquema.

Continúa el bloqueo de release: no promover Worker ni aplicar SQL productivo hasta obtener el primer error de Cloudflare y completar el replay/revisión de las 63 fuentes sin fila del ledger. Los gaps de RPC/tablas/bucket anotados arriba confirman que el esquema productivo y el ledger no bastan para usar `db push` global.

Reejecución del commit de documentación `f44d5f4` — GitHub Actions [43842815133](https://github.com/BladeX1X/Cubitat/actions/runs/43842815133) terminó `quality` PASS (6m19s) y `database-security` PASS (2m58s). Todos los perfiles de build F2/F3/F4 incluidos terminaron correctamente. Cloudflare volvió a fallar en build `9ca1c811-0be5-43ee-8ff2-27c2b2560765`; su check no incluye texto de error ni anotaciones útiles. El release productivo sigue sin desplegar.

### Replay del esquema productivo y hardening de Favoritos — 2026-11-16

Se restauró únicamente `schema.sql` del snapshot privado [43839389470](https://github.com/BladeX1X/Cubitat/actions/runs/43839389470) dentro de un contenedor Supabase Postgres aislado. La restauración no contiene filas de negocio; la base de replay reportó cero propiedades. Se aplicó en esa copia el subconjunto candidato de 11 migraciones relacionado con contactos, favoritos, reportes, privilegios de publicación y fotos de servicios. Las 11 terminaron sin error SQL. La prueba de contacto sintético (`public_property_contact_privileges_local.sql`) pasó.

La prueba `phase4_marketplace_rollout_local.sql` falló inicialmente en el control de privilegios. La causa es concreta: los privilegios por defecto del esquema otorgan todos los permisos sobre tablas nuevas a `authenticated` y `service_role`; la migración `20261116100000_phase4_saved_marketplace_listings.sql` revocaba a `PUBLIC` y `anon`, pero no eliminaba esos permisos heredados. Por eso `authenticated` conservaba `UPDATE` y `service_role` conservaba lectura. También se corrigió una aserción de política que buscaba el texto `auth.uid()` aunque el catálogo Postgres lo normaliza como `uid()`.

Se añadió la migración forward `20261116120000_phase4_saved_marketplace_privileges.sql`: revoca todos los permisos por defecto de la tabla a `PUBLIC`, `anon`, `authenticated` y `service_role`, y concede a `authenticated` solo `SELECT`, `INSERT` y `DELETE`. Después de aplicarla en el replay, la prueba de catálogo pasó 14/14; comprobaciones efectivas dieron `anon SELECT=false`, `authenticated UPDATE=false`, `service_role SELECT=false`. La migración fue agregada también al test TypeScript y la especificación de Favoritos.

Validación local posterior: lint PASS; 240 archivos de pruebas PASS (1,090 pruebas PASS, 1 omitida); build estándar PASS y verificaciones de aislamiento/secreto PASS. El build local usó fallback estático de sitemap por falta de configuración pública de Supabase; no equivale al perfil productivo. El check de Cloudflare del PR sigue sin diagnóstico y la migración aún no se ha aplicado en producción. Al añadir la fuente forward, el inventario pasa a 165 archivos locales, 101 versiones en el ledger y 64 fuentes locales sin registro; todavía no están clasificadas todas.

No se aplicó DDL/DML ni bundle en producción. El replay de 11 migraciones es un subconjunto dirigido, no sustituye la conciliación exhaustiva de las restantes ni la revisión de dependencias.
