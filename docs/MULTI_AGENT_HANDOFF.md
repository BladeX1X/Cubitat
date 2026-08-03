# Relevo y coordinación multiagente de Cubitat

Última actualización: 2026-08-03

Este documento permite que varios agentes continúen el trabajo sin repetir
auditorías ni modificar las mismas áreas a la vez. El repositorio es la fuente
de verdad del código; la checklist de Obsidian es la fuente de seguimiento
operativo.

## Lectura obligatoria antes de comenzar

1. `AGENTS.md` en la raíz.
2. `.agents/AGENTS.md`.
3. `Cubitat - Guia Operativa Fase 1.md`.
4. `docs/DESPLIEGUE_COMPLETO.md`.
5. `web/supabase/DATABASE_MIGRATIONS.md`.
6. Este documento.
7. `G:\Mi unidad\Obsidian\Vault_IA_Second_Brain\02 Projects\Cubitat\Cubitat - Checklist de Lanzamiento.md`.

Para archivos dentro de `web/`, leer también `web/AGENTS.md`.

## Estado confirmado

> Actualización 2026-08-03: la remediación de auditoría Fase 2 fue fusionada
> mediante PR #85 en `dev` como `7d24355`. El PR cerró sin conflictos después
> de lint, 87 archivos/348 pruebas y build/PWA con 473 URLs. La rama local y
> remota `bugfix/phase2-audit-remediation` fue eliminada después de confirmar el
> merge; `main` permanece en `42f5f9a` y producción no fue desplegada ni
> consultada. El cambio local ajeno de `web/public/sitemap.xml` no formó parte
> del PR y se conserva sin alteraciones.

> Actualización 2026-08-02: remediación de auditoría Fase 2 en la rama
> `bugfix/phase2-audit-remediation`, solo DEV/local. El panel de agente dejó de
> estimar leads al 5 % y ahora suma clics reales de teléfono y WhatsApp; `admin`
> ya no satisface el guard de agente verificado; `/mi-cuenta` limpia el estado
> al cambiar de sesión y descarta respuestas tardías. El modal KYC y las tarjetas
> del perfil público recibieron semántica y navegación por teclado. DEV-F2.7
> revoca la RPC de contactos a `anon/authenticated`: el Worker limita por IP y
> deriva una clave diaria HMAC sin aceptar identidad del navegador. Matriz SQL:
> `phase2_local_security: ok` con `ROLLBACK`. Gate: lint limpio, 87 archivos y
> 348 pruebas, build/PWA de 473 URLs, tipos Wrangler actualizados y dry-run DEV.
> Chrome confirmó `buyer → agent → buyer`, F5 normal sin versión antigua ni
> error rojo, panel oculto para buyer/admin, modal KYC con foco/Escape y consola
> limpia. El endpoint local deduplicó dos clics idénticos en un único evento y
> los datos QA fueron eliminados. El Worker remoto sigue sin secretos;
> no confundir implementación con entrega remota operativa. Producción no fue
> consultada ni modificada. Trust Score y Web Push continúan diferidos.

> Actualización 2026-07-28: política KYC decidida e implementada solo en
> DEV/local. Documento y selfie se eliminan al cumplir 24 horas desde la
> aprobación o 1 hora desde el rechazo, mediante API de Storage y Cron
> `service_role`; la fila mínima de auditoría permanece con rutas `NULL` y fecha
> de purga. Reclamo atómico, reintentos y comprobación previa al cierre
> verificados. Matriz SQL: `phase2_local_security: ok` con `ROLLBACK`. Gate:
> lint, 83 archivos/327 pruebas y build. Producción y Worker remoto no
> modificados. Trust Score y Web Push continúan diferidos.

> Actualización 2026-07-27 (continuación paso a paso): `dev` fue subida en
> `2523b33`. En Chrome, una cuenta QA KYC aprobada cambió buyer → agent sin
> recarga forzada, accedió al panel, mostró insignia pública y reflejó
> `1` llamada/`1` WhatsApp; repetir cada clave no duplicó eventos. La propiedad
> y elevación KYC sintéticas fueron eliminadas y la cuenta terminó
> `buyer/pending`, sin propiedades y sin acceso al panel. El dispatcher de
> correo ahora admite proveedor, remitente y URL pública DEV y tolera caídas de
> red sin rechazar el Cron. Gate: lint, 82 archivos/319 pruebas y build.
> El Worker aislado `cubitat1-phase2-dev` ya fue desplegado y verificado con
> respuesta HTTP 200 en `workers.dev`; no tiene rutas productivas ni secretos.
> Entrega real de correo sigue bloqueada: la organización Supabase ya ocupa sus
> dos proyectos gratuitos y el segundo contiene 8 recursos REST y 1 usuario,
> por lo que no se reutilizó ni eliminó. Falta autorizar un tercer proyecto DEV
> de pago y proporcionar una `RESEND_API_KEY` DEV. `env.dev.VITE_SUPABASE_URL`
> continúa en `https://dev-supabase.invalid`, y el Cron omite la entrega de
> forma segura. No usar credenciales ni Supabase de producción para cerrar esta
> prueba.

> Actualización 2026-07-27: auditoría integral de Fase 2 corregida en DEV/local.
> Trust Score y Web Push quedan expresamente diferidos y fuera de la interfaz;
> no se usan datos simulados. Verificación de agentes y métricas de contacto
> provienen del backend. Lint, 82 archivos/317 pruebas, build y Chrome aprobados.

> Actualización 2026-07-25: Submódulo 1.2 de Fase 2 completado en DEV (filtro por Agente Verificado y Trust Score ≥ 4.0 en barra de búsqueda y panel de filtros). 78 archivos y 298 pruebas unitarias aprobadas al 100%. Fusionado en `dev` y subido a GitHub.

> Actualización 2026-07-22: decisión de producto confirmada por Rodolfo: toda la Fase 2 se prueba exclusivamente en DEV. La migración quedó fuera de la cadena productiva, la UI se desactiva en builds de producción y el Cron existe solo en `env.dev`. No desplegar Fase 2 ni aplicar su SQL en producción.

- Rama base funcional confirmada antes de este relevo: `main` en `4bf8fa0`. El
  código del parche de observabilidad segura se integró mediante el PR #70
  (`f969494`) y su cierre documental mediante el PR #71. El siguiente agente
  debe usar el `origin/main` más reciente que ya contenga esta sección.
- Estado local que debe preservarse: `web/public/sitemap.xml` está modificado por
  otro trabajo. No incluirlo, restaurarlo ni regenerarlo en el siguiente parche.
- Migraciones: 50 archivos versionados; 48 estaban sincronizados con producción
  en la última verificación histórica, la 49 debe confirmarse y la 50 está
  pendiente de aplicar. La 50 crea y protege KYC/perfiles/entrega de alertas.
- Validación local 2026-07-22: lint limpio, 77 archivos y 281 pruebas aprobadas,
  build TypeScript/Vite/PWA correcto, sitemap de 473 URLs preservado y dry-run
  del Worker correcto.
- Recuperación de contraseña:
  - plantilla remota portable con `token_hash` aplicada mediante Supabase CLI;
  - enlace real probado sin el error PKCE entre navegadores;
  - la ruta usa un shell aislado que no muestra el estado autenticado;
  - después de cambiar la contraseña se ejecuta `signOut` y se abre el login.
- Despliegue productivo vigente: Worker `cubitat1`, versión
  `17e2a0e0-da43-4c4d-9b00-a701924099ba`, desplegada el 2026-07-20.
- Google OAuth funciona de extremo a extremo.
- Panel de moderación protegido por TOTP/AAL2. La sesión administrativa elevada
  cargó propiedades, reportes, bitácora y métricas en producción sin errores de
  consola; una prueba transaccional confirmó denegación completa para admin
  `aal1` y aislamiento del propietario normal.
- Las rutas directas de recuperación inválidas mantienen campos y envío
  deshabilitados.

No marcar nada adicional como verificado sin nueva evidencia observable.

## Trabajo pendiente por carriles

Cada agente debe tomar un solo carril, escribir su nombre o identificador en la
columna `Responsable` y cambiar `Libre` por `En curso` antes de modificar
archivos. Al terminar, debe registrar evidencia y dejar el carril `Terminado` o
`Bloqueado`.

| Carril | Estado | Responsable | Alcance y criterio de cierre |
| --- | --- | --- | --- |
| A. Reconciliar checklist | Terminado | Codex principal | Casillas antiguas reconciliadas con evidencia de Supabase, RLS, Storage, contactos, revisión, dominio, SSL, canonical, `www` y redirección HTTP. |
| B. Rutas y recarga | Terminado | Codex principal | Todas las rutas previstas responden `200`; públicas renderizan tras recarga, protegidas aplican guard anónimo, y estados especiales son seguros. |
| C. Rendimiento y responsive | Terminado | Codex principal | Home y ruta SEO de resultados verificadas. Matanzas pasó de CLS 0.25/0.348 en informes previos a CLS 0; en móvil Slow 4G/CPU x4 obtuvo LCP 1.675 s. Lighthouse móvil: accesibilidad 100, SEO 100 y navegación agéntica 100; el único fallo de buenas prácticas es el DNS externo del beacon de Cloudflare. |
| D. RLS por rol | Terminado | Codex principal | Matriz real completa: propietario lista y edita únicamente su borrador QA; otro usuario ve cero publicaciones y la URL ajena vuelve a `/mis-propiedades`; admin accede a contenido no público, reportes y controles de moderación; guards y consola correctos. |
| E. Métricas admin | Terminado | Codex principal | Verificado en producción: Cloudflare 23,260 solicitudes del día; Supabase BD 12.9 MB, Storage 0.6 MB, 313 anuncios, 25 usuarios y 3 reportes; GA4 devuelve usuarios activos mediante Service Account con rol Lector. Endpoint admin autenticado, errores parciales y reintento desplegados. El egreso unificado permanece identificado como dato exclusivo del dashboard de Supabase porque su Management API no expone bytes mediante `analytics_usage_read`. |
| F. Moderación Groq | Terminado | Codex principal | Publicación QA temporal reevaluada manualmente: pasó por pendiente y Groq la rechazó con motivo coherente por precio irrazonable y contenido temporal. Se eliminó únicamente ese registro; inventario final 312, rechazadas 9, pendientes 0 y consola limpia. |
| G. Contenido real | Bloqueado | — | Requiere inventario, fotos, títulos, precios y zonas aportados o aprobados por el usuario. |
| H. Legal | Bloqueado | — | Requiere revisión jurídica externa de Privacidad y Términos. |
| I. Operación humana | Terminado | Rodolfo | Responsable de moderación definido: Rodolfo. SLA operativo: revisar publicaciones en un máximo de 24 horas. |
| J. Modularización admin | Terminado | Codex principal | Propiedades, Reportes y Métricas aislados bajo `src/modules/admin`; `AdminPage` quedó como shell de 97 líneas sin acceso directo a Supabase. PR #20 fusionado y Worker `1d8ae4c4-8223-4499-b013-7bd0bfe29099` verificado en producción con sesión admin: tres módulos operativos y consola limpia. Sin migraciones ni cambios de datos. |
| K. Contexto del anunciante | Terminado | Codex principal | PR #22 fusionado y desplegado; contexto real cargado bajo demanda con sesión admin, guard conservado y consola limpia. Inspección visual móvil real queda como pendiente no bloqueante. |
| L. Bitácora de moderación | Terminado | Codex principal | PR #26 fusionado y migración 42 sincronizada. Revalidación productiva 2026-07-19: anónimo rechazado; usuario normal y admin AAL1 con 0 filas; admin AAL2 con 4 eventos; `INSERT/UPDATE/DELETE` no autorizados rechazados, `service_role` sin `UPDATE/DELETE` y trigger inmutable habilitado. Transacción finalizada con `ROLLBACK`. |
| P. MFA administrativo | Terminado | Codex principal | TOTP activo; guard modular, Worker, RPC y RLS exigen `aal2`. Migración 47 sincronizada; admin AAL1 denegado, admin AAL2 operativo y propietario normal aislado. Lint, 172 pruebas, build, panel y consola verificados. |
| Q. Recuperación MFA administrativa | Terminado | Codex principal | Runbook de emergencia en `docs/ADMIN_MFA_RECOVERY.md`. Simulacro no destructivo completado el 2026-07-21: contratos de SDK y API Admin validados, 8/8 pruebas de regresión aprobadas y 0 factores modificados. |
| R. Logs seguros del frontend | Terminado | Codex | Auditar `console.*` por módulos, sustituir errores/respuestas crudas por eventos seguros sin datos personales ni tokens, conservar mensajes útiles para el usuario, añadir regresiones, ejecutar lint/pruebas/build y verificar navegación y consola en producción sin mutar datos. |
| S. Recuperación de sesión MFA expirada | Terminado | Codex | Implementación y regresiones completas en DEV/local: tras `session_not_found` se oculta el desafío obsoleto, se ofrece cerrar sesión e iniciar nuevamente y se mantiene el guard bloqueado ante fallos. La integración de `CubitatApp` confirma cierre, limpieza, inicio y login; QA visual autenticada diferida por decisión del usuario. |
| T. Aislamiento físico del bundle Fase 2 | Terminado | Codex | El build productivo excluye los chunks de panel/perfil de agente y el módulo de moderación KYC; DEV/local conserva las capacidades y una verificación automática bloquea regresiones. |

## Protocolo para trabajar en paralelo

1. Ejecutar `git status --short` y revisar esta tabla antes de actuar.
2. Reclamar un carril editando únicamente su fila. No tomar un carril ya marcado
   `En curso`.
3. Dividir por archivos y evitar que dos agentes editen simultáneamente
   `web/src/app/CubitatApp.tsx`, `web/src/worker.ts`, `web/supabase/config.toml`,
   una misma migración o la misma nota de Obsidian.
4. No revertir cambios locales ajenos ni limpiar archivos que otro agente esté
   usando.
5. Un solo agente puede ejecutar cambios remotos o despliegues a la vez. Antes
   de `supabase config push`, migraciones o `wrangler deploy`, registrar el
   carril y comprobar que ningún otro agente esté desplegando.
6. Para descubrir código, usar primero `codebase-memory-mcp` según `AGENTS.md`.
7. Para cambios de código, completar desde `web/`:

   ```powershell
   npm run lint
   npm run test:run
   npm run build
   ```

8. Actualizar la checklist de Obsidian solo con evidencia verificada. Registrar
   fecha, entorno y resultado breve.
9. Al cerrar el carril, añadir una entrada al registro de relevo de abajo.

## Registro de relevo

### 2026-07-31 — Codex — Aislamiento físico del bundle Fase 2

- Estado: **terminado y verificado en build local de producción; listo para
  publicar en `dev`**.
- Causa: las capacidades estaban correctamente bloqueadas por la bandera, pero
  Vite aún generaba chunks para `AgentDashboardPage`, `AgentProfilePage` y
  empaquetaba `review_kyc_request` dentro de `AdminPage`.
- Corrección: las tres superficies usan imports lazy detrás de
  `import.meta.env.DEV`; producción puede eliminarlas por tree shaking y
  DEV/local conserva las rutas y KYC.
- Regresión: `verify-phase2-production-bundle.mjs` falla si reaparecen los
  chunks exclusivos o el marcador de la RPC KYC. La reproducción inicial falló
  con los tres hallazgos y el build corregido pasó.
- Evidencia: lint limpio, 84 archivos/333 pruebas y build aprobados. Módulos
  transformados 329 → 312, precache PWA 45 → 42 entradas y 1077.61 → 1045.01
  KiB; `AdminPage` bajó de 64.69 a 54.75 kB y el verificador confirmó la
  ausencia de los tres módulos exclusivos.
- QA navegador DEV/local: Supabase Auth local respondió HTTP 200; el perfil
  sintético `/agente/f3000000-0000-0000-0000-000000000001` cargó “Agente QA
  Local” y una propiedad; `/panel-agente` anónimo volvió a `/` y abrió el login.
  Los tres módulos exclusivos respondieron HTTP 200 desde Vite DEV y la consola
  quedó con 0 errores/advertencias. La pestaña KYC AAL2 no se abrió porque la QA
  con TOTP permanece diferida por decisión del usuario.
- Alcance: no se modificaron datos, Supabase, KYC, Worker ni producción.

### 2026-07-30 — Codex — Recuperación accionable de sesión MFA expirada

- Estado: **implementado y verificado automáticamente en DEV/local; fusionado
  en `dev` mediante PR #78**. La QA visual autenticada fue diferida por
  decisión del usuario al no tener disponible el dispositivo TOTP.
- Flujo: ante `session_not_found`, `AdminMfaGate` descarta el factor, el código
  introducido y cualquier QR de enrolamiento obsoleto; oculta el formulario y
  ofrece “Cerrar sesión e iniciar nuevamente”.
- Recuperación: `CubitatApp` reutiliza el cierre central de sesión, limpia el
  estado local, navega al inicio y abre el login. Si el cierre falla, el guard
  permanece bloqueado, permite reintentar y no expone el error crudo.
- Regresión: 18 pruebas focales aprobadas, incluida la expiración durante el
  enrolamiento y una integración de `CubitatApp` que confirma el orden
  `signOut` → limpieza de caché → borrado del borrador, la navegación a `/` y
  la reapertura del login. El ciclo obligatorio terminó con lint limpio,
  84 archivos/333 pruebas y build TypeScript/Vite/PWA correcto con 45 entradas
  de precache y 473 URLs. El sitemap generado se restauró porque no cambiaron
  las rutas.
- Navegador: el servidor local respondió HTTP 200. La sesión del navegador
  integrado era anónima; la pestaña Chrome autenticada de `/moderar` existía,
  pero dos intentos de control agotaron el tiempo de espera. No se introdujo
  ningún TOTP, no se consultó KYC y no se tocó producción.
- Pendiente no bloqueante: cuando el dispositivo TOTP esté disponible,
  reproducir `session_not_found` en Chrome y comprobar visualmente que la
  acción abre el login sin mostrar el desafío anterior.

### 2026-07-30 — Codex — Errores MFA administrativos diferenciados

- Estado: **corregido y verificado exclusivamente en DEV/local**.
- Causa raíz observada en Supabase Auth: `AdminMfaGate` mostraba siempre
  “código no válido” porque `mfaService.verifyTotp()` descartaba `error.code` y
  lanzaba un error genérico, incluso cuando Auth respondía
  `session_not_found` antes de validar el TOTP.
- Corrección: el servicio conserva únicamente una categoría segura
  (`session_expired`, `invalid_code` o `unavailable`) sin exponer mensajes,
  tokens ni cuerpos crudos de Supabase. La interfaz muestra instrucciones
  específicas para volver a iniciar sesión, usar el código actual o revisar la
  conexión.
- Regresión: `AdminMfaGate.test.tsx` cubre sesión inexistente, TOTP inválido y
  fallo de servicio/red, además del acceso AAL2 válido y el enrolamiento.
- Calidad: lint limpio, 83 archivos/330 pruebas aprobadas y build
  TypeScript/Vite/PWA correcto con 45 entradas de precache y 473 URLs. El
  sitemap generado se restauró al estado previo porque no hubo cambios de
  rutas.
- Alcance: no se introdujo el TOTP del usuario, no se revisó la solicitud KYC y
  no se consultó ni modificó producción.

### 2026-07-28 19:22 — Codex — Purga KYC verificada contra Storage local real

- Prueba integral ejecutada desde `supabase_network_web` con el Worker real
  compilado desde `dev`, dos usuarios sintéticos, dos solicitudes KYC y cuatro
  objetos WebP temporales en el bucket privado `kyc_documents`.
- Las fechas programadas resultaron correctas: 24 horas para `approved` y
  1 hora para `rejected`. Antes del vencimiento, el Worker devolvió
  `claimed: 0`, `purged: 0`, `failed: 0`.
- Tras adelantar exclusivamente las fechas de los fixtures, el Worker devolvió
  `claimed: 2`, `purged: 2`, `failed: 0`; Storage quedó sin los cuatro objetos
  sintéticos y ambas filas conservaron auditoría con rutas `NULL`, fecha de
  purga y un intento.
- Limpieza confirmada: 0 usuarios sintéticos, 0 solicitudes sintéticas y
  0 objetos sintéticos residuales. El estado previo local se preservó en
  1 solicitud pendiente y 2 objetos ajenos a esta prueba; no existe ninguna
  purga vencida.
- Hallazgo de entorno: el port-forward de Windows hacia `127.0.0.1:54321`
  reinició conexiones durante la prueba, aunque Kong estaba sano dentro de
  Docker. La validación se ejecutó dentro de la red local sin reiniciar
  contenedores ni modificar permisos. Producción y Worker remoto permanecieron
  intactos.

### 2026-07-28 12:15 — Codex — Retención KYC rechazada de 1 hora

- Decisión de producto: evidencias aprobadas conservan la ventana de 24 horas;
  evidencias rechazadas se conservan 1 hora. Después, ambas usan el mismo flujo
  seguro de purga por API de Storage.
- Migración incremental DEV-F2.6:
  `web/supabase/dev-migrations/20260801006000_rejected_kyc_evidence_retention.sql`.
  No se reescribió DEV-F2.5 ya aplicada.
- La RPC general `claim_kyc_evidence_for_purge(integer)` reemplaza el reclamo
  exclusivo de aprobadas y selecciona estados `approved` o `rejected` únicamente
  cuando su fecha de purga venció. Conserva `SKIP LOCKED`, lease de 30 minutos y
  acceso exclusivo de `service_role`.
- Evidencia local: rechazado reciente no reclamado; después de adelantar solo la
  fecha QA a más de 1 hora, reclamado exactamente una vez. La ventana aprobada
  de 24 horas no cambió. Matriz completa:
  `phase2_local_security: ok` y `ROLLBACK`.
- Gate final: lint limpio, 83 archivos/327 pruebas, build PWA con 473 URLs y
  Wrangler DEV dry-run correcto. No se desplegó el Worker actualizado ni se
  modificaron Supabase/Cloudflare productivos.
- Producto: Trust Score no se implementa todavía. Web Push —notificaciones del
  navegador aun con Cubitat cerrado— también queda diferido y fuera de la
  interfaz.

### 2026-07-28 10:00 — Codex — Retención KYC de 24 horas implementada en DEV/local

- Decisión de producto: documento y selfie de una solicitud KYC aprobada se
  eliminan al cumplir 24 horas. Con el Cron DEV actual, la ejecución ocurre en
  el primer intervalo posterior, como máximo aproximadamente 15 minutos después.
- Migración DEV-F2.5:
  `web/supabase/dev-migrations/20260801005000_kyc_evidence_retention.sql`.
  Añade fecha programada, reclamo/lease, contador de intentos y fecha de purga;
  permite poner las dos rutas en `NULL` sin borrar la fila de auditoría.
- Seguridad: las RPC de reclamo, finalización y liberación están revocadas para
  `PUBLIC`, `anon` y `authenticated`, y concedidas exclusivamente a
  `service_role`. `FOR UPDATE SKIP LOCKED` evita solapamientos y el lease se
  recupera a los 30 minutos.
- Storage: el Worker usa `DELETE /storage/v1/object/kyc_documents` con ambas
  rutas. No elimina directamente desde `storage.objects`; Supabase local bloqueó
  explícitamente ese intento durante TDD. La RPC de finalización también se
  niega a poner rutas en `NULL` mientras cualquier objeto siga presente.
- Fallos: si Storage rechaza el borrado, se conservan las rutas y se libera el
  reclamo. Si falla la confirmación posterior, el lease expira y permite repetir
  la operación idempotente. Los logs usan eventos cerrados sin IDs, rutas,
  secretos ni cuerpos externos.
- Evidencia: migración aplicada solo a `supabase_db_web`; matriz completa
  `phase2_local_security: ok` y `ROLLBACK`; pruebas focales 57/57; gate final
  lint limpio, 83 archivos/326 pruebas y build PWA correcto con 473 URLs.
  `wrangler deploy --env dev --dry-run` empaquetó el Worker sin desplegarlo.
- Alcance histórico resuelto por DEV-F2.6: las evidencias rechazadas ahora usan
  una ventana de 1 hora. No se desplegó el Worker actualizado ni se tocó
  Supabase/Cloudflare de producción.

### 2026-07-27 19:15 — Codex — Worker de alertas DEV desplegado; Supabase DEV bloqueado por capacidad

- Estado: **Worker DEV desplegado; entrega real de correo bloqueada sin tocar
  producción**.
- Cloudflare CLI autenticado y despliegue confirmado:
  `cubitat1-phase2-dev`, versión
  `a6c7056e-1776-40f9-a14b-9f83b4963fbb`, URL
  `https://cubitat1-phase2-dev.pochiprats18.workers.dev`, HTTP 200 y contenido
  Cubitat. El entorno usa `workers.dev`, `routes: []` y Cron cada 15 minutos.
- El Worker no recibió secretos. Mantiene
  `VITE_SUPABASE_URL=https://dev-supabase.invalid`; por el manejo defensivo del
  dispatcher, el Cron sale sin reclamar ni enviar alertas cuando falta
  configuración.
- Supabase CLI confirmó dos proyectos activos en la organización. El proyecto
  Cubitat enlazado es producción y no se modificó. El otro proyecto candidato
  tiene 8 recursos REST, 1 usuario Auth y 0 buckets; al no estar vacío, no se
  borró, reinició ni reutilizó.
- Bloqueo observable para el siguiente paso: autorizar el costo de un tercer
  proyecto Supabase DEV (o indicar explícitamente qué proyecto existente se
  puede eliminar/reutilizar) y aportar una clave Resend separada para DEV.
  Después: aplicar la cadena base y `dev-migrations`, configurar secretos
  `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY`, crear fixtures sintéticas y
  verificar una entrega real.
- Producción intacta: no se desplegó `cubitat1`, no se cambiaron rutas/DNS, no
  se aplicaron migraciones al Supabase Cubitat y no se copiaron secretos
  productivos.

### 2026-07-27 17:00 — Codex — Cierre de auditoria Fase 2 sin Trust Score

- Estado: **corregido y verificado exclusivamente en DEV/local**.
- Decisión de producto: Trust Score todavía no se implementa. Se retiraron su
  filtro, badge y calculos de resultados, detalle y perfil. Web Push tambien
  queda diferido y no aparece como capacidad disponible; las alertas conservan
  persistencia y preparacion de correo DEV sin prometer entrega no configurada.
- Verificacion canonica: la UI dejó de reconocer agentes por UUIDs sintéticos o
  valores locales. `get_verified_agent_ids()` exige `role = 'agent'`, KYC
  `verified` y propiedad publicada; la misma regla protege el perfil publico.
- Panel: `/panel-agente` exige agente verificado incluso mediante acceso
  directo. Sus contadores de telefono y WhatsApp salen de PostgreSQL; la RPC
  deduplica un visitante por propiedad, canal y dia. No se suman contadores en
  `localStorage` ni dos veces en la UI.
- PWA/entornos: Vite usa Supabase local como fallback DEV y el service worker
  ya no cachea Supabase REST. Esto evita respuestas de sesión/rol antiguas con
  `F5`; solo las imagenes publicas de Storage mantienen cache runtime.
- Base local: aplicada `DEV-F2.4`
  (`20260801004000_verified_agents_and_contact_metrics.sql`). La matriz SQL
  verificó aislamiento de eventos, deduplicación, proyección de agentes,
  perfiles públicos y RLS, finalizando con
  `phase2_local_security: ok` y `ROLLBACK`.
- Evidencia Chrome con `QA Buyer Toggle`: buyer sin enlace lateral de panel;
  acceso directo denegado; tarjeta `Anunciante Particular` activa después de
  una recarga normal; selección respondió `Tipo de cuenta actualizado
  correctamente.` sin mensaje rojo; tarjeta de agente deshabilitada hasta KYC;
  resultados sin Trust Score, alerta sin Push y consola sin errores.
- Calidad: lint limpio; 82 archivos/317 pruebas; build TypeScript/Vite/PWA
  correcto, 45 entradas de precache, 473 URLs. El sitemap generado se restauró.
- Producción, `main`, Supabase remoto y Cloudflare: **no consultados ni
  modificados**.

### 2026-07-27 15:10 — Codex — F5 cargaba una versión local antigua

- Estado: **corregido y verificado en Chrome local**.
- Causa confirmada: un service worker Workbox de un build anterior seguía
  controlando `127.0.0.1:5173`. Vite respondía `/sw.js` con `text/html`, por lo
  que Chrome no podía actualizar ni retirar el worker; `Ctrl+F5` sólo evitaba
  temporalmente esa caché.
- Corrección DEV: el servidor Vite responde `/sw.js` con JavaScript sin caché
  que activa inmediatamente, elimina cachés del origen, desregistra el worker y
  recarga las ventanas locales una sola vez. No borra sesión, cookies,
  LocalStorage ni datos de usuario y no altera el PWA productivo.
- Evidencia: endpoint `200`, `application/javascript`,
  `Cache-Control: no-cache, no-store, must-revalidate` y script de autolimpieza.
  Dos recargas normales consecutivas en Chrome mostraron la versión actual y
  conservaron la cuenta `QA Buyer Toggle`; consola sin errores ni advertencias.
- La prueba visual encontró un segundo CTA duplicado `Panel de Agente &
  Métricas` fuera del menú. Se retiró: un comprador ya no ve ningún acceso al
  panel y un agente conserva el único CTA superior protegido por rol.
- Regresión y calidad: 3 archivos/14 pruebas focalizadas; lint limpio; 84
  archivos/322 pruebas; build TypeScript/Vite/PWA correcto, 46 entradas de
  precache y 473 URLs. Sitemap restaurado al hash previo.
- Producción y datos reales: **no modificados**.

### 2026-07-27 14:50 — Codex — Ocultar Panel de Agente a roles no agentes

- Estado: **corregido y verificado en Chrome contra Supabase local**.
- Causa raíz: `AccountLayout` recibía `userRole`, pero lo descartaba como
  `_userRole`; el enlace dependía únicamente de Fase 2 y del callback de
  navegación, por lo que también aparecía a compradores.
- Corrección: `Panel de Agente` se renderiza únicamente cuando
  `PHASE_TWO_ENABLED`, existe el callback y el rol canónico es exactamente
  `agent`. `buyer`, `seller`, `admin` y rol ausente no reciben el acceso.
- Evidencia Chrome: la cuenta sintética `QA Buyer Toggle` en `/mi-cuenta`
  mostró sólo `Mi cuenta`, `Favoritos` y `Mis publicaciones`; el enlace de
  agente no estuvo en el DOM y la consola terminó sin errores ni advertencias.
- Regresión: `AccountLayout.test.tsx` cubre cuatro roles no agentes y confirma
  que un agente sí ve el enlace. Puerta completa: lint limpio, 83 archivos/320
  pruebas y build TypeScript/Vite/PWA correcto con 473 URLs; sitemap restaurado
  al hash previo.
- Producción y datos reales: **no modificados**.

### 2026-07-27 14:20 — Codex — Auditoría Módulo 2 KYC y frontera DEV/producción

- Estado: **código, pruebas y base local verificados; comprobación visual final
  pendiente de que Chrome vuelva a compartir la pestaña abierta**.
- Hallazgo Módulo 2: el roadmap afirmaba compresión WebP, pero el cliente subía
  los JPG/PNG originales. `kycImageCompression.ts` convierte ahora las dos
  evidencias localmente a WebP (calidad 0.82), limita el lado mayor a 1600 px y
  aborta antes de Storage si cualquiera de las conversiones falla.
- Seguridad de rol: la migración productiva 50 ya no deja una futura vía
  `buyer → agent` sin KYC. Los cambios de rol de cliente quedan cerrados por
  defecto; exclusivamente en DEV, `20260801003000` permite `buyer ↔ agent`
  cuando el KYC está aprobado y degrada al agente si pierde la verificación.
- Aislamiento: `PHASE_TWO_ENABLED` requiere simultáneamente build DEV y URL de
  Supabase local (`localhost`/`127.0.0.1`). El proxy Vite dejó de usar un URL y
  una clave productivos como fallback; si Supabase local no responde retorna
  `502` sin reintentar contra ningún entorno remoto.
- Matriz SQL real: `phase2_local_security.sql` usa la RPC vigente de tres
  argumentos y dos objetos privados. Verificó propietario, tercero, admin AAL1,
  admin AAL2, bloqueo de agente sin KYC, activación tras aprobación y degradación
  al retirar KYC. Resultado `phase2_local_security: ok`; toda la fixture terminó
  en `ROLLBACK`.
- Calidad: lint limpio; 82 archivos/315 pruebas; build TypeScript/Vite/PWA y
  sitemap de 473 URLs correctos. El sitemap generado se restauró al hash previo
  `6ACCCCA81A43CF187063DB06C0496F7F5DAA47F87C93DCC03216828E988C30B2`.
- Producción: **no consultada ni modificada**. Docker/Supabase y Vite se
  levantaron únicamente en local.

### 2026-07-27 09:55 — Codex — Selección de tipo de cuenta (/mi-cuenta) (RESUELTO EN LOCAL)

- Estado: **resuelto y verificado en navegador contra Supabase local**.
- Causa raíz confirmada: `AccountPage` usaba `profiles.upsert`, que generaba
  `POST /rest/v1/profiles?on_conflict=id`. El rol SQL `authenticated` tiene
  `UPDATE`, pero no `INSERT`; Kong registró HTTP `403` y PostgreSQL confirmó
  `permission denied for table profiles` (`42501`).
- Corrección cliente: el selector usa ahora `UPDATE` acotado por `id`, solicita
  de vuelta `role` y solo confirma éxito cuando la fila retornada coincide. No
  se añadió `INSERT` ni se amplió la RLS.
- Auth metadata: la cuenta QA no contiene `user_metadata.role`; no se llama
  `supabase.auth.updateUser` porque `profiles.role` sigue siendo la fuente de
  verdad.
- Migración: `20260727100000_allow_self_role_toggle.sql` quedó registrada en el
  stack local, limitada a `buyer ↔ agent`, sin referencias a columnas KYC
  exclusivas de DEV. La migración DEV KYC conserva la misma excepción segura
  para no revertirla al reconstruir el entorno. La rama de autoservicio exige
  además un `auth.uid()` no nulo; una prueba SQL local confirmó
  `QA_NULL_UID_REJECTED`.
- Evidencia Chrome: sin `Ctrl+F5`, `Agente / Inmobiliaria → Anunciante
  Particular → Agente / Inmobiliaria` cambió inmediatamente la tarjeta activa,
  mostró `Tipo de cuenta actualizado correctamente.`, sin errores ni
  advertencias. Kong registró `PATCH ...&select=role` con HTTP `200`.
- Seguridad/limpieza: la sesión disponible era la cuenta QA administrativa. Se
  restauró su fila a `admin` después de la prueba y se confirmó
  `on_profile_role_update` habilitado (`tgenabled = O`). El selector solo se
  renderiza para `buyer` o `agent`, evitando una degradación administrativa,
  el rol legado `seller` y un estado inicial todavía sin rol.
- Regresión: `AccountPage.test.tsx` exige `update({ role })`, filtro por `id`,
  retorno de `role`, ausencia de `upsert` y ausencia de escritura en Auth
  metadata; también comprueba que un admin no vea el selector. Calidad
  completa: lint limpio, 81 archivos/310 pruebas aprobadas y
  build TypeScript/Vite/PWA correcto con 473 URLs; el sitemap se restauró al
  hash previo `6ACCCCA81A43CF187063DB06C0496F7F5DAA47F87C93DCC03216828E988C30B2`.
- La primera compilación detectó dos errores TypeScript ya presentes en `dev`:
  faltaba desestructurar `onNavigateAgentDashboard` en `MyPropertiesPage` y el
  callback de error del proxy Vite no estrechaba `ServerResponse | Socket`.
  Ambos se corrigieron de forma mínima para completar la puerta obligatoria.
- Producción: **no consultada ni modificada**.

### 2026-07-27 10:45 — Codex — KYC obligatorio para activar agente (/mi-cuenta)

- Estado: **implementado y verificado exclusivamente en DEV/local**.
- Regla: un perfil solo puede pasar de `buyer` a `agent` cuando
  `profiles.verification_status = 'verified'`. La vuelta `agent → buyer` sigue
  disponible. Si una operación interna retira el KYC a un agente, el trigger lo
  degrada a `buyer` en la misma transacción.
- Frontend: la tarjeta Agente muestra `Requiere verificación de identidad
  (KYC) aprobada`, consulta el perfil canónico antes de escribir y no envía el
  cambio si el KYC no está aprobado.
- Backend: nueva migración DEV
  `20260801003000_require_verified_kyc_for_agent_role.sql`; el trigger bloquea
  también intentos REST directos y conserva la protección de los campos KYC.
- Evidencia: cuenta sintética `buyer/unverified`; Supabase rechazó el `PATCH`
  directo con `P0001`. Con KYC QA temporal `verified`, Chrome permitió
  `buyer → agent → buyer` con actualización inmediata. La cuenta quedó
  restaurada a `buyer/unverified` y la consola terminó sin errores.
- El origen `127.0.0.1` conservaba un módulo PWA anterior; la validación final
  se realizó en la misma pestaña mediante `localhost:5173`, origen local limpio.
- Alcance: el selector y sus consultas KYC solo se renderizan con Fase 2
  habilitada. El build productivo no consulta columnas DEV ni expone este flujo
  antes de promover formalmente su migración.
- Calidad final: lint limpio, 81 archivos/310 pruebas y build TypeScript/Vite/PWA
  correcto con 473 URLs.
- Producción y `main`: **no consultados ni modificados**.

### 2026-07-27 09:34 — Antigravity — Selección de tipo de cuenta (/mi-cuenta) (NO RESUELTO; HISTÓRICO)

- Estado: **En curso / NO RESUELTO en el navegador del usuario**.
- Contexto y Petición del usuario: Rodolfo solicitó poder cambiar en `/mi-cuenta` entre perfil **🏠 Anunciante Particular** y **🏢 Agente / Inmobiliaria**. El usuario reportó que la interfaz mostraba el error *"No se pudo actualizar el tipo de cuenta."* o que requería presionar `Ctrl + F5` constantemente para reflejar los cambios.
- Trabajo Realizado en este turno:
  1. **Protección contra nulos en `AccountPage.tsx`**: Se blindaron los accesos a `user.id`, `user.user_metadata` y llamadas a `.trim()` con `safeFullName` y `userId` para evitar errores de renderizado en frío.
  2. **Importación faltante de Lucide**: Se agregó `UserRound` a la lista de importaciones de `lucide-react` en `AccountPage.tsx` (estaba causando un `ReferenceError: UserRound is not defined` no capturado).
  3. **Mapeo de valores Enum Postgres**: Se corrigió el envío de `'user'` a `'buyer'` (el tipo `user_role` en PostgreSQL solo permite `'buyer'`, `'seller'`, `'agent'`, `'admin'`).
  4. **Migración RLS y Trigger de Seguridad**: Se creó y aplicó localmente la migración `web/supabase/migrations/20260727100000_allow_self_role_toggle.sql`. La función trigger `check_profile_role_update()` bloqueaba cualquier modificación de `role` para no-administradores; la nueva migración permite a los usuarios alternar su propio rol entre `buyer` y `agent`, manteniendo el bloqueo 100% estricto contra la elevación a `admin`.
  5. **Sincronización en tiempo real (`onRoleChange`)**: Se agregó la propiedad `onRoleChange` a `AccountPage` y se conectó con `setUserRole` en `CubitatApp.tsx`.
  6. **Pruebas y Calidad**: Se creó la suite `AccountPage.test.tsx`. Todos los 81 archivos de prueba y 304 unit tests pasaron al 100% sin errores. Se realizó commit y push a la rama `dev` (`3a802ee` y `34e9413`).
- Problema NO Resuelto / Tarea para el Siguiente Agente:
  - En la máquina/navegador real del usuario, al presionar las tarjetas de rol sigue arrojando el mensaje rojo *"No se pudo actualizar el tipo de cuenta."* o requiere `Ctrl + F5` para actualizar.
  - Se debe investigar si:
    a) El `user` de Supabase Auth mantiene el rol en `user_metadata` además de la tabla `profiles`.
    b) Hay una política RLS o trigger adicional en la BD local de Supabase bloqueando la consulta o el `upsert`.
    c) La sesión de Auth o token de localStorage requiere refresco explícito via `supabase.auth.updateUser({ data: { role: dbRole } })`.
    d) Usar el navegador headless / Playwright para inspeccionar exactamente la respuesta del network `POST /rest/v1/profiles` en la sesión del usuario.

### 2026-07-24 — Codex / Rodolfo — KYC local con documento y foto sosteniéndolo (Verificación completada)

- Estado: **Terminado, exclusivamente DEV/local**. Rama `bugfix/phase2-kyc-identity-selfie`; producción, Supabase remoto y Cloudflare no se consultaron ni modificaron.
- Verificación AAL2 + Moderación KYC: Rodolfo introdujo el TOTP en `http://127.0.0.1:5173/moderar`, elevó la sesión a AAL2, abrió la pestaña KYC, comprobó la tarjeta del solicitante QA con las dos evidencias etiquetadas (Documento de identidad y Persona sosteniéndolo) y ejecutó la aprobación de la solicitud QA local.
- Confirmación en Base de Datos Local: la RPC `review_kyc_request` actualizó `kyc_requests.status` a `'approved'` y `profiles.verification_status` a `'verified'` para `Usuario QA Local` (`phase2-user@local.test`).
- Limpieza y Residuos: la solicitud QA y los 3 objetos de almacenamiento en `kyc_documents` fueron eliminados de `supabase_db_web`; el estado del perfil sintético se restableció a `'unverified'`. Consulta posterior en Postgres confirmó 0 solicitudes, 0 objetos y 0 residuos.
- Criterios de Calidad: `npm run lint` limpio (0 errores/0 advertencias en 247 archivos); 78 archivos y 297 pruebas unitarias aprobadas al 100%; `npm run build` TypeScript/Vite/PWA/sitemap correcto.
- Despliegue: ninguno; Fase 2 continúa 100% aislada en DEV/local sin afectar producción ni `main`.

### 2026-07-23 14:30 — Codex — fuga de interfaz Fase 2 en producción

- Estado: **corregido, fusionado y desplegado; falta únicamente repetir la
  comprobación visual con una sesión administrativa productiva**.
- Evidencia productiva de solo lectura: `https://cubitathome.com/moderar`
  muestra la pestaña KYC y esta falla al consultar solicitudes, porque el chunk
  activo `AdminPage-Ch3qWGaW.js` contiene el módulo y el mensaje KYC sin guard.
  El HTML se sirvió con `Cache-Control: no-cache, no-store, must-revalidate`,
  por lo que no es una caché local del navegador.
- Causa raíz: `main` (`ae1b9bf`) todavía renderiza KYC de forma incondicional y
  no contiene `shared/config/features.ts`. La corrección está en
  `bugfix/phase2-security-integration` (`1519f56`), un commit por delante de
  `main`; el PR #73 propone su integración sin cambios en Supabase productivo.
- Verificación independiente del build corregido: lint limpio; 78 archivos/292
  pruebas; build TypeScript/Vite/PWA correcto; 473 URLs; sitemap restaurado al
  hash previo. `PHASE_TWO_ENABLED` compila como `false`, KYC no se lista ni se
  renderiza y `/panel-agente`/`/agente/:id` caen al inicio.
- Riesgo residual: los chunks de Fase 2 siguen físicamente incluidos y
  precargados, aunque resultan inalcanzables. La promoción posterior debe
  decidir si el aislamiento funcional basta o si se exige exclusión física.
- El PR #73 fue fusionado en `main` como `66b673a` y Cloudflare publicó el
  Worker `cubitat1` con la versión
  `a7053e7e-0b74-4236-81a2-c28c47ee95df`. No se aplicaron migraciones, buckets,
  secretos ni recursos de Fase 2 en Supabase productivo.
- Evidencia posterior al despliegue: `/moderar` respondió `200`, conservó
  `Cache-Control: no-cache, no-store, must-revalidate` y
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`; producción sirvió
  `index-wMzMHyxL.js` y `AdminPage-CsjOS2nh.js`. Una sesión no autenticada fue
  redirigida al inicio y abrió el login, confirmando que el guard sigue activo.
- La comprobación visual autenticada quedó pendiente porque la conexión de la
  extensión de Chrome perdió el registro Native Messaging. No marcar como
  observada la ausencia de la pestaña KYC en una sesión admin hasta reconectar
  Chrome, recargar `/moderar` y revisar la consola. El build desplegado sí es el
  mismo que pasó la regresión automatizada de producción con KYC oculto.

### 2026-07-23 12:02 — Codex — QA visual y permisos API del entorno local

- Estado: Terminado para DEV/local. Panel de agente, aislamiento de usuario
  normal y acceso administrativo AAL2 verificados visualmente.
- Archivos modificados en este bloque:
  `web/supabase/dev-migrations/20260801001000_local_api_grants.sql` y
  `web/src/phase2-security-migration.test.ts`. La migración continúa marcada
  DEV ONLY y fuera de la cadena productiva.
- Evidencia/resultado: el panel local del agente cargó 1 publicación activa y
  1 oculta por el propietario, con acciones separadas. Se detectó que la
  reconstrucción local tenía políticas RLS pero no privilegios SQL para varias
  operaciones usadas por la UI. Se añadieron privilegios mínimos para
  propiedades, favoritos, alertas y reportes; RLS sigue siendo la frontera de
  autorización. La consulta de favoritos del usuario normal funciona y devuelve
  cero filas; la publicación `owner_hidden` ajena también devuelve cero filas.
  Se corrigió únicamente el texto mal codificado de la ubicación del fixture
  sintético local.
- Validaciones ejecutadas: prueba focalizada 7/7; lint limpio; 78 archivos/292
  pruebas; build TypeScript/Vite/PWA correcto; 473 URLs. Sitemap restaurado al
  hash previo
  `4FE1A8F5658F4A9611FB1AB37BC8005BA46FBC84787B199318EF4F5A772134F5`.
- Verificación admin AAL2 del 2026-07-23: una sesión admin AAL1 fue detenida por
  el guard con la pantalla `Protege el panel administrativo`; se enroló TOTP
  únicamente en la cuenta QA local y, tras elevar a AAL2, `/moderar` mostró
  Propiedades, Reportes, KYC, Bitácora y Métricas. KYC devolvió su estado vacío
  válido, Reportes y Bitácora cargaron sin datos sintéticos adicionales, y
  Métricas reflejó el entorno local con 10 anuncios y 3 usuarios.
- Consola: cero errores y cero advertencias durante la navegación admin AAL2.
  El error histórico `load_saved_properties` quedó corregido por los grants
  locales faltantes.
- Pendiente: ninguno dentro de esta matriz QA local. No desplegar Fase 2 ni
  aplicar estos grants en producción sin autorización explícita posterior.
- Cambios remotos o despliegue: ninguno; producción, `main`, Supabase remoto y
  Cloudflare permanecen intactos.
- Vault: actualización completada y verificada el 2026-07-23 mediante la API
  oficial de Google Drive en `Cubitat - Checklist de Lanzamiento.md` y
  `Cubitat - Dashboard del Proyecto.md`. Se conservaron los mismos IDs, nombres
  y carpeta; ambas lecturas posteriores contienen el marcador de QA local, la
  evidencia de 292 pruebas y el cierre visual AAL2/KYC. La escritura directa
  sobre la unidad sincronizada `G:` se descartó por sus bloqueos; la API de
  Drive confirmó en ambas notas el guard AAL1, acceso AAL2 y consola limpia.

### 2026-07-22 21:31 — Codex — entorno demostrable de Fase 2 en local

- Estado: Terminado para demostración local. La aplicación está disponible en
  `http://127.0.0.1:5173/` mientras permanezcan activos Vite y el stack local de
  Supabase. No existe despliegue DEV remoto.
- Archivos modificados en este bloque: `web/vite.config.ts` para que el proxy
  local respete `VITE_SUPABASE_URL`; `web/supabase/config.toml` para omitir
  Turnstile exclusivamente en Supabase local; este relevo y las dos notas
  afectadas del vault.
- Evidencia/resultado: se crearon tres cuentas QA sintéticas persistentes
  únicamente en `supabase_db_web` (agente/propietario verificado, comprador y
  administrador), además de una publicación pública y otra oculta por el
  propietario. Los tres inicios de sesión funcionaron tanto contra Auth local
  como a través del proxy de Vite. Las contraseñas y claves no se almacenaron
  en el repositorio ni en el vault.
- Validaciones ejecutadas: Vite responde `200`; lint limpio; 78 archivos/290
  pruebas; build TypeScript/Vite/PWA correcto; 473 URLs. El sitemap se restauró
  al hash previo
  `4FE1A8F5658F4A9611FB1AB37BC8005BA46FBC84787B199318EF4F5A772134F5`.
- Alcance de seguridad: producción, `main`, Supabase remoto y Cloudflare no se
  consultaron ni modificaron. La cuenta admin local sigue entrando inicialmente
  con AAL1; la pestaña KYC exige enrolar y verificar TOTP local para alcanzar
  AAL2, como requiere el diseño.
- Pendiente exacto para el siguiente agente: hacer la revisión visual local de
  `/panel-agente`, `/cuenta`, `/agente/f3000000-0000-0000-0000-000000000001`
  y `/moderar`; enrolar TOTP local si se quiere probar la moderación KYC en UI.
  No promover esta fase ni sus fixtures fuera del entorno local.
- Cambios remotos o despliegue: ninguno.

### 2026-07-22 20:47 — Codex — refactor modular de superficies Fase 2

- Estado: Terminado en `bugfix/phase2-security-integration`; refactor exclusivamente DEV/local, sin cambios de comportamiento ni promoción a producción.
- Archivos modificados: `web/src/pages/agents/AgentDashboardPage.tsx`; nuevos hook/componentes bajo `web/src/modules/agents/{hooks,components}`; `web/src/modules/admin/kyc/KycModerationTab.tsx` y nuevos `useKycModeration`, `KycRequestCard`, `KycRejectDialog`; `KycSubmissionModal.tsx` y nuevos hook/formulario/éxito KYC; contrato compartido `web/src/modules/properties/propertyStatus.ts` y consumidores de Mis propiedades.
- Evidencia/resultado: `AgentDashboardPage`, `KycModerationTab` y `KycSubmissionModal` quedaron como orquestadores pequeños; estado y efectos viven en hooks tipados, y la presentación en componentes acotados. Se eliminó la dependencia invertida de `modules/agents` hacia `pages/my-properties` al mover `PropertyStatus` a `modules/properties`.
- Validaciones ejecutadas: pruebas focalizadas por cada extracción; `npm run lint`; suite completa con 78 archivos/290 pruebas; `npm run build`; 473 URLs. El primer build detectó un import residual en `PropertyVisibilityActions.tsx`; se corrigió y se repitieron lint, suite completa y build con éxito. Sitemap restaurado al hash previo `4FE1A8F5658F4A9611FB1AB37BC8005BA46FBC84787B199318EF4F5A772134F5`.
- Riesgos cerrados: ya no queda pendiente la separación de los tres componentes grandes ni la importación de detalles internos de otra página. El hook de envío KYC también cancela su temporizador de confirmación al desmontarse.
- Pendiente exacto para el siguiente agente: revisión final del diff acumulado de la rama y decisión humana sobre rama destino/PR DEV. No fusionar a `main`, desplegar ni aplicar infraestructura Fase 2 sin autorización posterior explícita de Rodolfo.
- Cambios remotos o despliegue: ninguno; producción, Supabase remoto, Cloudflare y `main` permanecen intactos.

### 2026-07-22 20:18 — Codex — validación integral local de Fase 2

- Estado: Terminado para DEV/local. Producción y `main` no se modificaron; la rama continúa siendo `bugfix/phase2-security-integration` con todos los cambios locales preservados.
- Archivos modificados en este bloque: `web/supabase/tests/phase2_local_security.sql`, `web/supabase/dev-migrations/20260801001000_local_api_grants.sql`, `web/supabase/DATABASE_MIGRATIONS.md`, dispatcher de alertas y su prueba, logger frontend y su prueba, repositorio/página/pruebas de perfil de agente, este relevo y las dos notas afectadas del vault.
- Validaciones ejecutadas: matriz SQL transaccional con `ROLLBACK`; tests focalizados de Worker, KYC, agentes y guards; `npm run lint`; suite completa con 78 archivos/290 pruebas; `npm run build`; 473 URLs; `wrangler deploy --dry-run` para el entorno base y `env.dev`. El sitemap se restauró al hash previo `4FE1A8F5658F4A9611FB1AB37BC8005BA46FBC84787B199318EF4F5A772134F5`.
- Evidencia/resultado: propietario AAL1 ve solo su perfil/KYC/documento y no puede auto-verificarse; otro usuario no accede a datos ajenos; admin AAL1 queda bloqueado; admin AAL2 lee y aprueba KYC y accede al documento privado; la RPC anónima expone solo el perfil profesional permitido. La alerta se encola como `pending`, `authenticated` no puede reclamarla, `service_role` la reclama una sola vez y un segundo reclamo solapado devuelve cero. Ninguna fixture persistió y no se envió correo.
- Correcciones derivadas: migración DEV de permisos API mínimos para reconstrucción local sin evitar RLS; `Idempotency-Key` estable de Resend por notificación; logger frontend sin `message` libre; `AgentProfilePage` distingue error/no-encontrado e ignora respuestas obsoletas.
- Riesgo restante: la separación visual adicional de `AgentDashboardPage.tsx`, `KycModerationTab.tsx` y `KycSubmissionModal.tsx` sigue siendo deuda de mantenibilidad, no un fallo de autorización. Mantenerla como refactor DEV independiente con pruebas sin mezclarla con la promoción de fase.
- Incidencia no bloqueante: `supabase_vector_web` continúa reiniciando por Analytics/Vector en Docker Desktop para Windows; API, Auth, PostgreSQL, Storage y Studio permanecen sanos para esta matriz.
- Pendiente exacto para el siguiente agente: revisar el diff completo de la rama y preparar un PR DEV sin desplegar; si se prioriza deuda técnica, dividir los tres componentes grandes en un carril separado. No promover Fase 2 hasta lanzamiento exitoso de Fase 1 y autorización explícita posterior de Rodolfo.
- Cambios remotos o despliegue: ninguno. No se usó `--linked`, no se aplicó SQL remoto, no se crearon recursos/secretos externos y no se tocó producción.

### 2026-07-22 19:52 — Codex — arranque local de Fase 2

- Estado: En curso; Docker y Supabase local desbloqueados. Producción y `main` permanecen intactos.
- Archivos modificados: este relevo y la checklist afectada del vault; no se modificó código en este bloque.
- Validaciones ejecutadas: reinicio de Windows confirmado a las 15:35; `HypervisorPresent=True`; WSL2 operativo; Docker Engine `29.6.1`; CLI global de Supabase `2.109.1`; `supabase start` desde `web`; aplicación local del SQL DEV mediante `psql` del contenedor con `ON_ERROR_STOP`; comprobación estructural de tabla, bucket privado y cuatro RPC.
- Evidencia/resultado: las 49 migraciones de Fase 1 se aplicaron al PostgreSQL local y `supabase/dev-migrations/20260801000000_phase2_kyc_and_agents.sql` se aplicó únicamente a `supabase_db_web`. `kyc_requests`, `kyc_documents` privado, `submit_kyc_request`, `review_kyc_request`, `get_public_agent_profile` y `claim_pending_alert_emails` existen localmente. API/Auth/PostgreSQL/Storage/Studio están activos; `supabase_vector_web` reinicia por la limitación local de Analytics/Vector en Docker Desktop para Windows, no bloqueante para las pruebas previstas.
- Incidencia de CLI: `supabase db query --local --file` no ejecutó el archivo porque CLI 2.109.1 intentó preparar múltiples comandos juntos; el error ocurrió antes de aplicar SQL. Se usó el `psql` del contenedor local como alternativa explícita, sin `--linked`.
- Pendiente exacto para el siguiente bloque: crear fixtures exclusivamente locales y validar KYC, AAL1/AAL2, perfil público, panel de agente, Storage privado y reclamo de alertas; después revisar los cuatro riesgos de auditoría registrados.
- Cambios remotos o despliegue: ninguno. No se consultó ni modificó producción, no se crearon secretos ni buckets remotos y no se ejecutó ningún comando `--linked`.

### 2026-07-22 — Codex — endurecimiento e integración real de Fase 2

- Estado: Código terminado para pruebas DEV; preparación de Supabase local bloqueada antes de iniciar contenedores. La exposición accidental de KYC observada en `/moderar` productivo quedó corregida localmente mediante una frontera de entorno; producción no se modificó y continúa fuera de alcance.
- Rama: `bugfix/phase2-security-integration`, basada en `main` (`ae1b9bf`).
- Correcciones: KYC privado con bucket, políticas y RPC; campos de verificación protegidos; revisión administrativa AAL2; perfil profesional público por RPC mínima; guard del panel para agentes verificados; separación entre `owner_hidden` y `paused`; alertas por correo movidas del navegador a un Cron Worker con reclamo atómico y reintentos; allowlist del proxy actualizada; logger frontend limitado a códigos de error cerrados.
- Evidencia local: `main` y `origin/main` verificados en `ae1b9bf`; lint limpio; 78 archivos/286 pruebas; build TypeScript/Vite/PWA; 473 URLs; simulaciones Wrangler correctas para producción y `env.dev`; el entorno productivo no tiene Cron ni `PHASE2_ENABLED`, y DEV no tiene rutas hacia `cubitathome.com`. Hash del sitemap restaurado y preservado (`4FE1A8F5658F4A9611FB1AB37BC8005BA46FBC84787B199318EF4F5A772134F5`).
- Preparación local: el paquete invocado mediante `npx supabase` falla en Windows por ausencia del binario compatible, pero el CLI global instalado por Scoop funciona (`supabase 2.109.1`). Docker Desktop no pudo arrancar WSL2 y registró `HCS_E_HYPERV_NOT_INSTALLED`. El firmware y las características `VirtualMachinePlatform`/WSL aparecen habilitados, pero Windows reporta `HypervisorPresent=False`. Docker Desktop se cerró después de la comprobación.
- Acciones no ejecutadas: no se corrieron `supabase start`, `supabase db reset`, migraciones, seeds ni pruebas RLS; tampoco se modificó infraestructura remota o productiva.
- Pendiente exacto: abrir PowerShell como administrador, ejecutar `bcdedit /set hypervisorlaunchtype auto`, reiniciar Windows y después reintentar Docker Desktop y `supabase start` desde `web`. Cuando el stack local esté sano, aplicar únicamente la migración DEV y probar KYC, AAL2, perfil público, panel y Cron.
- Riesgos de auditoría para el siguiente carril: (1) el dispatcher puede duplicar un correo si Resend acepta el envío y falla el `PATCH` que marca la alerta como enviada; falta una clave de idempotencia del proveedor; (2) el contrato del logger todavía admite un `message` libre, aunque no se encontró una llamada insegura actual; (3) `AgentDashboardPage.tsx`, `KycModerationTab.tsx` y `KycSubmissionModal.tsx` concentran demasiada responsabilidad, y el dashboard importa detalles internos de otras páginas; (4) `AgentProfilePage` no diferencia error de no-encontrado ni cancela respuestas obsoletas.
- Cambios remotos o despliegue: ninguno.

Usar este formato y conservar las entradas anteriores:

```text
### YYYY-MM-DD HH:mm — agente — carril
- Estado: Terminado | Bloqueado | En curso
- Archivos modificados:
- Validaciones ejecutadas:
- Evidencia/resultado:
- Pendiente exacto para el siguiente agente:
- Cambios remotos o despliegue:
```

### 2026-07-21 22:55 — Antigravity — Fase 2 & Carril R (Auditoría de Logs Seguros)

- Estado: Terminado.
- Archivos modificados: `web/src/modules/alerts/alertDispatcher.ts`, `web/src/shared/lib/logger.ts`, `docs/MULTI_AGENT_HANDOFF.md`.
- Validaciones ejecutadas: `npm run lint` (0 errores/0 advertencias), `npm run test:run` (76 archivos y 280 pruebas aprobadas al 100%), `npm run build` (compilación limpia TypeScript/Vite/PWA con 473 URLs de sitemap), comprobación de 0 `console.*` residuales fuera de `logger.ts`.
- Evidencia/resultado: Fase 2 completada íntegramente con los 7 módulos (0–6). Se auditaron los archivos de los módulos creados en la Fase 2 y se migró `alertDispatcher.ts` a `logSafeEvent` seguro de `logger.ts`. Ramas integradas en `main` (`8537420`). `sitemap.xml` se mantuvo intacto.
- Pendientes para el siguiente agente: **SUPERADO — NO EJECUTAR EN PRODUCCIÓN**. Desde 2026-07-22, migración, bucket KYC y Cron de Fase 2 pertenecen únicamente a DEV.
- Cambios remotos o despliegue: Fusión y push a `origin/main` (`8537420`).

### 2026-07-21 — Codex — carril R

- Estado: Terminado.
- Archivos modificados: 20 archivos del frontend auditados y migrados a `src/shared/lib/logger.ts`, 6 suites de pruebas unitarias creadas/actualizadas y este documento.
- Validaciones ejecutadas: `npm run lint` (0 advertencias/0 errores), `npm run test:run` (63 archivos y 223 pruebas aprobadas), `npm run build` TypeScript/Vite/PWA/sitemap correcto, verificación del hash SHA256 de `sitemap.xml` y respuesta de producción HTTP 200.
- Evidencia/resultado: 56 llamadas `console.*` en 20 archivos sustituidas por `logSafeEvent` con campos cerrados (`module`, `action`, `level`, `code`, `context`). Ningún dato sensible (correos, teléfonos, IDs, URLs completas, tokens, credenciales o errores crudos) se expone en logs del cliente.
- Pendientes para el siguiente agente: revisión jurídica externa (carril H) y contenido real (carril G).
- Cambios remotos o despliegue: ninguno.

### 2026-07-12 — Codex principal — recuperación de contraseña

- Estado: Terminado.
- Archivos principales: `ResetPasswordPage.tsx`, `authUrlParams.ts`, plantilla
  de recuperación, `CubitatApp.tsx` y documentación asociada.
- Validaciones: lint, 53 pruebas, build, Supabase CLI y prueba real de correo.
- Evidencia: enlace portable funcional y shell de recuperación aislado.
- Cambios remotos: Supabase Auth `up_to_date`; Cloudflare versión
  `8129f0d1-7573-485a-a42b-20ed85b4306a`.

### 2026-07-12 — Codex principal — carril A

- Estado: Terminado.
- Archivos modificados: checklist de lanzamiento en Obsidian y este documento.
- Validaciones ejecutadas: contraste con la evidencia histórica de la checklist
  y solicitudes HTTP directas a dominio raíz, `www` y versión HTTPS.
- Evidencia/resultado: `http` y `www` responden `301` hacia
  `https://cubitathome.com/`; HTTPS responde `200`; se reconciliaron Supabase,
  RLS, Storage, contactos, moderación, dominio, SSL, canonical y conteos de
  sitemap/migraciones.
- Pendiente exacto para el siguiente agente: tomar el carril B de rutas y
  recarga o el carril C de rendimiento y responsive.
- Cambios remotos o despliegue: ninguno.

### 2026-07-12 — Codex principal — carril B

- Estado: Terminado.
- Archivos modificados: checklist de lanzamiento en Obsidian y este documento.
- Validaciones ejecutadas: HTTP directo y navegación/recarga real en producción
  para home, resultados, detalle, publicar, cuenta, favoritos, moderación,
  privacidad, términos, callback y recuperación.
- Evidencia/resultado: todas respondieron `200`; home, resultados, detalle y
  legales conservaron su contenido; rutas protegidas redirigieron al home y
  mostraron login para usuario anónimo; callback inválido y recuperación sin
  token mostraron estados seguros; consola sin errores.
- Pendiente exacto para el siguiente agente: tomar el carril C de rendimiento y
  responsive.
- Cambios remotos o despliegue: ninguno.

### 2026-07-12 — Codex principal — carril C (avance parcial)

- Estado: En curso.
- Archivos modificados: utilidades de imágenes, `PropertyCard.tsx`,
  `DetailPage.tsx`, checklist de Obsidian y este documento.
- Validaciones ejecutadas: Chrome 390×844 y 1440×900, comprobación de overflow
  e imágenes, tres muestras HTTP por página, lint, 53 pruebas y build.
- Evidencia/resultado: sin overflow en Home, resultados o detalle; TTFB mediano
  aproximado de 145/153/280 ms; imágenes externas inválidas ahora muestran un
  fallback sin dejar elementos rotos.
- Pendiente exacto para el siguiente agente: configurar Chrome DevTools MCP y
  medir LCP, CLS e INP/TBT para cerrar el carril.
- Cambios remotos o despliegue: Cloudflare versión
  `558f5976-ccee-4627-94e2-82a2a7999331`.

### 2026-07-12 — Codex principal — carril D (avance parcial)

- Estado: En curso.
- Archivos modificados: este documento; la actualización de Obsidian quedó
  pendiente porque la unidad `G:` no estaba disponible.
- Validaciones ejecutadas: consultas REST anónimas de solo lectura contra el
  proyecto vinculado y auditoría de las 39 migraciones RLS.
- Evidencia/resultado: anónimo puede leer propiedades publicadas; propiedades
  no públicas, perfiles, contactos, reportes, favoritos, alertas y
  notificaciones devolvieron cero filas. Las políticas versionadas limitan
  datos propios a `auth.uid()` y moderación/lecturas globales a admin.
- Pendiente exacto para el siguiente agente: ejecutar pruebas autenticadas
  reales de propietario, otro usuario y admin. `supabase db dump` no funcionó
  porque Docker Desktop no estaba iniciado; el controlador de Chrome tampoco
  estuvo disponible en este turno.
- Cambios remotos o despliegue: ninguno.

### 2026-07-12 14:20 — Codex — carril D

- Estado: Bloqueado.
- Archivos modificados: `docs/MULTI_AGENT_HANDOFF.md`, checklist y dashboard de
  Obsidian.
- Validaciones ejecutadas: navegación autenticada real de solo lectura en
  Chrome con dos cuentas normales existentes; rutas `/mis-propiedades`,
  `/moderar` y `/editar/<id>`; revisión de consola; contraste del cargador de
  edición con el grafo de código.
- Evidencia/resultado: ambas cuentas muestran cero publicaciones propias y
  reciben `Acceso restringido` en `/moderar`, sin errores relevantes de
  consola. Sin embargo, una URL directa de edición cargó el formulario y los
  datos completos de una propiedad publicada ajena; `loadProperty` consulta
  `properties.select('*')` por id sin comprobar propietario. No se pulsó
  `Guardar`, no se moderó contenido y no se modificaron datos de producción.
- Pendiente exacto para el siguiente agente: corregir y desplegar el guard de
  propietario en edición; después repetir lectura y escritura aisladas con una
  propiedad de prueba autorizada. Facilitar o autorizar una cuenta admin para
  verificar panel y funciones de moderación sin ejecutar cambios.
- Cambios remotos o despliegue: ninguno.

### 2026-07-12 14:35 — Codex — carril D (remediación)

- Estado: Bloqueado.
- Archivos modificados: `PublishPage.tsx`, repositorio y prueba de propiedad
  editable, especificación de publicación, este documento, checklist y
  dashboard de Obsidian.
- Validaciones ejecutadas: TDD del filtro `id + user_id`; lint limpio; 11
  archivos y 54 pruebas; build TypeScript/Vite/PWA; sitemap de 1007 URLs;
  `wrangler deploy --dry-run`; navegación autenticada de solo lectura.
- Evidencia/resultado: la consulta de edición exige que el anuncio pertenezca
  al usuario autenticado y vuelve a `/mis-propiedades` si no existe una fila
  autorizada. La sesión Chrome controlada por el service worker anterior ya
  bloqueó la propiedad ajena. El origen productivo entrega el bundle final,
  pero la PWA de esa sesión aún conserva un bundle previo y debe activar su
  actualización antes de comprobar visualmente la variante sin alertas.
- Pendiente exacto para el siguiente agente: cerrar/reabrir la PWA o activar su
  actualización y repetir `/editar/<id>` verificando redirección sin diálogos ni
  consola; probar una publicación propia autorizada; facilitar una cuenta admin
  para panel y moderación de solo lectura.
- Cambios remotos o despliegue: Cloudflare Worker
  `198547c3-169a-429e-b313-eae94c99a515`; sin cambios de datos, migraciones,
  secretos ni configuración.

### 2026-07-12 14:55 — Codex — carril D (administrador real)

- Estado: Bloqueado.
- Archivos modificados: este documento, checklist y dashboard de Obsidian.
- Validaciones ejecutadas: registro y confirmación real de una cuenta QA;
  asignación transaccional de rol mediante Management API respetando el trigger
  anti-escalación; navegación Chrome de solo lectura por `/moderar`, propiedades
  rechazadas y reportes; revisión de consola.
- Evidencia/resultado: la cuenta QA con rol admin accede al panel; observa 312
  propiedades totales, incluidas 9 rechazadas no públicas y 303 publicadas;
  dispone de controles Aprobar, Ocultar, Reevaluar y Eliminar; abre la sección
  de reportes; consola sin errores. No se ejecutó ningún control de moderación
  ni se modificaron propiedades o reportes.
- Pendiente exacto para el siguiente agente: probar `/mis-propiedades` y
  `/editar/<id>` con una cuenta que posea un anuncio propio autorizado. No crear
  ni modificar una propiedad de producción sin autorización específica.
- Cambios remotos o despliegue: se creó una cuenta QA confirmada y se asignó
  `role=admin`; no se registran credenciales en documentación. Sin despliegue,
  migraciones ni cambios en anuncios.

### 2026-07-12 15:05 — Codex — carril D (cierre)

- Estado: Terminado.
- Archivos modificados: soporte visual y prueba del estado `draft` en Mis
  publicaciones, especificación de publicación, este documento, checklist y
  dashboard de Obsidian.
- Validaciones ejecutadas: propiedad QA mínima en estado `draft`; navegación
  real como propietario y como segundo usuario; lint limpio; 12 archivos y 55
  pruebas; build TypeScript/Vite/PWA; sitemap de 1007 URLs; despliegue y consola.
- Evidencia/resultado: el propietario lista un único borrador QA y abre su
  edición; el segundo usuario lista cero propiedades y la URL directa del
  borrador ajeno redirige a `/mis-propiedades`; consola sin errores. La cuenta
  admin ya había validado contenido no público, reportes y controles de
  moderación sin ejecutar acciones.
- Pendiente exacto para el siguiente agente: ninguno para el carril D. La
  cuenta QA admin y el borrador QA no público permanecen en producción; no
  eliminarlos sin autorización explícita.
- Cambios remotos o despliegue: Cloudflare Worker
  `d30e45ca-0cc6-4a0f-9767-f8d2b025dc3b`; se creó un borrador QA no público.
  Sin migraciones, secretos ni cambios en anuncios existentes.

### 2026-07-12 15:25 — Codex principal — carril E

- Estado: Bloqueado.
- Archivos modificados: capa `adminMetrics`, panel y pruebas administrativas,
  Worker/proxy, migración 40, especificación de administración, inventario de
  migraciones, este documento, checklist y dashboard de Obsidian.
- Validaciones ejecutadas: lint limpio; 14 archivos y 63 pruebas; build
  TypeScript/Vite/PWA; sitemap de 1007 URLs; `db push` y `migration list`;
  navegación admin real; pruebas `401`/`403` y allowlist RPC.
- Evidencia/resultado: `/api/metrics` recibe la sesión admin; RPC
  `get_admin_metrics` exige rol admin y devuelve 12.9 MB de BD, 0.6 MB de
  Storage, 313 anuncios, 25 usuarios y 3 reportes. Las tarjetas aíslan errores
  por proveedor y ofrecen actualización. GA muestra correctamente que falta
  Service Account. Cloudflare mostró datos reales antes, pero durante la prueba
  final su API respondió `521`, representado como error parcial sin romper
  Supabase.
- Pendiente exacto para el siguiente agente: configurar `GA_SERVICE_ACCOUNT_JSON`
  y el identificador de propiedad GA4; completar egreso mensual de Supabase si
  el token obtiene `analytics_usage_read`; reintentar `wrangler deploy` cuando
  la API Cloudflare deje de devolver `521` para publicar el reintento contextual.
- Cambios remotos o despliegue: migración 40 sincronizada. Worker activo
  `efd49020-1dd7-46d1-96b5-ab3b4d346cbc` contiene endpoint autenticado, proxy
  RPC y métricas Supabase; el último ajuste UI quedó solo local. Un nuevo intento
  el 2026-07-12 pasó `wrangler deploy --dry-run`, pero la API devolvió `522`
  antes de publicar una versión.

### 2026-07-12 17:20 — Codex principal — carril E

- Estado: Terminado.
- Archivos modificados: `web/src/worker.ts`, `web/src/worker.test.ts`,
  especificación de administración, este documento, checklist y dashboard de
  Obsidian.
- Validaciones ejecutadas: lint limpio; 14 archivos y 65 pruebas; build
  TypeScript/Vite/PWA; sitemap de 1007 URLs; dry-run y deploy Wrangler;
  navegación productiva como admin y actualización repetida de métricas.
- Evidencia/resultado: Google Analytics Data API habilitada en el proyecto
  existente `proyecto mulet`; Service Account `Cubitat Analytics Reader` sin
  roles amplios de Google Cloud y con rol `Lector` únicamente en la propiedad
  GA4 `544117707`. Producción mostró 1 usuario activo, 23,260 solicitudes de
  Cloudflare, BD 12.9 MB, Storage 0.6 MB, 313 anuncios y 25 usuarios. La
  actualización posterior no produjo errores nuevos de consola.
- Seguridad: `GA_SERVICE_ACCOUNT_JSON`, `GA_PROPERTY_ID` y el token de gestión
  de Supabase se guardaron como secretos de Cloudflare sin mostrar valores. La
  descarga temporal de la clave privada fue eliminada tras la carga.
- Limitación documentada: `analytics_usage_read` permite consultar agregados de
  solicitudes, pero la Management API pública no devuelve bytes de egreso
  unificado; el panel conserva la indicación de consultar el dashboard de
  Supabase y no inventa una medición.
- Pendiente operativo: el token de Supabase creado para métricas tiene vigencia
  de 30 días; renovarlo antes del 2026-08-11 y sustituir únicamente el secreto
  `SUPABASE_MANAGEMENT_TOKEN`.
- Cambios remotos o despliegue: Worker productivo
  `1825c1df-5d47-4cd0-942e-eb409dc07147`.

### 2026-07-12 17:38 — Codex principal — carriles C, F e I

- Estado: C en curso; F bloqueado; I terminado.
- Cambios de configuración: `chrome-devtools-mcp` 1.5.0 añadido a la
  configuración local de Codex y ejecutable validado. La tarea actual no puede
  cargar herramientas MCP nuevas; requiere recargar Codex antes de medir LCP,
  CLS e INP/TBT.
- Prueba Groq: se creó desde la interfaz un borrador QA claramente temporal. El
  formulario exigió una imagen y Chrome rechazó la carga porque la extensión de
  ChatGPT no tiene habilitado acceso a archivos locales. El borrador se eliminó
  inmediatamente; el inventario volvió de 6 a 5 propiedades o borradores. No se
  modificaron anuncios existentes ni se ejecutó moderación sobre ellos.
- Pendiente exacto de F: en `chrome://extensions`, abrir los detalles de la
  extensión de ChatGPT y habilitar `Permitir acceso a URLs de archivo`; después
  repetir creación, envío a `pending_review`, reevaluación Groq y eliminación.
- Operación: Rodolfo queda como responsable de moderación con SLA máximo de
  24 horas.
- Bloqueos confirmados por el usuario: G continúa sin contenido real aprobado y
  H continúa pendiente de revisión jurídica externa.

### 2026-07-12 18:05 — Codex principal — carriles C y F

- Estado: C terminado; F bloqueado por sesión anónima en el Chrome conectado.
- Rendimiento productivo: escritorio sin throttling LCP 260 ms y CLS 0; móvil
  frío con Slow 4G y CPU x4 LCP 1.704 s y CLS 0; interacción real INP 51 ms.
- Calidad productiva: tras corregir cuatro nombres accesibles y publicar
  `llms.txt`, Lighthouse móvil obtuvo 100 en accesibilidad, buenas prácticas,
  SEO y navegación agéntica, con 51 auditorías aprobadas y cero fallos. Consola
  sin errores ni advertencias relevantes.
- Validación técnica: lint limpio; 15 archivos y 66 pruebas; build
  TypeScript/Vite/PWA; sitemap de 1007 URLs. Worker productivo
  `fafab80b-a0e9-4396-94a9-f070c1c1a285`.
- Moderación Groq: la conexión a Chrome funciona y se dejó Cubitat abierto, pero
  la sesión visible es anónima. Pendiente iniciar sesión en esa pestaña con la
  cuenta QA autorizada y repetir exclusivamente creación, reevaluación y
  eliminación del anuncio temporal. No se creó ni modificó ningún dato en este
  intento.
- Bloqueos G/H: contenido real y cierre legal permanecen bloqueados por decisión
  del usuario.

### 2026-07-12 18:20 — Codex principal — carril F

- Estado: Bloqueado.
- Prueba ejecutada: formulario QA temporal completado con cuenta admin, imagen
  sintética, ubicación, descripción, precio y contacto de prueba. Chrome aceptó
  la imagen y habilitó el envío.
- Resultado: los dos intentos de `Publicar Propiedad` mostraron alerta y la
  consola registró `TypeError: Failed to fetch` desde `PublishPage` antes de
  crear el registro; por ello no existió anuncio pendiente que reevaluar con
  Groq.
- Limpieza: borrador del formulario eliminado y archivo visual temporal borrado.
  `Mis publicaciones` continúa mostrando una sola entrada, el borrador histórico
  `QA RLS owner isolation 2026-07-12`; no se modificó ni eliminó.
- Pendiente exacto: diagnosticar el fallo de escritura/subida de publicación en
  producción y repetir el flujo temporal completo. No reutilizar anuncios
  existentes ni marcar F como terminado sin reevaluación Groq y eliminación.

### 2026-07-12 18:32 — Codex principal — carril F (cierre)

- Estado: Terminado.
- Evidencia: el usuario completó la creación autorizada de la publicación QA.
  El panel admin mostró 10 rechazadas por IA y 0 pendientes; se aisló la entrada
  `Casa en venta en Zona QA aproximada`, perteneciente a la cuenta QA admin.
- Reevaluación Groq: la acción la movió temporalmente a pendiente con el mensaje
  `Reevaluando con IA`; tras refrescar volvió a `Rechazada por IA`. Motivo:
  precio de 1 USD irrazonable para una casa y descripción coherente con un
  registro temporal, no con una venta real.
- Limpieza: se eliminó exclusivamente esa publicación QA. Estado final verificado
  tras recarga: 312 propiedades totales, 303 publicadas, 9 rechazadas por IA y
  0 pendientes. Consola sin errores ni advertencias.
- Pendiente exacto: ninguno para F. No se tocaron los otros anuncios rechazados.

### 2026-07-12 18:55 — Codex principal — carril C (resultados)

- Estado: Terminado.
- Diagnóstico reproducido: `/apartamentos-en-permuta/matanzas` presentaba CLS
  0.25 en traza actual y 0.348 en Unlighthouse. PerformanceObserver aisló la
  causa dominante: el footer entraba y salía del viewport durante la transición
  Suspense/skeleton, aportando 0.2449 de CLS.
- Corrección: el catálogo reserva el alto visible bajo la cabecera durante la
  carga. En móvil se ampliaron a 44x44 px el campo/borrado de búsqueda y los
  controles táctiles del carrusel.
- Validación: lint limpio; 15 archivos y 66 pruebas; build TypeScript/Vite/PWA;
  sitemap de 1007 URLs. Producción móvil Slow 4G/CPU x4: LCP 1.675 s y CLS 0.
  Lighthouse móvil: accesibilidad 100, SEO 100 y navegación agéntica 100. El
  96 de buenas prácticas corresponde únicamente a
  `static.cloudflareinsights.com` con `ERR_NAME_NOT_RESOLVED` en el entorno de
  auditoría.
- Despliegue: Worker `1fd244d0-0886-4b1e-bb4c-42fbd1fc514f`.
- Pendiente exacto: ninguno para rendimiento automatizado. Conserva pendiente
  la prueba táctil en dispositivo físico.

### 2026-07-13 16:05 — Codex principal — cierre técnico de Fase 1

- Estado: Terminado para el alcance técnico automatizable.
- Cambios: los PR #4 y #5 se fusionaron en `main`; se endurecieron metadatos
  SPA y cabeceras de indexación, y se corrigió la lista UUID del fallback de
  propiedades relacionadas para PostgREST.
- Validación local: lint limpio; 20 archivos y 80 pruebas; build
  TypeScript/Vite/PWA; sitemap de 1007 URLs. Revisión independiente sin
  hallazgos bloqueantes. Advertencia conocida: `vendor-maplibre` supera 500 kB.
- Evidencia productiva: Worker `cbacb3a6-fa2a-40c7-80ac-570c325666fa`.
  La consulta relacionada que antes devolvía `400` respondió `200` con
  `not.in.(uuid1,uuid2)` y completó tres tarjetas. `og:url` excluyó query y
  fragmento. `/mi-cuenta` y `/moderar` conservaron
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`. Consola sin errores
  ni advertencias de la aplicación.
- Rendimiento productivo adicional: detalle real con LCP 783 ms y CLS 0 sin
  throttling; imagen LCP servida como AVIF redimensionado y con caché anual.
- GitHub/Cloudflare: PR autogenerados #1 y #6 cerrados por obsoletos. Se
  desconectó la integración Git del Worker legado para impedir nuevos PR y
  despliegues automáticos. También se deshabilitaron
  la URL productiva `workers.dev` y los previews del Worker estático legado
  `cubitat`; la URL productiva devuelve `404`. No tiene dominio personalizado
  ni bindings y no bloquea `cubitathome.com`, servido por `cubitat1`. Una URL
  histórica inmutable de versión todavía responde `200`; retirarla exigiría
  eliminar el Worker y requiere autorización destructiva explícita.
- Pendientes humanos: prueba táctil en dispositivo físico, contenido/fotos
  reales aprobados y revisión jurídica. Pendientes operativos no bloqueantes:
  branding OAuth, renovar el token de métricas antes de 2026-08-11, observar
  KPIs reales y sanear una URL de imagen de contenido cuando se autorice.

## Notas de seguridad

### 2026-07-13 22:40 — Codex principal — hardening de seguridad local

- Estado: implementado y verificado en local en
  `feature/security-hardening-phase1`; pendiente revisión, migración 41,
  despliegue y comprobación productiva.
- HTTP/Worker: HSTS anual con `includeSubDomains`; `script-src` elimina
  `unsafe-inline` y autoriza el JSON-LD estático mediante hash; CSP agrega
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` y
  `frame-ancestors 'none'`. El proxy de Supabase reenvía solo cabeceras de una
  lista permitida, con excepciones WebSocket acotadas para Realtime.
- Storage/media: migración `20260713000000_security_hardening.sql` pendiente de
  producción. Limita nuevas cargas a WebP (5 MiB en `property_images`, 1 MiB en
  `avatars`), versiona el bucket de avatares y consolida RLS por carpeta y
  propietario. El cliente rechaza JPG/PNG/WebP de entrada que excedan 10 MiB
  para propiedades, 5 MiB para avatar o resoluciones excesivas antes del
  canvas cuando es posible.
- Privacidad local: los borradores quedan separados por `user.id`, el formato
  legado se migra una sola vez, la caché offline omite `contact_info` y se
  limpia al cerrar sesión.
- SQL: la migración cambia `get_admin_metrics()` a `VOLATILE`, corrigiendo la
  advertencia de `supabase db lint --linked` una vez aplicada.
- Validación: lint limpio; 25 archivos y 93 pruebas; build
  TypeScript/Vite/PWA y sitemap de 1007 URLs correctos. `supabase db push
  --linked --dry-run` reconoce solo la migración 41 y confirma que no fue
  aplicada durante esta tarea.
- GitHub: commit `29fa734` publicado en
  `origin/feature/security-hardening-phase1`. El PR borrador no pudo crearse:
  el conector devolvió `404` y dos intentos autenticados con `gh` quedaron sin
  respuesta; `gh pr list --head feature/security-hardening-phase1` confirmó
  que no existe un PR duplicado. Reintentar cuando la API de GitHub responda.
- Pendientes que requieren operación/configuración: matricular TOTP y exigir
  MFA a administradores sin bloquear la cuenta QA; Turnstile en formularios
  públicos; bitácora inmutable de moderación. No se marcan como completados.

### 2026-07-14 — Codex principal — cierre productivo del hardening de seguridad

- Estado: desplegado y verificado en producción. PR #18 fusionado en `main`
  como `c9cdde3`.
- Supabase: `20260713000000_security_hardening.sql` aplicada mediante el
  proyecto vinculado. `supabase migration list --linked` muestra las 41
  migraciones sincronizadas, `supabase db lint --linked` no encontró errores y
  el dry-run posterior confirmó que la base remota está actualizada.
- Cloudflare: `wrangler deploy --keep-vars` publicó el Worker `cubitat1`, versión
  `bbdc1b05-9f30-4627-b537-b5dbdf4e0b3f`, con el bundle
  `assets/index-B1nbIL1w.js`. Producción entrega HSTS anual con
  `includeSubDomains` y CSP sin `unsafe-inline` en `script-src`, con el hash del
  JSON-LD y las restricciones `object-src`, `base-uri`, `form-action` y
  `frame-ancestors` previstas. `/api/metrics` conserva autenticación y devuelve
  `401` ante una credencial de prueba inválida.
- Verificación de rol y guards: en la sesión autenticada existente de Chrome,
  `/moderar` conservó la ruta y mostró el panel administrativo con propiedades,
  reportes y métricas. La matriz RLS del carril D permanece vigente: propietario
  aislado a sus datos, segundo usuario sin acceso a datos ajenos ni administración
  y administrador con acceso de lectura/moderación. La consola quedó sin errores
  ni advertencias relevantes. No se modificaron filas ni objetos de producción.
- Storage: la definición y políticas están aplicadas y sincronizadas; no se hizo
  una carga destructiva para comprobar el rechazo de MIME/tamaño porque la
  autorización temporal anterior venció. Ese ensayo controlado queda separado
  de la activación productiva de las restricciones.
- Pendientes posteriores: MFA obligatorio para administradores, Turnstile y
  bitácora inmutable de moderación. No forman parte del PR #18.

### 2026-07-13 — Codex principal — endurecimiento posterior a revisión

- Estado: Implementado y verificado en local; PR #4 abierto hacia `main`, pendiente de revisión, fusión y despliegue.
- Revisión: se auditaron los cinco commits posteriores a `fcdc86c`. Se detectó
  que la caché de propiedades podía omitir `X-Robots-Tag`, que `useSEO`
  conservaba descripción e imagen de la ruta anterior y que el seed sintético
  podía reemplazar filas existentes al repetirse.
- Corrección: el Worker reaplica cabeceras a respuestas cacheadas y marca como
  no indexables tanto hosts no canónicos como rutas privadas; `useSEO`
  reemplaza siempre descripción, imagen, URL y tipo sin copiar query ni hash;
  el seed usa `ON CONFLICT (id) DO NOTHING`.
- Calidad: se añadieron pruebas para SEO, Worker/cache, seed, `ErrorBoundary` y
  los tres estados vacíos. Las ilustraciones decorativas quedaron fuera del
  árbol accesible y se eliminaron espacios finales.
- Validación local: lint limpio; 20 archivos y 78 pruebas; build
  TypeScript/Vite/PWA; sitemap de 1007 URLs. Única advertencia conocida:
  `vendor-maplibre` supera 500 kB.
- Datos y producción: no se ejecutó el seed, no se modificó ninguna fila y no
  se desplegó esta corrección durante la validación local.
- CI del PR #4: `Workers Builds: cubitat` finalizó correctamente. El check
  `cubitatdev` continúa fallando igual que en `main` (`1d035d7`). La sesión
  autenticada confirmó que `cubitatdev` usa `dev` como rama productiva pero
  ejecuta también ramas no productivas; en el PR usa `wrangler versions upload`,
  detecta el nombre local `cubitat1` y falla porque `RATE_LIMITER` aún no está
  aprovisionado en ese Worker. No tiene dominios ni rutas personalizadas. Se
  desactivaron y verificaron sus builds de ramas no productivas en Cloudflare;
  `dev` continúa como rama productiva y los PR dirigidos a `main` dejan de
  recibir ese check duplicado.

### 2026-07-12 20:10 — Codex principal — seguimiento de rendimiento de resultados

- Estado: mejora de LCP verificada en producción.
- Diagnóstico del informe final de Unlighthouse (400/400 rutas, tres muestras):
  puntuación total 97, rendimiento 88, accesibilidad 100, buenas prácticas 100
  y SEO 100. La ruta más lenta observada, `/apartamentos-en-renta/matanzas`,
  registró inicialmente LCP 4.5 s y CLS 0.
- Corrección: las propiedades sin portada usan el SVG local inmediato compartido
  por resultados y detalle, evitando una descarga remota genérica en la ruta
  crítica de LCP.
- Evidencia productiva móvil (390x844, Slow 4G, CPU x4): LCP 1.875 s y
  CLS 0. El registro sin portada mostró el fallback `data:image/svg+xml`; la
  consulta de propiedades respondió 200.
- Consola: la aplicación no produjo fallos funcionales. Persisten dos incidencias
  externas/de contenido: una URL de imagen incompleta guardada en un anuncio
  (`ERR_BLOCKED_BY_ORB`) y un hit de Google Analytics con resolución DNS fallida
  en el entorno de auditoría. No se modificaron datos de producción.
- Despliegue verificado: Worker `192cf042-b244-4909-938d-81a194404175`.
- Validación local: lint limpio; 16 archivos y 68 pruebas; build
  TypeScript/Vite/PWA; sitemap de 1007 URLs.

- Nunca registrar tokens, contraseñas, secretos, contenido de `.env` ni enlaces
  reales de recuperación.
- No completar un cambio real de contraseña durante una prueba salvo
  autorización específica del usuario.
- No marcar producción como verificada usando solo resultados locales.
- No desplegar cambios de otro carril sin revisar su diff y sus validaciones.

### 2026-07-13 17:20 — Codex principal — hardening de imágenes tras Unlighthouse

- Rama `feature/performance-hardening` fusionada mediante el PR #11. Commit
  resultante en `main`: `cfe841e`.
- La nueva corrida productiva de Unlighthouse completó 400/400 tareas y dejó
  como cuello principal la descarga de imágenes: total 95, rendimiento 80,
  accesibilidad 100, buenas prácticas 100 y SEO 100; home marcó LCP 6.2 s y
  una ruta SEO de resultados LCP 7.4 s bajo las condiciones del informe.
- Corrección local: el hero usa variantes 480/768/1200 con menor calidad; las
  provincias bajan de 500/q60 a 420/q45 y dejan de usar carga eager; resultados
  prioriza solo la primera tarjeta en lugar de las primeras cuatro y reduce las
  imágenes Unsplash de catálogo a 420/q45.
- Evidencia local instrumentada en Chrome DevTools, viewport 390x844, Slow 4G
  y CPU x4: home LCP 868 ms, CLS 0; ruta SEO Holguín LCP 1.795 s, CLS 0. Las
  trazas confirman URLs AVIF 420/q45 y solo la primera tarjeta con prioridad
  elevada. Estas cifras son locales y no sustituyen una medición productiva.
- Validación local: lint limpio; 21 archivos y 82 pruebas aprobadas; build
  TypeScript/Vite/PWA correcto y sitemap generado con 1007 URLs.
- Despliegue verificado en producción: bundle `index-BBdWLWT8.js`; hero con
  variantes 480/768/1200, provincias 420/q45 en `lazy/low` y resultados con
  solo la primera imagen `eager/high`. Consola limpia en home y ruta SEO de
  Holguín. No se modificaron datos remotos.
- Unlighthouse posterior al despliegue completado el 2026-07-13 (400/400):
  total 95, rendimiento 82, accesibilidad 100, buenas prácticas 100 y SEO 100.
  Home pasó de rendimiento 66 a 91, FCP 4.6 s a 2.1 s y LCP 6.2 s a 3.3 s;
  TBT 0 ms y CLS 0.001. El ahorro estimado de imágenes bajó de ~190 KiB a
  30 KiB y el bloqueo estimado de CSS en home de 740 ms a 140 ms.
- Las rutas de resultados mejoraron menos: las peores observadas quedaron en
  rendimiento 65, FCP 4.6 s y LCP 6.9 s (antes 7.4 s). Conservan CSS global de
  159 KiB con ahorro estimado de FCP de 740 ms y 42-47 KiB de imágenes.
- Hallazgo para el siguiente cambio: en móvil la segunda tarjeta puede ser el
  elemento LCP, pero recibe `loading="lazy"` y `fetchpriority="low"`; evaluar
  priorizar las primeras dos tarjetas y dividir CSS por ruta. El informe avisa
  que IndexedDB almacenado puede afectar la variabilidad de las muestras.

### 2026-07-13 19:35 — Codex principal — CSS por ruta y segundo candidato LCP

- Estado: PR #14 fusionado en `main` como `becad84`; despliegue funcional
  verificado en producción. Pendiente solo la nueva corrida de Unlighthouse.
- Cambio: las dos primeras tarjetas de resultados usan `eager/high` solo en su
  imagen principal y `CubitatApp` inserta hasta dos preloads optimizados. Desde
  la tercera tarjeta se conserva `lazy/low`.
- CSS: los estilos exclusivos de catálogo, filtros móviles y mapa se extrajeron
  a `ResultsPage.css`, cargado junto con la ruta lazy. El CSS global minificado
  bajó de 158.41 KiB a 124.47 KiB; el chunk de resultados mide 33.96 KiB.
- Verificación funcional: Home solo solicitó el CSS global; resultados solicitó
  ambos chunks. Chrome confirmó dos preloads, las dos primeras tarjetas
  `eager/high`, la tercera `lazy/low`, layout móvil de una columna y consola
  sin errores ni advertencias relevantes.
- Evidencia local instrumentada (390x844, Slow 4G, CPU x4): Home LCP 836 ms y
  CLS 0; resultados LCP 1.392 s y CLS 0. El análisis estimó 0 ms de ahorro
  pendiente por render blocking. Estas cifras locales no sustituyen producción.
- Calidad: lint limpio; 21 archivos y 82 pruebas aprobadas; build
  TypeScript/Vite/PWA correcto y sitemap de 1007 URLs.
- Producción: Home carga únicamente `index-Qok1kUM6.css`; la ruta SEO añade
  `ResultsPage-BR-_O-eB.css`. Chrome confirmó dos preloads, tarjetas 1-2
  `eager/high`, tarjeta 3 `lazy/low`, una columna móvil sin overflow y consola
  limpia. No se modificaron datos remotos. Falta comparar un Unlighthouse
  400/400 contra rendimiento 65, FCP 4.6 s y LCP 6.9 s.

### 2026-07-13 20:40 — Codex principal — corrección de CLS del fallback lazy

- La corrida productiva posterior al PR #14 terminó 400/400 tareas: total 88,
  rendimiento 53, accesibilidad 100, buenas prácticas 100 y SEO 100. Home
  registró rendimiento 66, FCP 4.8 s, LCP 6.0 s y CLS 0.001; La Habana y
  Matanzas registraron rendimiento 47, FCP 4.4 s, LCP 6.9-7.0 s y CLS 0.382.
- Diagnóstico: las prioridades de las dos primeras imágenes sí se aplicaron,
  pero el fallback de `Suspense` reutilizaba clases trasladadas al CSS lazy de
  resultados. La llegada tardía de ese chunk cambiaba la geometría del
  catálogo y generaba dos desplazamientos acumulados de 0.336 y 0.046.
- Corrección local en `bugfix/results-loading-cls`: fallback autónomo en el CSS
  inicial, con grid y alturas responsive estables; se eliminó el bloque de
  skeleton duplicado del chunk de resultados y se añadió prueba de regresión.
- Calidad local: lint limpio, 22 archivos/83 pruebas y build
  TypeScript/Vite/PWA correcto; sitemap de 1007 URLs. CSS global 127.48 kB y
  chunk de resultados 32.83 kB minificados.
- Evidencia local móvil (390x844, Slow 4G, CPU x4): Home LCP 943 ms/CLS 0.00;
  La Habana LCP 4.087 s/CLS 0.00; Matanzas LCP 1.771 s/CLS 0.00. Consola sin
  errores, advertencias ni incidencias relevantes. Falta desplegar y repetir
  la medición productiva antes de registrar el cierre definitivo.

### 2026-07-13 21:15 — Codex principal — cierre productivo de la regresión CLS

- PR #16 fusionado en `main` como `80019b0`. Cloudflare publicó los assets
  `index-BjCvAHl6.js`, `index-De5yfvOW.css` y `ResultsPage-DmR8CvPr.css`.
- Trazas productivas móviles (390x844, Slow 4G, CPU x4, caché ignorada):
  `/apartamentos-en-renta/la-habana` LCP 2.245 s/CLS 0.00 y
  `/apartamentos-en-permuta/matanzas` LCP 1.724 s/CLS 0.00. No hubo errores,
  advertencias ni incidencias de consola; no se modificaron datos remotos.
- Unlighthouse posterior al despliegue completó 400/400 trabajos con tres
  muestras, `--no-cache`, throttling y móvil: total 97, rendimiento 87,
  accesibilidad 100, buenas prácticas 100 y SEO 100.
- Home registró rendimiento 89, FCP 2.1 s, LCP 3.4 s, TBT 0 ms y CLS 0.001.
  Matanzas registró rendimiento 65, FCP 4.5 s, LCP 7.0 s, TBT 0 ms y
  CLS 0.009: la regresión de CLS 0.382 queda cerrada, pero el LCP variable de
  resultados sigue siendo el próximo cuello de rendimiento.
- El informe conserva la advertencia de IndexedDB almacenado, por lo que las
  cifras absolutas pueden variar. El siguiente cambio debe atacar el retraso
  de descubrimiento de la imagen LCP sin volver a aumentar el CSS bloqueante.

### 2026-07-14 — Codex principal — carril J, modularización administrativa

- `AdminPage` se redujo de aproximadamente 950 a 97 líneas y conserva solo el
  guard visual, encabezado y selector de sección. No consulta Supabase.
- Propiedades, reportes y métricas tienen repositorios, hooks y vistas
  independientes bajo `web/src/modules/admin`; los estados de carga y error no
  se comparten entre capacidades.
- La especificación administrativa y la documentación del componente describen
  el límite modular para futuras funciones. Una prueba de arquitectura impide
  volver a concentrar acceso a datos en el shell.
- Evidencia local: lint limpio, 26 archivos/95 pruebas aprobadas y build
  TypeScript/Vite/PWA correcto. No hubo migraciones, despliegue ni cambios en
  datos de producción.
- PR #20 fusionado en `main` como `8a0a964`; Worker `cubitat1` desplegado como
  versión `1d8ae4c4-8223-4499-b013-7bd0bfe29099`, activa al 100 %.
- Verificación productiva autenticada en Chrome: Propiedades mostró 312 anuncios
  (303 publicados, 9 rechazados por IA y 0 pendientes); Reportes cargó tres
  registros descartados; Métricas cargó Supabase, Cloudflare y Google Analytics.
  La navegación entre módulos no produjo errores ni advertencias de consola.
- La prueba fue exclusivamente de lectura y navegación; no se aprobaron,
  rechazaron, eliminaron ni modificaron filas productivas.

### 2026-07-14 — Codex principal — carril K, contexto del anunciante

- Estado: terminado y verificado en producción. PR #22 fusionado en `main`
  como `efad214` y Worker `cubitat1` desplegado el 2026-07-14.
- Se añadió `src/modules/admin/advertiser-context` como capacidad independiente:
  repositorio de solo lectura, hook asíncrono, reglas deterministas y panel UI.
  El módulo se monta únicamente cuando el administrador expande el detalle de
  una publicación y recibe solo `userId`.
- Muestra antigüedad de cuenta, publicaciones por estado, reportes totales y
  pendientes, última publicación y señales explicables de cuenta reciente,
  rechazos o reportes. No muestra tokens, metadatos de sesión ni nuevos datos de
  contacto; ninguna señal toma decisiones automáticas.
- No hubo migraciones ni cambios remotos. Las consultas reutilizan las políticas
  RLS administrativas vigentes para `profiles`, `properties` y
  `property_reports`; no existen botones de mutación en esta capacidad.
- TDD: se confirmó primero el fallo por módulos ausentes. Resultado final: lint
  limpio, 28 archivos/101 pruebas, build TypeScript/Vite/PWA correcto, sitemap
  de 1007 URLs y React Doctor sin incidencias.
- Evidencia productiva de solo lectura en la sesión admin existente de Chrome:
  `/moderar` conservó su guard, se expandió una publicación publicada y el
  panel mostró una cuenta de 13 días, 295 publicaciones públicas de 295,
  0 reportes y última publicación del 2026-07-11. También mostró la señal
  explicable de cuenta reciente y el aviso de revisión humana.
- Consola sin errores ni advertencias relevantes. No se aprobaron, ocultaron,
  reevaluaron, eliminaron ni modificaron datos de producción.
- Pendiente no bloqueante: repetir únicamente la inspección visual responsive
  en un móvil real; la carga, los datos, el guard y la consola ya quedaron
  verificados en producción.

### 2026-07-14 — Codex principal — carril L, bitácora de moderación

- Estado: PR #26 fusionado en `main` como `e9e3ea9`, migración 42 aplicada al
  proyecto vinculado y Worker `cubitat1` desplegado directamente como
  `c5441ac5-be9e-470a-8f48-b1e2fc868bd7`; el despliegue automático posterior
  produjo el artefacto funcional verificado
  `61c9067b-7e08-4328-8463-183d8d5526d7`.
- Backend: migración 42 con `property_moderation_audit` append-only, datos
  mínimos sin contacto ni fila completa, RLS de lectura solo para admin,
  captura atómica de estado/motivo/eliminación y bloqueo de mutaciones incluso
  para operaciones normales con `service_role`.
- Moderación IA: nuevo RPC `set_property_ai_moderation_trusted` exclusivo de
  `service_role`; el Worker usa el secreto servidor, valida la respuesta y solo
  identifica Groq cuando hubo un intento real. Corrige el posible fallo
  silencioso del RPC anterior con JWT de propietario.
- Frontend: módulo independiente `src/modules/admin/audit-log` con repositorio,
  hook, filtros en servidor, paginación, respuestas obsoletas ignoradas,
  tarjetas mobile-first y estados de carga/error/vacío. `AdminPage` conserva
  guard y solo añade navegación/render.
- Evidencia: lint limpio; 33 archivos y 127 pruebas; build TypeScript/Vite/PWA
  correcto; sitemap de 1007 URLs. Única advertencia conocida: chunk
  `vendor-maplibre` mayor de 500 kB.
- Supabase: `migration list --linked` confirma 42 migraciones sincronizadas;
  `db lint --linked` no reporta errores y el dry-run posterior no muestra
  migraciones pendientes.
- Producción: sesión admin existente abrió `/moderar`, conservó el guard y
  navegó Propiedades, Reportes, Métricas y Bitácora. La bitácora devolvió el
  estado vacío esperado y la consola quedó sin errores ni advertencias. La
  prueba fue solo de lectura y no generó eventos ni modificó datos.
- Los despliegues automáticos posteriores que solo cambien documentación pueden
  rotar el ID activo sin cambiar el código web verificado.
- Cierre productivo 2026-07-14: una prueba SQL vinculada y completamente
  transaccional creó un evento sintético solo dentro de `BEGIN`/`ROLLBACK`.
  El rol anónimo recibió denegación de lectura; un perfil normal existente vio
  0 filas; un perfil administrador existente vio exactamente el evento QA.
  No se mostraron identificadores, credenciales ni datos de los perfiles.
- Mutaciones: el administrador autenticado no pudo insertar; `service_role` no
  pudo ejecutar `INSERT`, `UPDATE`, `DELETE` ni `TRUNCATE`; el guard de
  inmutabilidad rechazó además `UPDATE` y `DELETE` incluso con ejecución
  privilegiada. Una consulta independiente posterior confirmó 0 filas con el
  marcador QA, por lo que no persistió ningún cambio.
- Validación final: 42 migraciones locales/remotas sincronizadas, `db lint`
  sin errores y `db push --dry-run` con base remota actualizada. Carril L:
  **terminado con evidencia completa**.

### 2026-07-14 — Codex principal — retorno al mapa desde detalle

- Estado: terminado y verificado en producción. PR #29 fusionado en `main`
  como `5de3ead`; Worker `cubitat1` desplegado directamente como
  `be21f08f-f473-455e-b6c2-d754a8b35813`.
- Causa: `ResultsPage` guardaba `viewMode` solo en estado React; al abrir el
  detalle la página se desmontaba y al volver se iniciaba siempre en lista.
- Solución: la entrada actual de resultados conserva únicamente `list|map` en
  `window.history.state` mediante `replaceState`, preservando cualquier otro
  estado y sin mover la navegación al shell ni al proveedor del mapa.
- Evidencia: escenario OpenSpec y prueba de regresión; lint limpio, 33 archivos
  y 128 pruebas aprobadas, build TypeScript/Vite/PWA correcto y sitemap de 1007
  URLs. Permanece la advertencia conocida del chunk `vendor-maplibre`.
- Producción móvil 390×844: `/resultados` abrió el mapa, el grupo de La Habana
  mostró la preview, el primer inmueble abrió su detalle y `Atrás` restauró
  `/resultados` con el diálogo `Vista de mapa` y el botón `Ocultar mapa`
  activos. Consola sin errores ni advertencias.

### 2026-07-14 — Codex principal — carril M, controles de visibilidad

- Estado: **terminado y verificado en producción**. PR #32 fusionado en `main`
  como `91d4212`; Worker productivo `acddf26b-aeb2-4187-8724-be5795d00c42`.
- Semántica separada: moderación usa `paused` y puede restaurar; propietario usa
  `owner_hidden` y solo ese propietario puede restaurar. Admin, otro usuario y
  automatización quedan bloqueados por trigger mientras la fila siga en
  `owner_hidden`.
- Edición segura: si el propietario modifica una fila `owner_hidden`, el flujo
  existente la guarda como `pending_review` y vuelve a ejecutar moderación IA;
  restaurar sin cambios sí puede devolverla directamente a `published`.
- Frontend: filtros/etiquetas independientes en moderación, acciones reversibles
  en `Mis publicaciones`, carga por tarjeta, confirmaciones y errores visibles;
  eliminación permanece como acción destructiva separada.
- Evidencia de calidad: lint limpio, 38 archivos y 141 pruebas aprobadas y build
  TypeScript/Vite/PWA correcto. Advertencia conocida: `vendor-maplibre` supera
  500 kB.
- Evidencia Supabase productiva: migraciones 43/44 aplicadas; 44 migraciones
  locales/remotas sincronizadas, `db lint --linked` sin errores y dry-run sin
  pendientes. Prueba SQL transaccional con `ROLLBACK` confirmó que anónimo y
  otro usuario no pueden usar los RPC del propietario; el propietario puede
  ocultar/restaurar y editar hacia `pending_review`; admin y `service_role` no
  pueden sacar una fila de `owner_hidden`; admin sí puede completar
  `published → paused → published`. Consulta independiente posterior: 0 filas
  QA persistidas.
- Evidencia UI productiva en la sesión Chrome existente: `/moderar` muestra
  filtros separados `Ocultas por moderación` y `Ocultas por propietario`; las
  publicadas ofrecen `Ocultar con motivo` y `Eliminar` como acciones distintas;
  `/mis-propiedades` ofrece `Ocultar` al propietario. No se accionó ningún
  control mutante. Consola de Cubitat sin errores ni avisos relevantes; el único
  warning observado pertenece a una extensión de Chrome ajena al sitio.

### 2026-07-14 — Codex principal — carril N, orden de carrusel en clusters

- Estado: **terminado y verificado en producción móvil**. PR
  #34 fusionado como `6a95ec6`; Worker productivo
  `240fdd88-a0e2-4ac1-9060-b034ecc0de7b` y `/resultados` responde HTTP 200.
- Causa confirmada: el cluster elegía `ids[0]` como activo, pero la preview
  reconstruía sus tarjetas con el orden del listado general. Cuando ambos
  órdenes diferían, `scrollIntoView` desplazaba el carrusel hasta una tarjeta
  intermedia.
- Corrección modular: `orderPropertiesByIds` conserva el orden de IDs entregado
  por MapLibre, omite IDs inexistentes y evita duplicados. La tarjeta activa del
  cluster queda renderizada en la primera posición.
- Evidencia: escenario OpenSpec, prueba de regresión A-B-C frente a C-A, lint
  limpio, 39 archivos/142 pruebas y build TypeScript/Vite/PWA correcto.
  Advertencia conocida: `vendor-maplibre` supera 500 kB.
- Evidencia de cierre productivo (2026-07-14): Rodolfo confirmó en móvil que un
  pin agrupado abre el carrusel desde la primera tarjeta, sin desplazamiento
  inicial ni fallos visibles.

### 2026-07-14 — Codex principal — carril O, login de favoritos sobre mapa

- Estado: **terminado y verificado en producción móvil**. PR
  #36 fusionado como `d666ee0`; Worker productivo
  `14af320c-2f19-4f33-9852-890c9da78a2e` y `/resultados` responde HTTP 200.
- Causa confirmada: el mapa a pantalla completa estaba en la capa `9999`, la
  invitación de favoritos en `100` y el login en `220`; el estado se abría, pero
  ambos diálogos quedaban visualmente detrás del portal del mapa.
- Corrección modular: `shared/ui/layers.ts` define las capas de mapa y modal. La
  invitación de favoritos ahora usa portal directo a `document.body`, semántica
  accesible de diálogo y la misma capa `10030` que `LoginModal`; el mapa conserva
  la capa `9999`.
- Evidencia: escenario OpenSpec y tres pruebas de regresión para relación de
  capas, portal del aviso y portal del login; lint limpio, 40 archivos/145
  pruebas y build TypeScript/Vite/PWA correcto. Advertencia conocida:
  `vendor-maplibre` supera 500 kB.
- Evidencia de cierre productivo (2026-07-14): Rodolfo confirmó en móvil como
  usuario anónimo que Favorito → invitación → Iniciar sesión permanece visible
  sobre el mapa y funciona sin fallos visibles ni navegación inesperada.

### 2026-07-14 — Codex principal — selector de cuenta Google OAuth

- Estado: **terminado y verificado en producción**. PR #39
  fusionado como `ab031ed`; Worker productivo
  `dce33dc8-d0c7-424c-980b-5bbb58c61742` y la portada responde HTTP 200.
- Causa confirmada: `LoginModal` iniciaba Google OAuth con
  `access_type=offline`, pero sin el parámetro `prompt`; Google podía reutilizar
  silenciosamente la única sesión disponible en el dispositivo.
- Corrección modular: la llamada existente a `signInWithOAuth` conserva el
  proveedor, callback y branding, y añade `prompt=select_account` para solicitar
  siempre el selector de cuenta.
- Evidencia local: nuevo escenario OpenSpec y prueba de regresión sobre los
  parámetros enviados a Supabase; lint limpio, 40 archivos/146 pruebas y build
  TypeScript/Vite/PWA correcto. Advertencia conocida: `vendor-maplibre` supera
  500 kB.
- Evidencia de cierre productivo (2026-07-14): Rodolfo cerró sesión y confirmó
  que Google presenta el selector de cuenta y que el flujo funciona bien.

### 2026-07-14 — Codex principal — handoff de Turnstile

- Estado: **bloqueado antes de crear recursos**. No se creó ningún widget,
  Worker, secreto ni cambio de código de Turnstile.
- Objetivo siguiente: integrar Cloudflare Turnstile de extremo a extremo en los
  formularios públicos mediante el skill
  `C:\Users\Jorba\.codex\skills\turnstile-spin\SKILL.md`, manteniendo cada
  inserción modular y sin reemplazar la lógica actual de los formularios.
- Preparación comprobada: `npx wrangler --version` devuelve `4.107.0`. WSL no
  puede arrancar porque la virtualización está deshabilitada; ejecutar los
  scripts con `C:\Program Files\Git\bin\bash.exe`.
- Bloqueo exacto: `auth-probe.sh` devolvió
  `{"status":"missing_token","reason":"no_env_var"}` porque
  `CLOUDFLARE_API_TOKEN` no está configurado. No se leyó ni mostró ningún token.
- Permisos necesarios del token personalizado: `Account.Turnstile:Edit` y
  `Account.Workers Scripts:Edit`, limitado a la cuenta de Cubitat. El usuario
  debe entregarlo preferentemente mediante variable de entorno o archivo local
  con permisos de usuario; no guardarlo en el repositorio ni en Obsidian.
- Secuencia para continuar: volver a `main`, crear una rama `feature/`, cargar
  el token solo en el proceso, ejecutar `auth-probe.sh` con Git Bash, resolver
  selección de cuenta si aparece, confirmar dominios (`localhost`,
  `127.0.0.1`, `cubitathome.com` y el tratamiento de `www.cubitathome.com`),
  escanear candidatos, presentar el plan de inserción a Rodolfo y esperar su
  confirmación antes de crear el widget.
- Después de la confirmación: crear widget administrado, desplegar el Worker
  `siteverify` del skill en la misma cuenta, añadir el gate sin sustituir los
  handlers existentes, validar con `validate.sh`, ejecutar lint/pruebas/build,
  documentar, abrir PR, fusionar y desplegar. Nunca llamar `siteverify` desde el
  navegador ni escribir el secreto de Turnstile en disco.
- Estado Git al entregar: `main` está sincronizado en `ba98661`; el único
  elemento local ajeno al trabajo es `.unlighthouse/`, que debe conservarse.

### 2026-07-14 — Codex principal — cierre productivo de Turnstile

- Estado: **implementado, fusionado, desplegado y verificado en producción**.
  PR #44 fusionado como `15c799a`; Worker principal
  `3ab15656-27fe-4b9c-84ba-3ff4551a3821`.
- Alcance: formularios públicos de contacto, reporte de propiedad, registro y
  recuperación de contraseña. El navegador obtiene el token y lo valida contra
  el Worker administrado
  `https://turnstile-siteverify-cubitat.pochiprats18.workers.dev`; no llama
  directamente al secreto de Cloudflare.
- Incidencia corregida: `TurnstileWidget` dependía de callbacks inline. Cuando
  `onVerify` actualizaba React, el efecto eliminaba el desafío aprobado y lo
  montaba otra vez, dejando la interfaz en `Verificando...`.
- Corrección modular: los callbacks viven en referencias actualizables y el
  widget solo se remonta al cambiar `action` o `theme`. La prueba de regresión
  confirmó que antes se renderizaba dos veces y después permanece en una sola
  instancia.
- Evidencia: health del Worker responde `200`; una petición dummy devuelve
  `success: false` y código de token inválido; lint limpio, 41 archivos/147
  pruebas y build TypeScript/Vite/PWA correcto. Verificación visual local y
  productiva terminó en `¡Operación exitosa!`, sin errores de consola y sin
  enviar formularios ni modificar datos.
- Hardening adicional: se retiraron de `vite.config.ts` dos logs de depuración
  que imprimían cabeceras completas del proxy local. La sustitución de la clave
  pública de Supabase en desarrollo se conserva, pero ya no registra cabeceras,
  cookies ni valores de autenticación.
- Artefactos locales fuera de Git: `.unlighthouse/` y `tmp/` se conservaron sin
  incluirlos en los PR.

### 2026-07-14 — Codex principal — envio de contacto tras Turnstile

- Estado: **terminado y verificado en produccion**. PR #46 corrige el submit y
  PR #49 elimina la cache HTML obsoleta;
  Worker activo `2ebd9a92-78eb-4828-9b97-a4112faac0d3`.
- Evidencia productiva del fallo: Turnstile terminaba en `¡Operación exitosa!`,
  pero el boton quedaba en `Enviando mensaje...` y la consola registraba
  `Failed to construct 'FormData': parameter 1 is not of type
  'HTMLFormElement'`.
- Causa confirmada: `handleContactSubmit` consultaba `e.currentTarget` despues
  del `await` de `verifyTurnstile`; React ya no garantizaba la referencia al
  formulario en ese punto.
- Correccion modular: nombre, telefono y mensaje se capturan sincronamente al
  recibir el submit, antes de cualquier espera, sin modificar Turnstile ni la
  insercion existente en `contacts`.
- Evidencia local: nueva prueba de regresion en modo productivo con verificacion
  asincrona; lint limpio, 41 archivos/148 pruebas y build
  TypeScript/Vite/PWA correcto. Advertencia conocida: `vendor-maplibre` supera
  500 kB.
- Bloqueo de despliegue detectado: la Cache API del Worker seguia entregando el
  HTML de la propiedad con el bundle anterior aunque los assets nuevos ya
  estaban publicados. La clave solo dependia de la URL y sobrevivía a nuevas
  versiones durante hasta 24 horas.
- Hardening de cache desplegado: el HTML dinamico de propiedades deja de usar la
  Cache API manual y conserva `no-cache, no-store, must-revalidate`. Los assets
  con hash siguen cacheados normalmente, pero cada documento vuelve a tomar el
  manifiesto vigente; la prueba del Worker verifica que no se consulta la cache
  HTML obsoleta.
- Evidencia segura en produccion: la URL canonica paso del bundle antiguo
  `index-Bq53CVzk.js` al vigente `index-B97Pc6pl.js`; tras liberar el Service
  Worker de la pestaña, la aplicacion cargo la version nueva, Turnstile termino
  en `¡Operacion exitosa!`, el boton quedo habilitado y no aparecieron errores
  nuevos de consola. No se envio el formulario ni se modificaron datos.
- Evidencia de cierre productivo (2026-07-14): Rodolfo realizo un envio real en
  una segunda propiedad y la interfaz mostro `¡Mensaje enviado! Tu solicitud
  ha sido procesada.`; el formulario salio del estado de carga y la consola
  permanecio sin errores. No quedan criterios pendientes en este incidente.

### 2026-07-18 — saneamiento del lote local heredado

- Estado: **implementado y verificado localmente; pendiente de PR, despliegue y
  verificación productiva** en la rama `codex/harden-unfinished-batch`.
- Seguridad E2E: se retiraron credenciales QA en texto plano de las pruebas. Las
  pruebas que escriben datos requieren `CUBITAT_E2E_ALLOW_MUTATIONS=true` y
  credenciales por variables de entorno. El flujo de alertas usa un marcador
  único y elimina exclusivamente la alerta que creó dentro de `finally`.
  `.unlighthouse/` y `tmp/` quedaron ignorados. No se ejecutaron pruebas E2E
  mutables ni se modificaron datos de producción.
- Riesgo pendiente de credencial: la cadena retirada ya existe en el historial
  desde el commit `7c5a559`. Rodolfo debe rotar la contraseña de esa cuenta QA;
  borrar el literal del árbol actual no invalida copias históricas. Una
  reescritura de historial requeriría coordinación explícita y no se realizó.
- OAuth: el retorno posterior a Google conserva únicamente rutas internas,
  expira a los 15 minutos, se consume una sola vez y descarta callbacks, rutas
  de recuperación, destinos externos y valores antiguos. El callback ya no se
  repite cuando cambia la referencia de la prop `onContinue`.
- Reportes y Turnstile: los reportes autenticados envían `reporter_id` para
  cumplir RLS; anónimo conserva `NULL`. Reporte y contacto bloquean doble envío
  y renuevan el desafío de Turnstile después de fallo de verificación o
  inserción.
- Rendimiento/UI: la carga inicial SWR usa el resultado real de IndexedDB y no
  un cierre React obsoleto. Se conserva `touch-action` para gestos, pero se
  retiraron `skipSnaps` y duración global del carrusel porque alteraban todas
  las galerías sin evidencia ni regresión móvil específica.
- Alertas: `migration list --linked` descubrió que
  `20260715183000_notify_matching_search_alerts.sql` ya era la migración 45 en
  producción aunque no estaba versionada. Se preservó sin reescribirla. La
  migración 46 `20260718010000_harden_search_alert_notifications.sql` queda
  pendiente de aplicar y añade idempotencia, nulos seguros y conversiones
  defensivas. El dry-run remoto listó solo la 46 y no aplicó cambios.
- Evidencia local: lint limpio; 42 archivos/156 pruebas correctas; build
  TypeScript/Vite/PWA correcto y sitemap regenerado con 1008 URL. Advertencia
  conocida: `vendor-maplibre` supera 500 kB.
- Commits modulares: `83e1656` (E2E seguro), `7657c1e` (OAuth), `72a61c2`
  (reportes/Turnstile), `c2b2a41` (SWR/carrusel), `1dc0176`
  (migraciones de alertas) y `e4c0341` (sitemap). `supabase db lint --linked`
  no reportó errores en el esquema remoto vigente.
- Bloqueo documental resuelto el 2026-07-19: la unidad `G:` volvió a estar
  disponible y se actualizaron únicamente checklist, roadmap y dashboard de
  Obsidian con el hardening pendiente y la evidencia local vigente.
- Migración 46 aplicada el 2026-07-19: las 46 migraciones están sincronizadas,
  `db lint --linked` quedó limpio y el dry-run posterior no encontró pendientes.
  La advertencia por Docker correspondió solo al cache local del catálogo.
- Prueba QA transaccional de la migración 46 completada el 2026-07-19 mediante
  `supabase db query --linked` dentro de `BEGIN`/`ROLLBACK`. Se usaron dos
  usuarios existentes sin exponer sus datos y marcadores UUID/labels aislados.
  La coincidencia creó exactamente una notificación y actualizó `last_sent_at`;
  la alerta con operación no coincidente y la alerta heredada con filtros
  inválidos crearon cero; el ciclo `published → paused → published` conservó
  una sola notificación por `event_key`.
- Limpieza confirmada por una consulta independiente: 0 alertas, 0 propiedades,
  0 notificaciones y 0 eventos de auditoría con el marcador QA. No se
  persistieron datos productivos.
- Subhito de alertas: **terminado con evidencia productiva completa**. Próximo
  paso del lote: verificar OAuth y reintento Turnstile en producción, sin
  repetir flujos que Rodolfo ya haya confirmado manualmente.

### 2026-07-19 — cierre productivo del informe de indexación

- Search Console (informe actualizado el 2026-07-09) registró 16 URLs como
  duplicadas sin canonical y 6 páginas con redirección. Las redirecciones de
  `http`/`www` al dominio canónico son intencionales; `/publicar` es privada y
  conserva `noindex`.
- Causas corregidas en `codex/harden-unfinished-batch`: el HTML base no
  declaraba canonical, las navegaciones SPA solo actualizaban Open Graph, una
  propiedad no disponible devolvía el shell de portada con `200`, y el sitemap
  enumeraba todas las combinaciones geográficas aunque no tuvieran inventario.
- Implementación: canonical sin query/fragmento en HTML, SPA y Worker;
  propiedades inexistentes/no públicas responden `404` + `X-Robots-Tag:
  noindex` sin canonical; el sitemap contiene solo rutas estáticas canónicas,
  propiedades publicadas y landings respaldadas por inventario. Se retiró el
  `SearchAction` que exponía la antigua ruta literal con placeholder.
- Evidencia local: lint limpio; 43 archivos/160 pruebas; build
  TypeScript/Vite/PWA correcto. El sitemap bajó de 1008 a 473 URLs y ya no
  contiene la propiedad retirada `da2c4339-de63-460f-8a6f-1ae995e43bf6`, la
  landing vacía `/permuta/guantanamo/maisi` ni `resultados?query=`.
- PR #52 fusionado en `main` como `0da16a5`; Worker desplegado como
  `82387f0f-77d0-44ae-bcd9-c1c0de31b37a`.
- Evidencia productiva de solo lectura: `/` y `/venta/artemisa?utm_source=qa`
  responden `200` con canonical correcto y sin query; `/publicar` conserva
  `200 + noindex` sin canonical; la propiedad retirada responde `404 + noindex`
  sin canonical; `sitemap.xml` responde `200` con 473 URLs. `http`, `www` y
  `https://www` redirigen `301` a `https://cubitathome.com/`.
- Chrome con la sesión existente cargó Home y la ficha autorizada sin errores
  de consola de Cubitat. La única advertencia observada pertenecía a una
  extensión del navegador, no al sitio.
- Search Console aceptó nuevamente `sitemap.xml` e inició el 2026-07-19 la
  validación de “Duplicada: el usuario no ha indicado ninguna versión
  canónica”. Las 6 páginas con redirección no se validan como defecto porque
  corresponden a redirecciones canónicas deliberadas.
- Estado: **fusionado, desplegado y verificado en producción; validación de
  Google en curso**. El conteo histórico de Search Console no cambiará hasta
  que Google vuelva a rastrear las URLs.

### 2026-07-19 — Codex principal — carril P, MFA administrativo

- Estado: **fusionado, desplegado y verificado en producción** mediante el PR
  #55, integrado en `main` como `ba9867f`.
- Frontend: `src/modules/auth/mfa` encapsula estado, enrolamiento TOTP,
  eliminación de factores incompletos y desafío; `AdminPage` conserva primero
  el guard de rol y no renderiza datos administrativos hasta obtener `aal2`.
  El QR y el código viven solo durante el flujo y no se registraron, copiaron ni
  persistieron.
- Backend: Worker exige `aal2` en métricas y reevaluación administrativa; la
  migración 47 aplica `is_admin_aal2()` a propiedades ajenas, perfiles,
  contactos, reportes, bitácora y `get_admin_metrics()`. Los permisos del dueño
  sobre sus propios datos permanecen en `aal1`.
- Supabase: TOTP habilitado. `migration list --linked` confirma 47 migraciones
  sincronizadas, `db lint --linked` no reporta errores y el dry-run indica que
  la base remota está actualizada.
- Matriz productiva transaccional con `ROLLBACK`: admin AAL1 obtuvo 0
  propiedades privadas ajenas, 0 reportes y 0 eventos; admin AAL2 obtuvo 5, 6
  y 4 respectivamente; propietario normal AAL1 vio sus 5 publicaciones y 0
  datos privados ajenos, reportes o bitácora. No persistieron cambios.
- UI productiva: la sesión AAL2 abrió Propiedades, Reportes, Bitácora y Métricas;
  métricas devolvió datos reales de Cloudflare, Supabase y GA4. Consola sin
  errores ni advertencias. No se ejecutaron acciones de moderación.
- Calidad: lint limpio, 45 archivos/172 pruebas y build TypeScript/Vite/PWA
  correcto; sitemap de 473 URLs. Worker activo
  `91e5452f-0e83-483b-9667-f2bd114331dd`. Comprobación posterior al merge:
  `/` y `/moderar` respondieron HTTP 200, la ruta administrativa conservó
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` y el chunk productivo
  incluyó el guard MFA/AAL2.

### 2026-07-19 — Codex principal — recuperación MFA administrativa

- Estado: **procedimiento documentado; no ejecutado contra factores reales**.
- `docs/ADMIN_MFA_RECOVERY.md` define autorización, doble evidencia de identidad,
  listado y eliminación server-only mediante la API Admin de Supabase,
  rematriculación TOTP, comprobación AAL1/AAL2 y registro sin secretos.
- El runbook prohíbe desactivar MFA/RLS, usar SQL directo sobre
  `auth.mfa_factors`, cambiar roles, crear cuentas de emergencia sin autorización
  o exponer `service_role`, QR, códigos, tokens e identificadores de factores.
- Supabase no ofrece códigos de recuperación. La selección y gestión de varios
  factores queda como mejora separada; no se considera implementada ni probada.

### 2026-07-19 — Codex principal — revalidación del carril L

- Estado: **terminado con evidencia productiva actual**. La tabla de carriles
  quedó reconciliada con el cierre que ya constaba en el registro histórico y
  en las notas operativas.
- Matriz vinculada dentro de `BEGIN`/`ROLLBACK`: anónimo sin lectura ni
  `INSERT`; usuario normal AAL1 con 0 filas y sin `INSERT`, `UPDATE` o `DELETE`;
  admin AAL1 con 0 filas; admin AAL2 con lectura de los 4 eventos existentes y
  sin `UPDATE` o `DELETE`; `service_role` también sin `UPDATE` o `DELETE`.
- El trigger `reject_property_moderation_audit_mutation_trigger` está habilitado.
  No se mostraron IDs, no se modificaron publicaciones y no persistió ninguna
  fila de prueba.
- Las 47 migraciones continúan sincronizadas y `db lint --linked` no reporta
  errores de esquema.

### 2026-07-19 - parche de seguridad 1 - Turnstile server-side

- Estado: **fusionado, desplegado y verificado en produccion**. PR #59
  fusionado en `main` como `902c824`; Worker
  `fc3e3bf7-6af1-49de-886d-701dfe3e69be` activo.
- Contactos y reportes ya no escriben directamente desde el navegador. Ambos
  usan endpoints aislados del Worker principal, que validan token, `action` y
  `hostname`, aplican rate limiting y llaman RPCs exclusivos de `service_role`.
- La migracion 48 revoca `INSERT` a `PUBLIC`, `anon` y `authenticated`; fuerza
  propiedad publicada, limites de campos y estado inicial `pending` para los
  reportes. El `reporter_id` se deriva de una sesion valida y nunca del cuerpo.
- TDD dirigido: 5 archivos y 43 pruebas correctas. Puerta completa: lint limpio,
  48 archivos/181 pruebas y build TypeScript/Vite/PWA correcto; sitemap de 473
  URLs. El E2E seguro de Turnstile paso en Chromium (1/1).
- Produccion: migracion 48 sincronizada; `db lint` limpio y dry-run sin
  pendientes. Un contacto y un reporte reales mostraron confirmacion de exito
  en Chrome; la consola no registro errores ni advertencias.
- Aislamiento: las inserciones directas de contacto y reporte bajo rol `anon`
  fueron rechazadas. Se eliminaron exactamente 1 contacto y 1 reporte con los
  marcadores QA; la consulta independiente posterior devolvio 0/0 residuos.
- Siguiente vulnerabilidad recomendada: revisar el enlace entre Turnstile y los
  flujos de registro/recuperacion de Supabase Auth como parche separado.

### 2026-07-19 - parche de seguridad 2 - Turnstile ligado a Supabase Auth

- Estado: **fusionado, desplegado y verificado en produccion**. PR #61
  fusionado en `main` como `57e67d4`; Worker
  `b98a8dd1-c671-495c-90c5-c26f2f4399b6` activo.
- Hallazgo: registro y recuperacion validaban el token con `siteverify` antes de
  llamar Supabase Auth. Como el token es de un solo uso y no se enviaba como
  `captchaToken`, los endpoints de Auth quedaban fuera de esa proteccion.
- Correccion modular: `captchaAuth.ts` une el token a la misma operacion
  `signUp` o `resetPasswordForEmail`; se elimino la verificacion previa del
  navegador y el widget se renueva tras un fallo.
- Configuracion versionada: `supabase/config.toml` declara Turnstile habilitado y
  obtiene el secreto solo desde `SUPABASE_AUTH_CAPTCHA_SECRET`; ningun secreto se
  escribio en el repositorio ni en la documentacion.
- Calidad local: lint limpio, 50 archivos/185 pruebas y build
  TypeScript/Vite/PWA correcto; sitemap de 473 URLs.
- Supabase remoto: `Authentication > Attack Protection` quedo habilitado con
  `Turnstile by Cloudflare`. El secreto se transfirio directamente entre campos
  protegidos sin leer el portapapeles ni escribirlo en archivos, Git, notas o
  salidas de terminal.
- QA productiva autorizada: Turnstile termino en `Operacion exitosa` y una unica
  recuperacion para la cuenta QA mostro la confirmacion generica de envio. Un
  segundo intento sin token fue bloqueado con `Por favor, completa la
  verificacion de seguridad`, por lo que el token no se reutilizo. No se creo
  ninguna cuenta ni se cambio ninguna contrasena.
- La consola de `cubitathome.com` quedo sin errores ni advertencias. La sesion
  administrativa usada antes de la prueba fue restaurada y el selector Google
  conservo `prompt=select_account`.
- Siguiente vulnerabilidad recomendada: revisar limites de frecuencia de Auth y
  politica de contrasenas como parche independiente.

- Observacion separada para diagnostico: al restaurar la sesion con Google, el
  selector de cuenta funciono y la sesion quedo autenticada, pero `/auth/callback`
  mostro brevemente `PKCE code verifier not found in storage` antes de volver al
  inicio. No hubo errores de consola. Revisar este retorno como bug de Auth antes
  del siguiente parche de hardening.

### 2026-07-19 - cierre del intercambio PKCE duplicado en Google OAuth

- Estado: **fusionado, desplegado y verificado en produccion**. PR #64
  fusionado en `main` como `6eff11e`; Worker
  `d20372d3-f7ea-4e8d-8ace-fc687f5eff2a` activo.
- Causa raiz: el cliente Supabase procesaba automaticamente el `code` PKCE y
  `AuthCallbackPage` intentaba intercambiar el mismo codigo una segunda vez. El
  primer intercambio consumia el verificador y el segundo mostraba el error.
- Correccion modular: `AuthCallbackPage` es el unico propietario del intercambio
  PKCE (`detectSessionInUrl: false`). Los callbacks heredados con tokens en el
  hash conservan compatibilidad mediante `setSession` explicito.
- Calidad local: lint limpio, 52 archivos/188 pruebas y build
  TypeScript/Vite/PWA correcto; sitemap de 473 URLs.
- QA productiva en la sesion existente de Chrome: cierre de sesion temporal,
  selector Google confirmado, cuenta autorizada seleccionada y retorno a
  `https://cubitathome.com/` con sesion activa. No aparecieron `PKCE code
  verifier not found in storage` ni `Enlace no valido`.
- Consola: cero errores o advertencias asociados a `cubitathome.com`; la sesion
  administrativa quedo restaurada al finalizar.
- Esta evidencia cierra y reemplaza el pendiente de diagnostico registrado en
  el parche de seguridad 2.
- Siguiente vulnerabilidad recomendada: revisar limites de frecuencia de Auth y
  politica de contrasenas como parche independiente.

### 2026-07-20 - parche de seguridad 3 - contrasenas y limites de Auth

- Estado: **fusionado, desplegado y verificado en produccion**. PR #66
  fusionado en `main` como `cdd52f2`; Worker
  `c5cf6596-e70c-4435-9dcc-fe57e088630f` activo.
- La politica de contrasenas quedo centralizada en `passwordPolicy.ts` y se
  reutiliza en registro y recuperacion. Supabase exige al menos 8 caracteres,
  minusculas, mayusculas, digitos y simbolos.
- La configuracion remota tiene cambio seguro de contrasena habilitado y una
  frecuencia minima de 1 minuto para solicitudes repetibles por correo. El
  enlace con Supabase CLI no detecto diferencias respecto a
  `supabase/config.toml`.
- El Worker conserva limites mas estrictos para login, registro, recuperacion,
  reenvio y OTP. Tres pruebas de regresion cubren bloqueo por IP, bloqueo por
  identificador normalizado y hasheado, `Retry-After` y ausencia de llamadas al
  origen cuando el limite ya fue excedido.
- Calidad: lint limpio, 54 archivos/203 pruebas y build TypeScript/Vite/PWA
  correcto; sitemap generado con 473 URLs.
- Produccion: la pagina principal respondio correctamente y la consola de
  `cubitathome.com` quedo sin errores ni advertencias relevantes. No se crearon
  cuentas, no se cambiaron contrasenas y no se enviaron correos ni se mutaron
  datos productivos durante esta verificacion.
- Siguiente parche recomendado: evaluar la proteccion contra contrasenas
  filtradas si el plan de Supabase la admite y revisar los tiempos de sesion.

### 2026-07-20 - parche de seguridad 4 - contrasenas filtradas

- Estado: **fusionado, desplegado y verificado en produccion**. PR #68
  fusionado en `main` como `863cafc`; Worker
  `5f6366b5-8f58-4ef4-bb1a-8eb3365449b4` activo.
- El dashboard confirmo que la organizacion usa Supabase Free. La proteccion
  nativa contra contrasenas filtradas y los timeouts de sesion requieren Pro;
  no se cambio el plan ni se genero ningun cargo.
- `pwnedPassword.ts` aplica el control gratuito en registro y cambio de
  contrasena: calcula SHA-1 dentro del Worker y envia solo el prefijo de 5
  caracteres a Pwned Passwords con k-anonimato y `Add-Padding`. Nunca transmite
  la contrasena ni su hash completo.
- Una coincidencia devuelve `422 weak_password` antes de llegar a Supabase. Las
  consultas externas tienen limite propio por IP; si el corpus no esta
  disponible, Auth conserva disponibilidad bajo la politica fuerte ya activa.
- Sesiones: se conservaron `jwt_expiry = 3600`, rotacion de refresh tokens y
  ventana de reutilizacion de 10 segundos. No se simularon timeouts de servidor
  que el plan actual no puede garantizar.
- Calidad: lint limpio, 55 archivos/211 pruebas y build TypeScript/Vite/PWA
  correcto; sitemap de 473 URLs.
- Produccion: Home `200`; un intento con correo deliberadamente invalido y un
  fixture filtrado devolvio el mensaje seguro `422 weak_password`. Era imposible
  crear una cuenta y no se cambio ninguna contrasena ni dato productivo.
- Chrome no devolvio telemetria tras dos reconexiones posteriores al despliegue.
  Wrangler confirmo que no cambiaron assets del navegador; la comprobacion HTTP
  y el contrato productivo del Worker quedaron correctos.
- Siguiente parche recomendado: revisar exposicion de datos en logs y politica
  de retencion de auditoria, sin ampliar acceso a datos productivos.

### 2026-07-20 - parche de seguridad 5 - observabilidad segura

- Estado: **fusionado, desplegado y verificado en produccion**. PR #70
  fusionado en `main` como `f969494`; Worker
  `17e2a0e0-da43-4c4d-9b00-a701924099ba` activo.
- Hallazgo: Cloudflare conservaba logs automaticos de invocacion con metodo y
  URL completa, y el Worker registraba objetos `Error`, un cuerpo de respuesta
  de Resend y mensajes que distinguian el estado de confirmacion de una cuenta.
- Correccion modular: `worker/logger.ts` acepta solo eventos y campos cerrados;
  se retiraron correos, URLs, parametros, tokens, IDs, cuerpos externos y
  errores crudos de los diagnosticos. `wrangler.jsonc` conserva logs propios al
  100 % y deshabilita `invocation_logs`.
- Regresion: las pruebas validan el filtrado en tiempo de ejecucion, la
  configuracion de Cloudflare y la ausencia de `console.*` directo en
  `worker.ts`.
- Calidad local: lint limpio, 57 archivos/215 pruebas, build TypeScript/Vite/PWA
  correcto, sitemap de 473 URLs y `wrangler deploy --dry-run` aprobado.
- Produccion: Home `200` con HSTS; `/auth/callback` `200` con
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`. La version desplegada
  corresponde al upload de Wrangler. No se abrio `wrangler tail`, no se leyeron
  logs con URLs reales y no se consultaron ni mutaron datos productivos.
- Retencion: Supabase Free permanece sin cambios. No se purgo
  `auth.audit_log_entries` ni se desactivo su escritura porque ambas acciones
  requieren autorizacion destructiva y una politica interna aprobada. Como
  referencia operativa, el proveedor muestra 1 hora para Auth Audit Logs y 1
  dia para logs generales de API/base de datos en Free; verificar de nuevo ante
  un incidente porque estas ventanas pueden cambiar.
- Vault actualizado y verificado mediante Google Drive: Checklist de
  Lanzamiento, Dashboard del Proyecto, Roadmap Fase 1 y Guia de Supabase
  Produccion. La unidad local `G:` no estaba montada.
- Siguiente parche recomendado: auditar `console.*` del frontend por modulos y
  sustituir objetos de error o respuestas crudas por mensajes seguros, sin
  eliminar el feedback util para soporte.

## Relevo listo para el siguiente agente - 2026-07-21

### Punto de partida

- Continuar desde el `origin/main` más reciente que contenga este relevo. Su
  padre funcional antes de documentarlo era `4bf8fa0`.
- El Worker productivo vigente es
  `17e2a0e0-da43-4c4d-9b00-a701924099ba`.
- El parche de logs del Worker está cerrado. No repetir su auditoría ni volver a
  habilitar `observability.logs.invocation_logs`.
- El único cambio local no integrado es `web/public/sitemap.xml` y pertenece a
  otro trabajo. Debe permanecer fuera de cualquier commit, stash, restore o
  despliegue del carril R; proteger su contenido antes del build y restaurar el
  mismo hash después.
- No hay migraciones pendientes conocidas: el inventario contiene 48 y la
  última comprobación vinculada quedó sincronizada.

### Siguiente trabajo autorizado: carril R

Línea base estática del relevo: 56 llamadas `console.*` en 20 archivos de
`web/src`, excluyendo pruebas y `worker.ts`. Las concentraciones principales
están en `CubitatApp.tsx`, `PublishPage.tsx`, `DetailPage.tsx`, módulos admin,
Auth, caché offline, mapas, favoritos y `shared/components/ErrorBoundary.tsx`.

1. Crear una rama nueva desde `main`, reclamar la fila R como `En curso` y no
   trabajar directamente sobre `main`.
2. Inventariar los `console.log/info/warn/error` del frontend, excluyendo
   pruebas, scripts locales y `worker.ts`, que ya tiene logger seguro.
3. Dividir el parche por módulos para evitar solapamientos: autenticación,
   administración, publicaciones/propiedades y límite global de errores.
4. No registrar correos, teléfonos, IDs de usuario o propiedad, URLs completas,
   query strings, tokens, objetos `Error`, respuestas de proveedor ni cuerpos
   de red. No convertir datos sensibles en hashes para conservarlos en logs.
5. Mantener el feedback visible al usuario y la información mínima necesaria
   para soporte mediante eventos constantes y campos cerrados. No silenciar
   fallos sin una señal segura.
6. Añadir pruebas de regresión que rechacen campos inesperados y eviten volver a
   introducir `console.*` directo en los módulos migrados.
7. Ejecutar desde `web`: `npm run lint`, `npm run test:run` y `npm run build`.
   Proteger antes el `sitemap.xml` ajeno y confirmar su hash después del build.
8. Verificar en producción solo lectura/navegación y consola. No crear cuentas,
   publicaciones, contactos, reportes ni alertas sin autorización nueva.
9. Actualizar este relevo y únicamente las notas afectadas del vault antes de
   marcar R como `Terminado`.

### Bloqueos y decisiones que no debe asumir

- Contenido real y revisión jurídica continúan bloqueados.
- La política interna de retención de auditoría de Supabase sigue pendiente de
  aprobación humana. No purgar `auth.audit_log_entries`, no desactivar su
  escritura y no cambiar de plan sin autorización explícita.
- No leer, mostrar ni copiar secretos, cookies, LocalStorage, tokens o
  credenciales. Para QA autenticada, reutilizar únicamente una sesión existente
  y segura si el usuario lo solicita.

### Archivos de entrada para el carril R

- `web/src/modules/auth/**`
- `web/src/modules/admin/**`
- `web/src/modules/properties/**` y componentes de publicación relacionados
- `web/src/shared/components/ErrorBoundary.tsx`
- especificaciones OpenSpec de los módulos realmente modificados
- `docs/DESPLIEGUE_COMPLETO.md` solo si cambia el contrato operativo de logs

### Criterio de cierre

El carril R solo puede marcarse `Terminado` con diff modular revisado, cero datos
sensibles en los logs migrados, pruebas nuevas aprobadas, gate completo, PR
fusionado, versión productiva identificada, navegación/consola verificadas y
documentación del repositorio y vault actualizada. Si queda un módulo sin
auditar, registrar su ruta exacta y dejar R `En curso`, no `Terminado`.

## 2026-07-31 — Codex — Frontera física Fase 2 / producción (implementado en rama)

- Rama: `bugfix/phase2-release-boundary-hardening`; no desplegada ni fusionada.
- Frontend productivo: la UI de cuenta KYC/rol vive en
  `AccountPhaseTwoSections.tsx` y solo se importa con `import.meta.env.DEV`.
  Perfil público, panel, insignias, repositorio de agentes y métricas de clic
  siguen disponibles en DEV, pero no se generan como chunks de producción.
- Worker productivo: `src/worker.ts` ya no importa jobs de alertas/retención, no
  expone `scheduled` y solo permite RPC de Fase 1. Fase 2 usa el entrypoint
  separado `src/worker-phase2-dev.ts` y `wrangler.phase2-dev.jsonc`.
- Guardas automáticas: el build inspecciona tanto los assets Vite como el bundle
  real generado por `wrangler deploy --dry-run`, y falla ante RPC o jobs de
  Fase 2. Las pruebas de aislamiento también verifican que la capacidad siga en
  el entrypoint DEV.
- Web Push: se retiró el prototipo sin consumidores; continúa expresamente
  diferido y fuera del alcance actual, igual que Trust Score.
- Verificación cerrada en local: lint limpio; 84 archivos/333 pruebas sin
  avisos `act`; build Vite/PWA con 473 URLs; verificadores de bundles Vite y
  Wrangler aprobados; dry-run del Worker DEV aprobado. Chrome confirmó el
  perfil público del agente, KYC visible en la cuenta admin, selector y panel
  ausentes para el rol admin, y consola con 0 errores/advertencias. No se
  desplegó ni se consultó producción.
- QA final 2026-08-01: con `QA Buyer Toggle` temporalmente en KYC verificado,
  el navegador confirmó `buyer → agent → buyer` sin recarga, sin mensaje rojo
  y con aparición/desaparición inmediata del panel. Un F5 normal conservó el
  rol canónico; `user_metadata` permaneció sin copia del rol. La cuenta quedó
  restaurada a `buyer/pending` y la consola terminó limpia.

## 2026-08-01 — Codex — Resultados: coordenadas inválidas no derriban MapLibre

- Rama: `bugfix/map-invalid-coordinates`; parte de `dev` después de fusionar el
  PR #82. No desplegada ni fusionada al redactar este relevo.
- Causa reproducida en local: la propiedad sintética publicada
  `f3100000-0000-0000-0000-000000000001` almacenaba `coordinates` como
  `{ "lat": 23.135, "lng": -82.383 }`. `CubitatApp` esperaba
  `latitude/longitude`, propagaba `undefined` y `MapLibreAdapter` ejecutaba
  `LngLatBounds.extend([NaN, NaN])`, activando el `ErrorBoundary` global.
- Corrección: `normalizePropertyCoordinates` acepta el contrato canónico y el
  formato legado, convierte cadenas numéricas y rechaza valores no finitos o
  fuera de rango. La carga de Supabase lo usa para canonizar datos y el
  adaptador vuelve a validarlos antes de construir bounds o GeoJSON, cubriendo
  también caché local antigua.
- Regresión: 9 pruebas nuevas cubren formatos canónico/legado, cadenas y datos
  inválidos; el gate completo cerró con lint limpio, 86 archivos/342 pruebas y
  build Vite/PWA correcto, incluidos los verificadores de aislamiento Fase 2 y
  sitemap de 473 URLs. El sitemap generado por datos locales se restauró al
  contenido previo.
- QA en navegador: `/resultados?operacion=venta` mostró 7 propiedades, el mapa
  desktop abrió con la fila legado, un F5 conservó la vista y la consola quedó
  sin errores ni advertencias. No se consultó ni modificó producción.
- Vault: la unidad `G:` no estaba disponible; falta replicar esta evidencia en
  la checklist/dashboard cuando vuelva a montarse.
