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
