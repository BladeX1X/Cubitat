
## Favoritos SVC/MAT en producción — bloqueo por GitHub Actions — 2026-11-22

El usuario autorizó respaldo y migraciones de producción para resolver el corazón que falla. El run de respaldo `45119551323` (https://github.com/BladeX1X/Cubitat/actions/runs/45119551323) no inició: GitHub Actions reporta pagos fallidos o límite de gasto. No se ejecutó migración ni se modificó la base. No aplicar migraciones de favoritos aisladas: el inventario requiere el paquete coordinado de 64 fuentes F3/F4 con preflight, respaldo de menos de 24 h y postcheck. Reanudar una vez resuelto Actions; autorización persistente ya obtenida. Nota: [[Cubitat - Favoritos SVC MAT bloqueo respaldo GitHub Actions Producción 2026-11-22]].# Relevo y coordinación multiagente de Cubitat

## Estado vigente tras release de Fases 3/4 — 2026-11-16

- Producción: 64 migraciones reconciliadas/aplicadas por workflow 43916761042;
  PR #228 integrado y Worker `cubitat1` en producción. Las notas posteriores
  de este archivo y el informe de readiness deben leerse con la corrección
  fechada al final de `docs/PRODUCTION_RELEASE_READINESS_2026-11-15.md`.
- Después del release, PR #235 corrigió el ancho de Comprar/Rentar en pantallas
  grandes y PR #236 impidió cachear fotos privadas de propiedades. Worker
  productivo actual: `7f0ec071`, 100%; smoke HTTP 200 en portada, venta, renta,
  servicios, materiales y `/sw.js`.
- Pendiente: QA autenticado de publicación/edición e imágenes en producción,
  confirmar que clientes existentes activen el nuevo service worker y decidir
  qué hacer con el anuncio de prueba `TEST PROPERTY FOR ALERTS TRIGGER` visible
  en Rentas. No se modificaron publicaciones de producción.

## Diagnóstico de capas vectoriales del mapa — 2026-10-12

- Producción muestra el relieve raster y marcadores de respaldo, pero no se aprecian calles ni etiquetas. CSP permite `tiles.openfreemap.org`; TileJSON, tesela versionada, relieve y glifos responden HTTP 200 desde la inspección. El endpoint vectorial sin versión no devuelve contenido, mientras el TileJSON publica rutas fechadas.
- Se añadió un listener `map.on('error')` con códigos cerrados y categorías de recurso seguras, deduplicado por instancia. Nunca registra mensaje original, URL ni IDs; helper y pruebas en `web/src/modules/maps/lib/mapErrorDiagnostics.ts`.
- Lint correcto; suite completa: 638 aprobadas y 1 omitida; build correcto con `SITEMAP_MODE=static` (sitemap público preservado). **Pendiente:** desplegar la instrumentación, observar la consola productiva y corregir la causa real antes de marcar el mapa base cerrado. `.agents/AGENTS.md` no estaba disponible en este checkout.

## Guard de callback y remitente de autenticación DEV — 2026-09-28

- Con `PHASE2_ENABLED=true`, el reenvío de confirmación exige el origen DEV y
  el remitente DEV; no usa valores productivos como fallback.
- Suite: 135 archivos y 589 pruebas; lint y builds productivo/DEV correctos.
- DEV desplegado como `83dac546-0cda-4fe3-b87a-0dd9ce6f60a7`; producción sin
  cambios.

## Inventario operativo de secretos DEV — 2026-09-28

- Wrangler confirmó los secretos de Resend, service role, VAPID y métricas en
  DEV; `GROQ_API_KEY` está ausente.
- El verificador Turnstile tiene `TURNSTILE_SECRET_KEY`.
- Supabase CLI devolvió lista vacía para secretos gestionados del proyecto DEV;
  no se modificaron secretos ni valores.

## Parsers tipados de métricas y autenticación — 2026-09-28

- Cloudflare Metrics y los cuerpos JSON de autenticación ya no usan `any` en
  esas fronteras; las respuestas inesperadas se degradan de forma segura.
- Suite: 135 archivos y 590 pruebas; lint y builds productivo/DEV correctos.
- DEV desplegado como `91fe9f21-063a-482e-86ba-03e901aec5c0`; producción sin
  cambios.

## Manejo seguro de fallos de correo Auth DEV — 2026-09-28

- Los fallos de red de Resend durante el reenvío de confirmación ahora se
  convierten en una respuesta segura `503`; la ruta no propaga excepciones.
- Suite: 135 archivos y 590 pruebas; lint y builds productivo/DEV correctos.
- DEV desplegado como `04b59b38-b4f6-4bb6-9572-7ece5bfeec86`; producción sin
  cambios.

## Validación de esquema remoto DEV — 2026-09-28

- `supabase db lint --linked --level warning`: `No schema errors found`.
- `supabase db push --linked --dry-run`: `Remote database is up to date`.
- No se aplicaron migraciones ni se crearon datos.

## Inventario final de migraciones DEV — 2026-09-28

- `supabase migration list --linked` mostró coincidencia completa entre las
  migraciones locales y remotas, incluida la última `20260916010000`.
- No hay deriva de migraciones ni migraciones pendientes; esta comprobación fue
  de solo lectura y no modificó la base de datos.
- La comprobación se repitió con `SUPABASE_HOME` temporal porque el perfil
  predeterminado no puede escribir su archivo local de telemetría. El lint
  remoto devolvió `No schema errors found`; el dump completo requiere Docker
  local y queda pendiente.

## Reconciliación del inventario del README — 2026-09-28

- `web/README.md` ya refleja como implementados el sistema de notificaciones y
  la extracción de `Header`/`SiteFooter`.
- Se mantienen pendientes, con su criterio de cierre, la entrega real de correo,
  el contenido aprobado, la revisión legal, React Router y las imágenes propias
  de provincias.

## Regresión del flujo estructurado de permutas — 2026-09-28

- Se añadieron pruebas directas para construir, validar, tolerar datos antiguos
  o malformados e hidratar las preferencias de permuta del formulario.
- Gates: lint correcto, `135` archivos y `591` pruebas correctas, build
  productivo y `build:phase2-dev` correctos; sitemap DEV con 446 URLs y bundle
  DEV verificado.
- El cambio solo amplía cobertura; no requiere despliegue ni modifica datos.

La cobertura se amplió también a las etiquetas y al resumen de diferencia
monetaria; el resultado final de la suite es `135` archivos y `592` pruebas.

## Auditoría de escenarios de Administración y Publicación — 2026-09-28

- Las especificaciones actuales tienen suites dedicadas para acceso AAL2,
  publicaciones, reportes, usuarios, KYC, retención, bitácora, métricas,
  moderación IA, agentes, borradores, permutas y estados de publicación.
- La implementación queda cubierta por las pruebas actuales; no se marcaron
  como evidencia de producción los escenarios que dependen de `GROQ_API_KEY`,
  proveedores OAuth/correo/Turnstile o dispositivos físicos.

## Auditoría de fronteras del Worker — 2026-09-28

- Las rutas de contactos/reportes públicos, Turnstile, rate limits, moderación
  IA, métricas AAL2, Push, correo y retención KYC tienen regresiones directas
  para respuestas válidas, rechazo, indisponibilidad o fallos de proveedor.
- No se encontró una frontera crítica del Worker sin prueba directa. Las
  validaciones restantes requieren secretos reales, entrega externa o
  dispositivos físicos y permanecen separadas del código probado.

## Endurecimiento de errores Auth y favoritos — 2026-09-28

- Los `catch` de login, registro, recuperación y reenvío de confirmación ahora
  manejan `unknown`; los mensajes pasan por el traductor seguro de Auth.
- El manejo de duplicados de favoritos valida el código de error sin casts
  inseguros. No se modificaron rutas, contratos ni datos.
- Gates: lint correcto, `135` archivos y `592` pruebas correctas, build
  productivo y `build:phase2-dev` correctos; sitemap DEV con 446 URLs y bundle
  DEV verificado.
- Cambio aislado de calidad; no requiere despliegue ni modifica producción.

Revalidación posterior: el cambio se desplegó únicamente en DEV como
`0d11e5e1-cc70-4088-ad6a-856f9d3d4d41`; `/`, `/mi-cuenta`, `/moderar`, el
manifest y `sw.js` respondieron HTTP 200. Producción respondió HTTP 200 en una
lectura independiente y no fue modificada.

## Guard completo del dispatcher de alertas DEV — 2026-09-28

- El dispatcher exige `ALERT_EMAIL_FROM` además de las demás variables DEV;
  sin remitente no reclama ni envía alertas, evitando fallback a producción.
- Suite: 135 archivos y 587 pruebas; lint y builds productivo/DEV correctos.
- DEV desplegado como `4617a3d5-5d5e-4cfb-9fd3-b252f326f272`; producción sin
  cambios.

## Cobertura final de correo por entorno — 2026-09-28

- Callback DEV y remitente DEV de cuentas confirmadas cubiertos por regresiones.
- Suite actual: 135 archivos y 586 pruebas. El runtime continúa en DEV como
  `17c1519e-ab2e-41a8-8ce3-49c680c1bf96`; producción sin cambios.

## Reenvío de confirmación aislado por entorno — 2026-09-28

- El callback de confirmación y el remitente de correo respetan
  `PUBLIC_SITE_URL` y `ALERT_EMAIL_FROM`; la regresión quedó cubierta.
- Suite: 135 archivos y 585 pruebas. DEV vigente:
  `17c1519e-ab2e-41a8-8ce3-49c680c1bf96`. Producción permanece sin cambios.

## Remitente de correo DEV aislado — 2026-09-28

- `wrangler.phase2-dev.jsonc` fija `ALERT_EMAIL_FROM` a `Cubitat DEV
  <onboarding@resend.dev>` y el verificador bloquea la ausencia de ese valor.
- DEV desplegado como `f7704d95-8ef0-4600-8dd6-31cf7712cbe0`; producción sin
  cambios.

## Revalidación final del dispatcher DEV — 2026-09-28

- Suite: 135 archivos y 584 pruebas; lint y builds productivo/DEV correctos.
- DEV vigente: `2786d548-e33b-4c2e-a328-f5748ae5def7`.
- El dispatcher exige `PHASE2_ENABLED=true` y `PUBLIC_SITE_URL`; sin cualquiera
  de ellas no accede a red ni reclama notificaciones.

Última actualización: 2026-09-28

## Parser seguro de confirmación de correo — 2026-09-28

- Las respuestas de Supabase para confirmación se validan como `unknown`, sin
  `any` en esa frontera. Suite: 135 archivos y 586 pruebas.
- DEV desplegado como `6b8e21d9-a84d-4565-b4e1-9e0fccfeda76`; producción sin
  cambios.

## Estado vigente al cierre de esta sesión — 2026-09-28

- Gates: lint correcto, 136 archivos y 600 pruebas correctas, build productivo
  aislado y build `phase2-dev` correctos; sitemap real de 446 URLs.
- Auditoría de dependencias: el espejo npm local no implementa el endpoint de
  auditoría (`404 NOT_IMPLEMENTED`), pero el registro oficial terminó con
  `found 0 vulnerabilities`; no se modificaron dependencias.
- Moderación de imágenes almacenadas: regresión añadida para descargar una
  imagen pública de Supabase, convertirla a base64 y enviarla a Groq. La suite
  queda en 135/582 y DEV queda pendiente de prueba remota por falta del secreto
  de Groq.
- El Worker DEV fija `PUBLIC_SITE_URL` al origen DEV y el verificador bloquea
  builds sin esa variable o con el dominio productivo. Versión desplegada:
  `6329a5cc-cd09-4557-a10a-1d0217cd84ec`; producción permanece sin cambios.
- La documentación de operación quedó corregida: el envío de alertas por correo
  está implementado en DEV con reclamación idempotente, reintentos y Cron junto
  a Push/KYC. El secreto `RESEND_API_KEY` está configurado en DEV; solo falta
  una entrega real controlada con un destinatario DEV. Producción no ejecuta
  este dispatcher.
- DEV vigente: `cubitat1-phase2-dev`, versión
  `97259d81-46cd-42e9-a2d0-4784390d458b`. Producción permanece sin cambios.
- El dispatcher de alertas exige `PHASE2_ENABLED=true`; con Fase 2 desactivada
  devuelve un resumen vacío sin acceder a red. La regresión quedó cubierta en
  la suite y el guard se desplegó solo en DEV.
- Auth DEV quedó sincronizado y verificado con `site_url` del Worker DEV,
  callbacks DEV y producción, y `otp_expiry = 900` (enlaces de recuperación de
  15 minutos). La primera diferencia detectada durante el `config push` fue
  corregida antes de continuar; la segunda ejecución confirmó que Auth remoto
  está actualizado.
- El build `phase2-dev` valida automáticamente que Auth no apunte a producción
  y que sitemap/robots usen el origen DEV. El despliegue remoto respondió 200
  para ambos artefactos y no incluyó referencias a `https://cubitathome.com`.
- La regla anti-duplicado de publicaciones quedó aplicada únicamente en
  Supabase DEV mediante `dev-migrations/20260928010000_property_duplicate_rules.sql`.
  La prueba transaccional creó el flag y el aviso de revisión esperado y
  terminó con `ROLLBACK`; producción no recibió la migración.
- El panel de moderación DEV muestra el título de la publicación relacionada
  cuando existe ese flag. Gates vigentes: 135 archivos/581 pruebas, lint y
  builds correctos. DEV actualizado a `7febd479-a185-4958-9fc9-7ef21f69bcab`;
  `/` y `/moderar` respondieron HTTP 200.
- El ciclo de duplicados quedó cerrado en DEV con
  `20260928020000_resolve_duplicate_flags_on_review.sql`: las decisiones finales
  resuelven la señal y el regreso a revisión la reactiva. La prueba remota pasó
  con `ROLLBACK`; el panel ya filtra señales resueltas.
- Verificación documental: una solicitud rechazada ahora permite enviar una
  nueva evidencia, porque la unicidad solo aplica mientras exista una solicitud
  `pending`. La regresión queda cubierta y el chunk DEV fue comprobado por HTTP.
- Push ahora continúa la activación después de recuperar una preparación fallida
  de VAPID/Service Worker en el mismo intento; la regresión está cubierta por
  6 pruebas del componente. El bundle DEV y `/`, `/mi-cuenta`, `/sw.js`
  respondieron correctamente por HTTP.
- Último endurecimiento: recuperación exige credenciales reales del enlace;
  `type=recovery` aislado no habilita el cambio de contraseña.
- Nuevo endurecimiento: el cliente SSR de Supabase no cae a la URL del proyecto
  productivo si falta configuración; usa un dominio inválido seguro. Gates:
  lint, 134 archivos/570 pruebas y builds productivo/DEV correctos. DEV vigente
  tras el despliegue: `c1198d5c-2b55-43fd-a33c-1cc1853eb4c8`; producción sin cambios.
- La reevaluación IA restaura el estado previo si falla antes de ser aceptada;
  el caso quedó cubierto en el hook administrativo y desplegado en DEV.
- La frontera de `/api/ai-moderate` quedó tipada sin `any` para el payload y la
  respuesta de Groq; los estados externos se validan contra una lista cerrada y
  una respuesta inválida conserva `pending_review`. Gates: lint, 134 archivos/
  570 pruebas y builds productivo/DEV correctos. Se promovió únicamente al
  Worker DEV como `c1198d5c-2b55-43fd-a33c-1cc1853eb4c8`; producción sigue sin
  cambios.
- El routing del clic Push rechaza rutas con barras invertidas antes de
  normalizarlas, evitando que una URL manipulada salte a un dominio externo.
  Regresión cubierta; lint, 134 archivos/570 pruebas y builds productivo/DEV
  correctos. Se desplegó solo en DEV como `68f8e3c4-3632-4f1a-ac8e-d263d366e548`;
  producción permanece sin cambios.
- Las tarjetas de métricas ya distinguen valores ausentes de cero real; la
  regresión quedó cubierta y el cambio está desplegado solo en DEV.
- El verificador del bundle DEV bloquea referencias al proyecto productivo en
  HTML/assets. Supabase DEV fue revalidado en modo lectura: migraciones locales
  y remotas alineadas y `db lint` sin errores de esquema.
- Pendientes externos: secretos opcionales de proveedores y QA físico real de
  Push en Android/iOS.
- El manejo de errores de autenticación quedó modularizado: OAuth y CAPTCHA
  muestran mensajes seguros, y el reenvío de confirmación devuelve error
  controlado cuando el proveedor de correo no está configurado o falla. Suite
  completa: 134 archivos/578 pruebas; DEV vigente:
  `b4314b14-2ff9-43b8-a070-6983806c04eb`.
- El modal conserva el mensaje seguro del endpoint de reenvío y usa un fallback
  genérico si la respuesta no es JSON.
- Auditoría de dependencias: el espejo npm local no implementa auditorías
  (`404 NOT_IMPLEMENTED`), pero `npm audit --audit-level=high` contra el
  registro oficial terminó con `found 0 vulnerabilities`; no se cambiaron
  paquetes.
- El endpoint de reenvío de confirmación valida el cuerpo como `unknown` antes
  de leer `email`; Worker 46/46 y suite 134/578 pasaron, con DEV actualizado a
  `acaf392b-46c5-4447-9f1d-d97c9a8a5226`.
- El aviso de actualización PWA volvió a conectarse con `registerSW`; la suite
  completa quedó en 134 archivos/576 pruebas y el despliegue DEV vigente es la
  versión `0d1170a4-5eb9-481c-a65d-1216f7c709a0`.
- Revalidación remota del 2026-09-28: `supabase migration list --linked`
  permanece alineado y `supabase db lint --linked --level warning` terminó sin
  errores; no se hicieron escrituras remotas.
- La recuperación de contraseña oculta errores técnicos de PKCE/tokens y guía al
  usuario a solicitar un enlace nuevo; regresión cubierta y desplegada solo en
  DEV como `562121b5-d335-4627-9f6c-e9bdb6b1a8bf`.
- Inventario DEV de secretos consultado sin valores: Push, Resend, salt de
  métricas de contacto, service role y anon están presentes; Groq y métricas
  externas opcionales siguen ausentes y degradan de forma segura.
- Métricas administrativas: límite de 30 solicitudes por administrador AAL2 por
  minuto, con 429 y `Retry-After`; regresión cubierta y desplegada solo en DEV.
  La versión vigente se registra en el bloque de despliegue posterior.
- Auditoría de dependencias 2026-09-28: `npm audit --audit-level=high`
  terminó con `0 vulnerabilities` tras actualizar MapLibre `6.11.2`, PostCSS
  `8.5.28`, sharp `0.35.5`, Vitest `4.1.11` y Wrangler `4.142.0`. La
  importación se adaptó a MapLibre 6 y todas las gates volvieron a pasar.
- La auditoría pública posterior al último despliegue pasó 6/6 en Chromium;
  `/`, `/mi-cuenta`, `/moderar`, `/manifest.webmanifest` y `/sw.js`
  respondieron HTTP 200. Producción permanece sin cambios.
- El rate limiter normaliza parámetros inválidos y limpia entradas expiradas en
  paralelo; `CubitatApp` protege actualizaciones posteriores a la caché.
- La matriz SQL/RLS sigue pendiente por Docker; el esquema remoto sí pasó lint
  y dry-run sin divergencias. También siguen pendientes proveedores externos,
  cuentas QA autenticadas y QA físico Push/PWA.

## 2026-09-28 - Diagnóstico inicial del mapa DEV con MapLibre 6

- El mapa base y los controles OpenFreeMap cargan en una pestaña limpia de
  DEV, pero la fuente GeoJSON de propiedades no muestra marcadores.
- Se probó temporalmente sin clustering y el resultado fue el mismo; se
  restauró el clustering original. MapLibre 5 sí evita este síntoma en una
  prueba, pero `npm audit --audit-level=high` reporta una vulnerabilidad
  crítica en esa rama, por lo que no se dejó esa dependencia.
- El bloqueo quedó resuelto posteriormente con la inicialización tolerante y el
  fallback aislado de marcadores DOM documentados en `FASE2_ESTADO.md`.
  Producción no se tocó.

## 2026-09-28 - Verificación documental DEV estabilizada

- La migración `20260810000000_property_verification_and_trust_score.sql`
  está aplicada únicamente en Supabase DEV; tabla, bucket privado, RLS y RPC
  fueron verificados sin fixtures.
- La UI de propietario y la pestaña administrativa `Documentos` están aisladas
  de producción. El Trust Score se normaliza correctamente desde la respuesta
  array de Supabase y degrada sin bloquear la revisión si falla.
- `supabase db lint --linked --level warning` terminó sin errores de esquema.
- Gates actuales: lint, 118 archivos/499 pruebas y builds productivo/DEV
  correctos. Worker DEV `42afda30-2b43-4ab5-b5f3-9d50581c9557`; producción sin
  cambios.
- `/api/ai-moderate` tiene ahora un límite por usuario de 5 solicitudes cada
  10 minutos y responde 429 con `Retry-After`; la regresión pasa y el cambio se
  desplegó solo en DEV como `f40ef974-36dc-45d4-9146-ce4aa1db98c2`.
- El manifest PWA DEV remoto fue comprobado con `display: standalone`,
  `scope/start_url` en `/` y `related_applications` del mismo origen; queda
  pendiente la confirmación física de instalación previa en Android/iOS.
- Pendientes operativos: E2E persistente con cuentas/documentos reales, QA
  física Push Android/iOS, decisión sobre exposición pública del indicador y
  validación legal manual fuera del alcance técnico.

## 2026-09-28 - UI KYC DEV desplegada y verificada

- Estado: **desplegado y visible únicamente en DEV**.
- Se ejecutó `npm run build:phase2-dev`; TypeScript, Vite, PWA y el verificador
  del bundle DEV terminaron correctamente. El sitemap generó 446 URLs.
- Worker `cubitat1-phase2-dev` desplegado como versión
  `edb4a494-3e44-4f26-8847-fdd945340a21`.
- Verificación remota autenticada en una pestaña limpia de
  `/mi-cuenta?fresh=edb4a494`: aparecen `Verificación de Identidad (KYC)` y
  `Solicitar Verificación`. Producción no fue modificada.
- Hallazgo de QA: una pestaña anterior conservaba el bundle
  `index-D0HWr-zQ.js` mediante el service worker y ocultaba KYC; una pestaña
  limpia cargó `index-DcnWXhAe.js` y confirmó el resultado. Para validar un
  despliegue DEV después de actualizar, abrir una pestaña nueva o limpiar el
  service worker/caché del origen.
- Estado del formulario: el estado vacío, la validación de ambas imágenes, la
  compresión, la compensación de subidas parciales y la limpieza cuando falla
  el registro final están cubiertos por pruebas. Sigue pendiente la ejecución
  con una fixture DEV persistente para validar moderación AAL2 y almacenamiento
  privado extremo a extremo.
- Comprobación remota adicional en DEV: `public.kyc_requests` y
  `profiles.verification_status` existen; el bucket `kyc_documents` existe y
  permanece privado; `storage.objects` mantiene RLS activo; y las funciones
  `submit_kyc_request` y `review_kyc_request` tienen ejecución para los roles
  esperados. No se ejecutaron escrituras desde el SQL Editor.
- Calidad posterior al despliegue: `npm run lint` limpio, `npm run test:run`
  con 114 archivos y 483 pruebas aprobadas, y `npm run build` correcto con los
  verificadores de aislamiento de producción y Worker completados. El intento
  de abrir `/moderar` queda pendiente de AAL2 porque esta sesión no dispone del
  TOTP; no se intentó elevarla ni se crearon fixtures.
- QA automatizado adicional de Push y borradores: 7 archivos y 41 pruebas
  aprobadas. La prueba física Android/iOS, el envío de fotos reales y la
  moderación KYC AAL2 siguen siendo pendientes operativos, no fallos del build.
- Refuerzo de regresión KYC: se añadió una prueba que confirma la eliminación
  de documento y selfie si falla el registro final de la solicitud. Tras el
  cambio, lint quedó limpio, la suite completa pasó con 114 archivos y 484
  pruebas, y el build volvió a completar sus verificadores.
- Moderación KYC: se añadió cobertura para conservar la solicitud visible y
  mostrar un aviso seguro cuando falla una aprobación. La suite completa pasó
  después con 114 archivos y 485 pruebas; no hubo cambios de datos remotos.
- Evidencia incompleta: se cubrieron por separado las ausencias de documento y
  selfie; la aprobación permanece deshabilitada si falta cualquiera de las dos.
  Tras corregir el tipo de la fixture, lint, 114 archivos/486 pruebas y build
  quedaron correctos.
- Módulo de agentes revisado en DEV/local: repositorios, perfil público,
  dashboard, filtros y gestión de visibilidad pasaron 5 archivos y 20 pruebas
  focalizadas. No se detectaron regresiones ni se tocaron datos remotos.
- Push revisado en local: servicio de suscripción, preferencias, lectura,
  Service Worker y dispatcher pasaron 5 archivos y 33 pruebas focalizadas.
  También se confirmó la limpieza de caché PWA obsoleta; no se tocaron datos
  remotos ni se hizo despliegue por tratarse de una verificación sin cambios.
- Autenticación revisada en local: recuperación de contraseña, parámetros de
  callback, CAPTCHA, política de contraseñas, comprobación de contraseñas
  comprometidas y callback OAuth pasaron 7 archivos y 43 pruebas focalizadas.
- Se añadió cobertura unitaria del diálogo de rechazo KYC (motivo obligatorio,
  acciones y estado de procesamiento); el ciclo completo queda en 115 archivos
  y 489 pruebas, con lint, build y aislamiento de producción correctos.
- Smoke visual remoto DEV, solo lectura: la pestaña limpia autenticada carga
  `/mi-cuenta` y muestra Push activo (`Las notificaciones están activas en este
  dispositivo`); no se ejecutaron acciones persistentes.
- Corrección legal desplegada solo en DEV: la portada sustituye la afirmación
  no demostrada por `El portal inmobiliario para Cuba`. Build `phase2-dev`,
  verificador KYC y sitemap completados; Worker `cubitat1-phase2-dev` en la
  versión `c703a87c-7f5d-447d-8280-f1365fc92fb2`. Verificación HTTP directa del
  asset: `200`, copy nuevo presente y copy antiguo ausente. Una pestaña que aún
  muestra el texto anterior conserva caché del Service Worker; debe actualizarse
  o abrirse limpia para la QA visual. Producción no fue modificada.
- Reconciliación con la propuesta comercial: el Trust Score permanece diferido
  por decisión de producto y la auditoría del código no encontró una tabla,
  migración ni flujo para verificación documental de propiedad. KYC de identidad,
  moderación IA/manual, reportes y controles antiabuso existentes sí tienen
  implementación y pruebas. La verificación documental de propiedad queda como
  pendiente de definición funcional/legal, no como requisito falsamente cerrado.
- Regresión de copy legal en `HomePage.test.tsx`: exige el texto verificable de
  portada y evita que reaparezca el claim no sustentado. El ciclo completo se
  mantuvo en 115 archivos y 489 pruebas, con lint, build y aislamiento correctos.
- Matriz auditable de entregables y pendientes creada en
  `docs/FASE2_ESTADO.md`; separa implementación verificada, QA físico, definición
  funcional/legal y decisiones diferidas sin inventar alcance.
- Corrección PWA: `PWAInstallPrompt` vuelve a comprobar
  `getInstalledRelatedApps()` antes de mostrar el aviso recibido por
  `beforeinstallprompt`, evitando ofrecer instalación si la app ya estaba
  instalada. La regresión cubre esa carrera; ciclo completo: lint, 115 archivos
  y 490 pruebas, build, aislamiento y sitemap de 446 URLs.
- Desplegada únicamente en `cubitat1-phase2-dev`, versión
  `66416dfb-946a-430a-9748-66d541890512`. El asset DEV respondió HTTP `200` y
  contiene la comprobación `getInstalledRelatedApps`; no se modificó producción.
- Verificación remota de assets de esa versión: `AccountPhaseTwoSections` y el
  bundle principal respondieron `200`; el primero contiene `submit_kyc_request`,
  el segundo contiene `getInstalledRelatedApps` y `sw.js` respondió `200`.
- Corrección adicional del manifest PWA: el build `phase2-dev` usa ahora
  `related_applications` del origen DEV y el build productivo conserva el origen
  productivo. Worker DEV redeplegado como versión
  `cd5cfcff-ee75-43f6-baeb-bc5f3fb28b30`; ambos manifests remotos respondieron
  `200` y apuntaron a su propio dominio.

> Estado vigente: los seis hallazgos de la auditoría Fase 1 del 2026-09-11
> están corregidos, probados y desplegados. Las migraciones 55 a 59 están
> sincronizadas y producción usa el Worker
> `14a5dd39-9f47-4077-bed4-ef916c2bd24b`. El PR `#108` integró el lote en
> `main` como `73a3c8d`; permanecen pendientes los QA físicos/autenticados,
> contenido aprobado y revisión legal.

## 2026-09-24 - Corrección del planificador Push en DEV

- Estado: **corregido y desplegado únicamente en DEV**.
- `web/src/worker-phase2-dev.ts` ahora incluye
  `dispatchPendingPushNotifications` junto a las tareas de correo y retención
  KYC. La regresión quedó cubierta por `worker-phase2-dev.test.ts`.
- `wrangler.phase2-dev.jsonc` ejecuta el cron cada minuto para permitir la
  validación de entrega sin esperar 15 minutos.
- Gate local: `npm run lint`, 114 archivos/478 pruebas y `npm run build`.
- Worker DEV: `cubitat1-phase2-dev`, versión
  `37a6b5b5-4c39-4027-9983-99d2212e2a96`.
- Producción no fue modificada. Sigue pendiente la prueba física de recepción
  y apertura en Android/iOS con una PWA instalada y permiso concedido.

## 2026-09-24 - Recuperación segura de borradores locales

- `web/src/pages/publish/draftStorage.ts` ahora elimina entradas JSON corruptas
  de forma aislada, tanto para la clave del usuario como para el formato legado,
  y permite que el formulario continúe sin afectar otras cuentas.
- Regresión cubierta en `draftStorage.test.ts`. Gate: lint, 114 archivos/480
  pruebas y build correctos.
- Desplegado únicamente en `cubitat1-phase2-dev`, versión
  `7db8d49b-9297-4026-889d-70120f797a1f`. Producción no fue modificada.

## 2026-09-24 - Primera integración controlada de Fase 2 en producción

- Módulo integrado: tolerancia a borradores locales corruptos. No requiere
  migraciones, secretos ni cambios del Worker de Fase 2.
- Commit aislado de producción: `0c9469a`, basado en `origin/main`.
- Validación del worktree limpio: lint, 112 archivos/476 pruebas (1 omitida) y
  build con sitemap productivo correcto.
- Worker productivo `cubitat1` desplegado con versión
  `27c58e01-acb7-4720-9f30-e541d998539d`.
- Rollback: revertir `0c9469a` y volver a desplegar la configuración productiva
  anterior. No se tocaron migraciones ni datos.

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

> Actualización 2026-09-07: rama `bugfix/mobile-menu-overlay`. Se corrigió la
> superposición del menú móvil detectada en inicio y resultados: la navegación
> inferior (`z-index: 130`) y las acciones flotantes de mapa/alerta
> (`z-index: 120`) aparecían sobre el panel (`z-index: 115`). El menú ahora
> bloquea el scroll del fondo, ocupa la capa superior bajo el encabezado, oculta
> ambos controles mientras está abierto y reduce el espacio inferior reservado
> para mantener visibles `Comprar` y `Rentar`. Evidencia local en viewport
> 390x844: panel 390x786, barra inferior oculta y ambas opciones completas. Gate
> completo: `npm run lint`, `npm run test:run` (93 archivos/380 pruebas) y
> `npm run build`. PR #92 fusionado a `main` como `4beca04` y desplegado al
> Worker `cubitat1` como versión `523e7ef5-b3bb-4bf8-8cb6-d658d0430e26`.
> Verificación productiva en `/resultados?operacion=venta`, viewport 390x844:
> el panel terminó en el borde inferior del viewport, el scroll del documento
> quedó bloqueado, la barra móvil y `Mostrar mapa`/`Crear alerta` pasaron a
> `display: none`, y `Comprar`/`Rentar` quedaron completos. Producción sirvió
> `/assets/index-Bu8fgoun.css`; el único error de consola fue el DNS externo del
> beacon analítico de Cloudflare ya registrado.
> Captura posterior del usuario en el mismo teléfono confirmó que las capas ya
> no se superponen, pero el menú autenticado conservaba demasiado espacio entre
> opciones y cortaba parcialmente `Rentar`. En `bugfix/mobile-menu-compact` se
> redujeron panel, perfil, listas y botones al mínimo táctil de 44 px. QA visual
> local con menú admin equivalente, viewport 390x760: panel de 702 px sin scroll
> inicial y `Rentar` termina 97 px antes del borde. Gate completo: lint limpio,
> 93 archivos/380 pruebas y build/PWA correcto. PR #94 fusionado a `main` como
> `22c3bed` y desplegado al Worker `cubitat1` como versión
> `30e2afe4-849d-4728-8d12-aca2fbaeae96`. Producción sirve
> `/assets/index-Bz2vdU9l.css`; prueba del menú autenticado completo con ese CSS
> en 390x760: 0 px de scroll requerido y `Rentar` a 92 px del borde inferior.
> La página real de resultados mantuvo ocultas la barra inferior y las acciones
> flotantes mientras el menú estaba abierto.

> Actualización 2026-09-07: rama `hotfix/publish-image-csp-realtime`.
> Durante QA productivo del formulario de publicación se reprodujo
> `Hubo un error al publicar la propiedad: Failed to fetch` después de subir una
> imagen real y completar `Patio`, `Piscina` y `Piso / Nivel`. Causa en cliente:
> `fetch(dataUrl)` quedaba bloqueado por la CSP productiva antes de subir a
> Storage. Se reemplazó por conversión local `dataUrlToBlob`, se cubrió con
> prueba de regresión y se desplegó a producción como Worker
> `608e21de-fb3b-4a13-aa90-d781630c2a0b`. Cloudflare Tail también mostró 500
> en Realtime por intentar reconstruir una respuesta WebSocket `101`; el Worker
> ahora pasa esos responses sin envolverlos. QA transaccional autenticado con
> `pochiprats18+cubitat-test-20260906a@gmail.com`: subida WebP a
> `property_images`, inserción en `properties` con `amenities` `Patio`/`Piscina`
> y `features.floorLevel = 3`, lectura de la fila `pending_review`, eliminación
> de la fila y limpieza del objeto QA de Storage. Gate completo: `npm run lint`,
> `npm run test:run` (92 archivos/379 pruebas), `npm run build` y
> `npm run cf:deploy`.

> Actualización 2026-09-06: rama `feature/publication-feedback-controls`.
> El formulario de publicación ahora mantiene explícitos operación
> (`venta`, `alquiler`, `permuta`) y tipo (`casa`, `apartamento`, `terreno`),
> añade amenidades `Patio` y `Piscina`, y captura `Piso / Nivel` para
> apartamentos en `features.floorLevel`. La carga de propiedades incluye
> `features` y el detalle muestra piso/nivel o niveles cuando existen. Gate
> local completo: `npm run lint`, `npm run test:run` (92 archivos/376 pruebas)
> y `npm run build`. PR #90 fusionado a `main` junto con PR #89 y desplegado a
> producción como Worker `63cddd65-19cd-49be-b283-ad17d965ce4b`. Smoke
> productivo: home sirve bundle `/assets/index-DQ8jW4Ib.js`; chunk
> `/assets/PublishPage-tXL1Bfq5.js` contiene `Piscina`, `Patio`, `Piso / Nivel`,
> `floorLevel`, `hasPool` y `hasPatio`; chunk
> `/assets/DetailPage-B05yreZH.js` contiene visualización de `Piso / nivel`,
> `Niveles`, `floorLevel` y `features`. Pendiente: creación/edición real de una
> publicación QA porque el selector de ubicación fue inestable bajo
> automatización de navegador.

> Actualización 2026-09-06: por decisión de producto se retiró del MVP la
> verificación obligatoria de celular por WhatsApp. En
> `bugfix/auth-production-redirect`, `Mi cuenta` permite editar `profiles.phone`
> como dato normal; el Worker permite `PATCH` autenticado a `profiles` solo para
> campos seguros (`full_name`, `phone`, `avatar_url`) y conserva bloqueados
> `role`, `verification_status` y `phone_verified_at`. Gate local completo:
> `npm run lint`, `npm run test:run` (92 archivos/376 pruebas) y
> `npm run build`. Desplegado a producción como Worker
> `16d7ecdb-e3cf-4a24-a716-4aa39629e2cc`. Smoke productivo: home y rutas de
> auth/cuenta responden 200, rutas privadas conservan `X-Robots-Tag: noindex`,
> el bundle servido es `/assets/index-C-WWT6yY.js`, no aparece texto de
> "Verificar por WhatsApp" en cuenta anónima, los errores PKCE/AAL2 siguen
> ocultos, el `PATCH` anónimo a `profiles` responde 403, campos protegidos con
> bearer falso responden 403, y `PATCH` de campos seguros con bearer falso pasa
> el filtro del Worker y falla en Supabase con 401 por JWT inválido. Prueba real
> autenticada completada el 2026-09-06 con el alias
> `pochiprats18+cubitat-test-20260906a@gmail.com`: registro con Turnstile,
> correo de confirmación por Gmail, callback `token_hash` en producción, login
> por contraseña, edición de celular `+53 5555 0000`, persistencia tras recarga,
> recuperación de contraseña y login posterior con la nueva clave. Google OAuth
> abre `accounts.google.com` sin `localhost` y conserva `redirect_to` hacia
> `https://cubitathome.com/auth/callback`.

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
| F. Moderación Groq | Implementado; verificación DEV pendiente | Codex principal | El flujo de reevaluación y la ruta multimodal están cubiertos por pruebas, incluida la descarga de imágenes almacenadas. Falta configurar `GROQ_API_KEY` en DEV y ejecutar una prueba remota con proveedor real; no se declara cerrado por evidencia histórica de otro entorno. |
| G. Contenido real | Bloqueado | — | Requiere inventario, fotos, títulos, precios y zonas aportados o aprobados por el usuario. |
| H. Legal | Bloqueado | — | Requiere revisión jurídica externa de Privacidad y Términos. |
| I. Operación humana | Terminado | Rodolfo | Responsable de moderación definido: Rodolfo. SLA operativo: revisar publicaciones en un máximo de 24 horas. |
| J. Modularización admin | Terminado | Codex principal | Propiedades, Reportes y Métricas aislados bajo `src/modules/admin`; `AdminPage` quedó como shell de 97 líneas sin acceso directo a Supabase. PR #20 fusionado y Worker `1d8ae4c4-8223-4499-b013-7bd0bfe29099` verificado en producción con sesión admin: tres módulos operativos y consola limpia. Sin migraciones ni cambios de datos. |
| K. Contexto del anunciante | Terminado | Codex principal | PR #22 fusionado y desplegado; contexto real cargado bajo demanda con sesión admin, guard conservado y consola limpia. Inspección visual móvil real queda como pendiente no bloqueante. |
| L. Bitácora de moderación | Terminado | Codex principal | PR #26 fusionado y migración 42 sincronizada. Revalidación productiva 2026-07-19: anónimo rechazado; usuario normal y admin AAL1 con 0 filas; admin AAL2 con 4 eventos; `INSERT/UPDATE/DELETE` no autorizados rechazados, `service_role` sin `UPDATE/DELETE` y trigger inmutable habilitado. Transacción finalizada con `ROLLBACK`. |
| P. MFA administrativo | Terminado | Codex principal | TOTP activo; guard modular, Worker, RPC y RLS exigen `aal2`. Migración 47 sincronizada; admin AAL1 denegado, admin AAL2 operativo y propietario normal aislado. Lint, 172 pruebas, build, panel y consola verificados. |
| Q. Recuperación MFA administrativa | Terminado | Codex principal | Runbook de emergencia en `docs/ADMIN_MFA_RECOVERY.md`. Simulacro no destructivo completado el 2026-07-21: contratos de SDK y API Admin validados, 8/8 pruebas de regresión aprobadas y 0 factores modificados. |
| R. Logs seguros del frontend | Terminado | Codex | Parche `8abf03a` integrado en `dev` y desplegado el 2026-08-08 como Worker `f4688058-d178-4243-bc4f-7f6ef28e8aca`. Logger cerrado en runtime, guard arquitectónico, 355 pruebas y build aprobados; inicio, resultados, detalle y login verificados en producción con consola limpia. |
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

### 2026-09-05 - Codex - Redirect productivo de Auth corregido y desplegado

- Estado: **corregido, desplegado y verificado en producción** desde la rama
  `bugfix/auth-production-redirect`; Worker
  `d938fb7e-d9b4-46a0-9063-7444914225e2`. Actualización posterior del mismo
  hotfix desplegada como Worker `d6e4c941-e7c3-468d-93f6-9769c1beff0b` para
  cubrir CAPTCHA en login por contraseña.
- Hallazgo reproducido en producción: el botón Google del modal enviaba a
  `http://127.0.0.1:54321/auth/v1/authorize` y pasaba
  `redirect_to=http://127.0.0.1:5173/auth/callback?flow=oauth`, por lo que el
  navegador terminaba en `ERR_CONNECTION_REFUSED`.
- Causa: `getAuthRedirectUrl` confiaba siempre en `VITE_PUBLIC_SITE_URL` cuando
  existía y `LoginModal` reemplazaba el proxy `/api/supabase` por
  `VITE_SUPABASE_URL` sin descartar valores locales. Si el build o entorno
  publicaba accidentalmente valores de desarrollo, los flujos de Google OAuth,
  registro por correo y recuperación heredaban ese origen incorrecto.
- Corrección: `resolveAuthRedirectBaseUrl` descarta un `VITE_PUBLIC_SITE_URL`
  local cuando `window.location.origin` es público, usa el origen visible y
  conserva callbacks locales solo cuando la app corre en `localhost` o
  `127.0.0.1`. `resolveSupabaseOAuthUrl` conserva el proxy productivo si
  `VITE_SUPABASE_URL` apunta a Supabase local.
- Evidencia local: pruebas focales de auth aprobadas, lint limpio, 91 archivos
  y 364 pruebas aprobadas, build Vite/PWA correcto con verificadores de
  aislamiento Fase 2 y sitemap de 473 URLs. El chunk compilado con
  `VITE_PUBLIC_SITE_URL=http://127.0.0.1:5173` devuelve
  `https://cubitathome.com/auth/callback?flow=oauth` al simular origen
  productivo.
- Evidencia productiva: un navegador aislado abrió el modal, pulsó Google y la
  cadena navegó a `/api/supabase/auth/v1/authorize` con callback
  `https://cubitathome.com/auth/callback?flow=oauth`, después a
  `accounts.google.com`; no apareció `127.0.0.1` en la ruta final. No se inició
  sesión, no se resolvió CAPTCHA y no se creó cuenta.
- Incidencia móvil posterior: una captura de celular mostró que el login por
  correo devolvía `captcha protection: request disallowed (no captcha_token
  found)`. Causa: Supabase Attack Protection también exige `captchaToken` para
  `signInWithPassword`, pero el modal solo renderizaba Turnstile en registro y
  recuperación.
- Corrección adicional: el login por contraseña ahora renderiza
  `TurnstileWidget` con acción `login-password`, bloquea el submit hasta tener
  token, envía `options.captchaToken` a `signInWithPassword` y renueva el widget
  ante cualquier fallo.
- Evidencia adicional: lint limpio, 91 archivos y 368 pruebas aprobadas, build
  Vite/PWA correcto con verificadores de aislamiento Fase 2. En producción móvil
  simulada se abrió el modal desde `Cuenta`, apareció el contenedor Turnstile
  `login-password`, y al intentar enviar sin token se mostró el mensaje seguro
  local sin hacer ninguna petición a `/auth/v1/token`.
- Incidencia móvil posterior de confirmación: una captura al abrir el enlace de
  confirmación mostró `PKCE code verifier not found in storage`, típico cuando
  el correo se abre en un navegador/dispositivo distinto al que inició el
  registro.
- Corrección de confirmación: `confirmation.html` ahora genera
  `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup`, y
  `AuthCallbackPage` confirma esos enlaces con `supabase.auth.verifyOtp`.
  El callback conserva compatibilidad con `code` PKCE para enlaces antiguos y
  reemplaza errores técnicos de PKCE/OTP/token por un mensaje seguro en español.
- Evidencia local de confirmación: pruebas focales de callback aprobadas,
  suite completa con 91 archivos y 370 pruebas aprobadas, lint limpio y build
  Vite/PWA correcto.
- Estado productivo de confirmación: `supabase config push --project-ref
  tohjzoncoosvjbjcakdl --yes` aplicó la plantilla remota y se corrigió
  inmediatamente `auth.captcha.enabled = true` después de detectar que el
  `config.toml` local anterior intentaba apagar CAPTCHA. También se restauró el
  `client_id` público de Google en Supabase Auth porque el push inicial lo había
  enviado como texto `env(...)`. Frontend desplegado como Worker
  `b23a0b39-9e64-46d9-ba77-764f8bcf4a29`.
- Evidencia productiva de confirmación: `/auth/callback?token_hash=invalid&type=signup`
  muestra el mensaje seguro en español y no expone `PKCE code verifier` ni el
  error inglés de Supabase. Google OAuth volvió a abrir `accounts.google.com`
  con el client id correcto y sin `localhost` ni `invalid_client`.
- Pendiente: probar un enlace real nuevo de confirmación generado después de la
  actualización de plantilla. Los enlaces anteriores a este cambio pueden seguir
  fallando porque ya fueron emitidos como PKCE. Se solicitó reenvío de
  confirmación en producción para el correo indicado por el usuario y el
  endpoint respondió `{"ok":true}`; falta que el usuario abra ese correo nuevo y
  confirme el resultado visible.
- Incidencia móvil posterior de recuperación: una captura al guardar nueva
  contraseña mostró el error crudo `AAL2 session is required to update email or
  password when MFA is enabled`. Causa: `ResetPasswordPage` preparaba la sesión
  de recovery, pero no elevaba a `aal2` con TOTP antes de `updateUser` cuando la
  cuenta tenía MFA verificado.
- Corrección de recuperación en curso: `ResetPasswordPage` detecta el estado MFA
  de la sesión temporal, pide código TOTP si hay un factor verificado pendiente
  de `aal2`, ejecuta `challengeAndVerify` antes de cambiar la contraseña y mapea
  el error técnico AAL2 a español.
- Evidencia de recuperación MFA: prueba focal nueva aprobada, lint limpio, 92
  archivos y 374 pruebas aprobadas, build Vite/PWA correcto con verificadores de
  aislamiento Fase 2. Desplegado como Worker
  `086bf206-9579-43cb-9130-070cd5b5141e`; producción carga
  `/recuperar-contrasena`, muestra el mensaje seguro para enlace incompleto y no
  expone el error crudo AAL2. Pendiente prueba real con enlace de recuperación y
  código TOTP del usuario para confirmar el cambio de contraseña end-to-end.
- Verificación integral solicitada por el usuario: se repitieron `npm run lint`,
  `npm run test:run` y `npm run build` sin fallos. Matriz móvil productiva:
  home `200`; login por contraseña muestra Turnstile `login-password`, bloquea
  sin token, no llama `/auth/v1/token` y no expone el error crudo de CAPTCHA;
  Google OAuth termina en `accounts.google.com` con client id correcto, callback
  productivo y sin `localhost`/`invalid_client`; confirmación con
  `token_hash` inválido muestra el mensaje seguro en español sin PKCE crudo;
  recuperación sin enlace muestra mensaje seguro y no expone AAL2; reenvío de
  confirmación responde `{"ok":true}`. Único pendiente no automatizable:
  completar un CAPTCHA real y un TOTP real desde el dispositivo del usuario.

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

## 2026-08-03 — Codex — Panel de Agente: reactivación y métricas reales (verificado en local)

- Rama: `dev`; producción y `main` no fueron consultados ni modificados.
- Causa reproducida en navegador: ocultar una propiedad cambiaba
  `published → owner_hidden`, pero reactivarla enviaba un `PATCH` directo a
  Supabase REST y recibía HTTP `403`. La política RLS permite ocultar, pero
  excluye deliberadamente `published` en `WITH CHECK`; la restauración segura
  ya estaba prevista mediante la RPC `restore_own_property`.
- Corrección: `setOwnerPropertyVisibility` usa las RPC protegidas
  `hide_own_property` y `restore_own_property`, conservando la validación de
  sesión y de transiciones permitidas. La regresión cubre ambas direcciones y
  el error de la RPC.
- QA en navegador: búsqueda por título, filtros Todas/Activas/Pausadas,
  ocultamiento y reactivación funcionaron en tiempo real. El panel mostró el
  éxito de reactivación sin alerta roja y volvió a 1 activa/1 pausada.
- Métricas: el endpoint DEV real contabilizó teléfono `1`, deduplicó el segundo
  clic idéntico en `1` y registró WhatsApp `1`; el panel mostró 2 contactos y
  los contadores `1/1`. Después se eliminaron únicamente los eventos y la
  notificación de QA; la propiedad quedó `published`, con 24 vistas y contacto
  `0/0`.
- Gate: lint limpio, 87 archivos/348 pruebas y build/PWA correcto con los
  verificadores de aislamiento de Fase 2 y sitemap de 473 URLs. El
  `web/public/sitemap.xml` ajeno conservó exactamente su hash previo.

## 2026-08-04 — Codex — Panel de Agente responsive y objetivos táctiles (verificado en local)

- Rama: `dev`; producción, `main`, Supabase remoto y Workers remotos no fueron
  consultados ni modificados.
- El listado del Panel de Agente conserva una sola estructura semántica: debajo
  de `lg` transforma las filas en tarjetas de dos columnas y en escritorio
  vuelve a la tabla. Precio, estado, interacciones y acciones permanecen
  visibles sin duplicar lógica ni requerir desplazamiento horizontal.
- Los controles principales del panel, `/mi-cuenta`, perfil público, cabecera y
  pie alcanzan un objetivo táctil mínimo de 44 px en móvil/tablet. Se añadieron
  estados y jerarquía mobile-first sin cambiar las acciones existentes.
- QA en navegador a 390×844 y 768×1024: `/panel-agente`, `/mi-cuenta` y
  `/agente/f3000000-0000-0000-0000-000000000001` quedaron sin desbordamiento
  de página, elementos recortados ni controles visibles menores de 44 px. La
  tabla pasó de 993/1126 px de ancho a 310/655 px, respectivamente; consola
  limpia y fixtures sin cambios.
- Regresión nueva para el layout responsive y acciones. Gate: lint limpio,
  88 archivos/349 pruebas y build/PWA correcto con verificadores de aislamiento
  Fase 2 y sitemap de 473 URLs.

## 2026-08-08 - Codex - Sitemap determinista (verificado en local)

- Rama: `dev`; no hubo escrituras en Supabase, despliegues ni cambios de base
  de datos.
- Causa: `generate-sitemap.mjs` aplicaba la fecha del build a todas las URLs y
  conservaba el orden recibido desde Supabase. El mismo inventario producia un
  diff completo por fecha y reordenamiento.
- Correccion: las rutas se ordenan por URL canonica; propiedades y landings
  usan `properties.updated_at`; las rutas estaticas omiten `lastmod` cuando no
  existe una fecha real. Las landings compartidas conservan la fecha mas nueva.
- Regresion: el documento es identico con entradas invertidas, normaliza fechas
  validas y no inventa `lastmod`. Dos ejecuciones directas y el build completo
  conservaron el SHA-256
  `DDCCA3FD67C3EFFC4A3B7E868E0A948011E35B71F7E66AA8A9A500DC24EE1939`.
- Gate: lint limpio, 89 archivos/352 pruebas y build/PWA correcto; 473 URLs y
  verificadores de aislamiento Fase 2 aprobados.

## 2026-08-08 - Codex - Carril R: cierre técnico local de logs seguros

- Estado: **implementado y verificado en local; permanece En curso** hasta la
  comprobación productiva exigida por el criterio de cierre. No hubo despliegue,
  escrituras en Supabase ni cambios de base de datos.
- Auditoría vigente: 75 llamadas a `logSafeEvent` en 26 archivos del frontend.
  Ningún caller actual envía IDs, URLs, mensajes libres, tokens ni datos
  personales en `code`, `action` o `context`. La cifra histórica de 56 llamadas
  `console.*` ya no describía el árbol actual.
- Corrección: `ErrorBoundary` dejó de imprimir el objeto `Error` y `ErrorInfo`
  crudos. `logger.ts` valida en runtime `module`, `action`, `level` y `code`, con
  categorías seguras de respaldo; el error visible al usuario no cambió.
- Regresiones: una prueba arquitectónica impide nuevas llamadas directas a
  `console.*` fuera del logger y Workers excluidos; las pruebas del logger y del
  boundary verifican que texto libre y errores crudos no lleguen a consola.
- Gate local: `npm run lint` limpio, 90/90 archivos y 355/355 pruebas aprobadas,
  y `npm run build` correcto con PWA, aislamiento Fase 2 y sitemap de 473 URLs.
- QA local en navegador: `/resultados?operacion=venta` mostró 7 propiedades, el
  detalle de “Apartamento luminoso en Vedado” abrió correctamente y
  `/mi-cuenta` anónimo mostró el acceso público sin exponer contenido privado.
  Las tres comprobaciones terminaron con 0 errores y 0 advertencias en consola.
- QA productiva de solo lectura: Wrangler identificó como activa la versión
  `c56a7e66-ef45-4570-b712-73d63fc996d5` (2026-07-25 16:42:34 UTC). Inicio,
  `/resultados?operacion=venta` con 140 propiedades, un detalle y el acceso
  anónimo a `/mi-cuenta` funcionaron con 0 errores y 0 advertencias; no se
  enviaron formularios ni se mutaron datos.
- El carril permanece **En curso**: esa versión productiva es anterior al
  commit `8abf03a`. Se requiere autorización explícita para desplegar una
  versión que contenga el hardening y repetir la misma verificación.

## 2026-08-08 - Codex - Carril R desplegado y verificado en producción

- Estado: **Terminado**. El commit de hardening `8abf03a`, documentado en
  `2526a44`, se desplegó desde `dev` al Worker `cubitat1` como versión
  `f4688058-d178-4243-bc4f-7f6ef28e8aca` (creada el 2026-08-09 01:24:59 UTC,
  equivalente al 2026-08-08 en `America/Mexico_City`).
- Predespliegue: árbol limpio y sincronizado; `npm run lint`, 90/90 archivos y
  355/355 pruebas, `npm run build`, verificadores de aislamiento de Fase 2 y
  sitemap de 473 URLs aprobados. `wrangler deploy --dry-run` correcto.
- Evidencia de artefacto: producción sirvió `/assets/index-C6L7QW7P.js`, el
  mismo entrypoint generado localmente desde `2526a44`.
- QA productiva: inicio, `/resultados?operacion=venta` con 140 propiedades,
  detalle “Apartamento luminoso en Vedado” y acceso anónimo a `/mi-cuenta`
  funcionaron con 0 errores y 0 advertencias en consola.
- Alcance: no se enviaron formularios, no se escribieron datos y no hubo
  cambios en Supabase ni bases de datos. El build productivo continuó
  excluyendo los módulos exclusivos de Fase 2.

## 2026-08-08 - Codex - Propuesta de retención de auditoría

- Estado: **documentada y pendiente de aprobación humana** en
  `docs/AUDIT_LOG_RETENTION_POLICY.md`.
- Propuesta: retención nativa para Cloudflare/Supabase Logs Explorer, 90 días
  móviles para `auth.audit_log_entries` y 180 días para evidencia mínima y
  sanitizada de incidentes confirmados.
- Evidencia oficial revalidada: Workers Logs conserva 3 días en Free y 7 en
  Paid; Supabase Logs Explorer conserva 1/7/28/90 días según Free/Pro/Team/
  Enterprise. `auth.audit_log_entries` es almacenamiento Postgres separado.
- Seguridad: `invocation_logs` continúa deshabilitado; no se abrió `wrangler
  tail`, no se consultaron registros productivos y no se ejecutó SQL, Cron,
  Log Drain, purga o cambio de plan.
- Pendiente exacto: el propietario debe aprobar o ajustar las ventanas. Una
  implementación futura requiere otro cambio y autorización destructiva
  independiente para la primera ejecución.

## 2026-08-09 - Codex - Política de retención aprobada

- Estado: **aprobación humana completada**. El propietario aprobó 90 días
  móviles para `auth.audit_log_entries` y 180 días desde el cierre para
  evidencia mínima y sanitizada de incidentes confirmados.
- Documentación: `docs/AUDIT_LOG_RETENTION_POLICY.md` registra fecha, alcance,
  excepciones por investigación activa y criterios de implementación.
- Acciones no ejecutadas: no hubo SQL, migración, Cron, Log Drain, cambio de
  plan, consulta de filas productivas ni purga.
- Pendiente exacto: diseñar y revisar la implementación con modo simulación.
  Desplegarla no autoriza la primera eliminación; esa ejecución destructiva
  requiere revisar previamente el conteo y recibir otra autorización explícita.

## 2026-08-09 - Codex - Retención Auth implementada en DEV/local

- Estado: **implementación local completada; primera purga no autorizada ni
  ejecutada**.
- Migración: `web/supabase/dev-migrations/20260809000000_audit_log_retention.sql`.
  Crea preview agregado a 90 días, purga servidor en lotes de hasta 1000 con
  dry-run por defecto y rangos de retención legal con RLS.
- Seguridad: funciones y tabla reservadas a `service_role`; `anon` y
  `authenticated` reciben permiso denegado. No existe Cron ni invocación
  automática y la migración permanece fuera de la cadena productiva.
- Evidencia: prueba contractual TDD y matriz SQL transaccional aprobadas. La
  matriz insertó fixtures sintéticas dentro de `BEGIN`/`ROLLBACK`, verificó
  exclusión de un rango retenido y conservó las tres filas en dry-run. Consulta
  posterior: 0 fixtures persistentes, preview `eligible_count = 0` y
  `deleted_count = 0`.
- Gate: `supabase db lint --local` sin errores, lint limpio, 91/91 archivos y
  359/359 pruebas, y build/PWA correcto con verificadores de aislamiento Fase 2
  y sitemap de 473 URLs.
- Git: PR #87 fusionado mediante squash en `dev` como `2a798d6`. La rama
  `feature/audit-log-retention-dev` fue eliminada y `dev` quedó sincronizada
  con `origin/dev`.
- Pendiente exacto: cualquier promoción productiva requiere otra autorización;
  la primera llamada con
  `p_dry_run = false` requiere además conteo previo y autorización destructiva
  independiente.

## 2026-08-09 - Codex - Reconciliación de cierre Fase 2

- Estado: **núcleo de Fase 2 cerrado y verificado en DEV/local**. El único
  pendiente activo de este alcance es repetir la matriz completa contra un
  proyecto Supabase DEV remoto nuevo e independiente.
- Integración: PR #87 fusionado en `dev` como `2a798d6`; no se fusionó hacia
  `main`, no se desplegó Fase 2 y no se ejecutó ninguna purga real.
- Revalidación local: `supabase db lint --local` limpio; matriz
  `audit_log_retention_local: ok` dentro de `BEGIN`/`ROLLBACK`; lint limpio;
  91/91 archivos y 359/359 pruebas; build/PWA correcto con 473 URLs y ambos
  verificadores de aislamiento Fase 2 aprobados.
- Verificación productiva de solo lectura: con la sesión administrativa AAL1
  existente, `/moderar` mostró exclusivamente el guard MFA y no renderizó KYC.
  `/panel-agente` y `/agente/:id` cayeron a la portada sin renderizar módulos de
  agente. La consola terminó con 0 errores y 0 advertencias; no se enviaron
  formularios ni se modificaron datos.
- Diferidos por decisión de producto y fuera del cierre actual: Trust Score,
  Web Push, gestión de varios factores MFA, promoción de Fase 2 a producción y
  primera purga real de auditoría.
- Pendiente exacto para un trabajo posterior: crear o designar un proyecto
  Supabase DEV remoto vacío, aplicar exclusivamente las migraciones DEV,
  configurar secretos DEV no productivos y repetir KYC, rol agente, métricas,
  Cron/retención y matrices RLS/AAL2. No reutilizar producción.

## 2026-09-12 - Antigravity - Cierre técnico de vulnerabilidades Fase 1 (Auditoría 2026-09-11)

- Estado: **Implementación local y validación del arnés completada**. Los 6 hallazgos
  de `docs/AUDITORIA_FASE1_2026-09-11.md` han sido subsanados y cubiertos con pruebas:
  1. P1 - Aislamiento Push: migración `20260911040000_push_account_isolation.sql`,
     `pushBinding.ts`, `pushService.ts` y desconexión limpia en `CubitatApp.tsx`.
  2. P1 - Cola Push: verificación estricta de titular `n.user_id = s.user_id` en
     `claim_pending_push_deliveries` e inmutabilidad de endpoints en DB.
  3. P1 - Retiro RPC antigua: migración `20260911050000_retire_legacy_moderation_rpc.sql`
     revocando ejecución de `set_property_ai_moderation` a todos los roles.
  4. P1 - Integridad de subida de fotos: `uploadPublicationImages.ts` garantiza
     atomicidad (reversión en fallos parciales, sin guardado trunco de anuncios y
     preservación del borrador).
  5. P2 - Autoguardado integral: `usePublicationDraft.ts` y almacenamiento offline
     con persistencia de fotos, paso y campos en tiempo real.
  6. P2 - Privacidad de dirección: `propertyLocation.ts`, migración
     `20260911060000_private_property_addresses.sql` y censura de dirección exacta
     en `DetailPage.tsx`.
- Verificación del arnés:
  - `npm run lint`: 0 errores, 0 advertencias (303 archivos).
  - `npm run test:run`: 107 archivos, 441 pruebas pasando sin errores.
  - `npm run build`: compilación de TypeScript limpia, Vite bundle completado (PWA
    43 entradas / 1045.79 KiB), verificadores de aislamiento Fase 2 aprobados y
    sitemap de 473 URLs generado.
- Migraciones: registradas 55, 56 y 57 en `web/supabase/DATABASE_MIGRATIONS.md`.
- Pendiente exacto: aplicación supervisada de las migraciones 55, 56 y 57 en el
  entorno remoto de Supabase y despliegue del Worker con la nueva PWA.
## Despliegue de privacidad geográfica y acción Publicar — 2026-09-13

- **Producción:** Worker `6ed8a4ce-5407-4c07-b12b-4e7d492db70a`.
- **Supabase:** migraciones 55 a 59 sincronizadas. `supabase db lint --linked
  --level warning` terminó sin errores ni advertencias.
- **QA pública:** 301 publicaciones con coordenadas comprobadas; cero puntos
  fuera de la cuadrícula pública de `0.02` grados. La tabla
  `property_private_coordinates` rechaza al rol anónimo con HTTP 401.
- **QA web:** portada, resultados y ficha real respondieron correctamente; la
  navegación muestra `Publicar` y el mapa de detalle indica que la ubicación
  es aproximada y no representa la dirección exacta.
- **Pendiente de datos:** la publicación QA abierta para Cárdenas conserva un
  punto heredado cercano a La Habana. No constituye exposición de ubicación
  exacta, pero requiere auditar la coherencia zona/coordenadas del inventario.

## Navegación directa a permutas — 2026-09-13

- **Producción:** Worker `7a3c33e1-52b8-4344-bf20-a6121ac317ea`.
- **Cambio:** el tercer enlace del encabezado es `Permutar`; `Publicar gratis`
  continúa como acción independiente. El menú móvil incorpora la misma
  operación bajo `Explorar inmuebles`.
- **Calidad:** lint limpio, 108 archivos/451 pruebas y build PWA correcto.
- **QA productiva:** `Permutar` abrió
  `/resultados?operacion=permuta`, activó el filtro `Permuta` y cargó 68
  propiedades.

## Preferencias estructuradas de permuta — 2026-09-13

- **Producción:** Worker `9d998877-add2-4876-be30-35641127c7c4`.
- **Cambio:** el paso comercial de `Permuta` captura tipo buscado, provincia,
  municipio, dormitorios y área mínimos, notas y diferencia monetaria. El valor
  estimado de la propiedad ofrecida es opcional.
- **Datos:** se persiste en `features.exchangePreferences`; no requiere
  migración. Edición y borradores completos hidratan la misma estructura.
- **Lectura:** ficha pública y moderación muestran `Busca a cambio` mediante un
  parser defensivo que omite JSON antiguo o malformado sin romper la página.
- **Calidad:** lint limpio, 109 archivos/457 pruebas y build/PWA correcto con
  verificadores de aislamiento y sitemap de 444 URLs.
- **Corrección posterior al QA:** los selectores del tipo buscado y de la
  diferencia monetaria muestran el valor seleccionado (`Casa`, `Negociable`,
  etc.) en lugar del placeholder o un texto vacío. La regresión quedó cubierta
  en `PublishPage.integrity.test.tsx` antes del despliegue final.
- **QA productiva:** se comprobó la carga del Worker nuevo y del formulario
  autenticado en `/publicar?qa=permuta-20260913`. La sección del paso 7 quedó
  cubierta por pruebas de componente; falta una publicación física completa en
  móvil con fotos de prueba para cerrar QA manual de persistencia remota.

## Recuperación de moderación IA Groq — 2026-09-13

- **Producción:** Worker `6ac6d562-e8f4-454c-8b77-0143c4ed3064`.
- **Causa:** Groq retiró `meta-llama/llama-4-scout-17b-16e-instruct` el
  2026-07-17; las solicitudes devolvían HTTP 404 y quedaban en revisión manual.
- **Cambio:** el modelo multimodal se configura con `GROQ_MODEL` y producción
  usa `qwen/qwen3.6-27b`. Los errores del proveedor se registran de forma segura,
  pero la nota visible solo indica que corresponde revisión manual.
- **Compatibilidad Qwen:** la solicitud usa un único mensaje `user`,
  `max_completion_tokens`, JSON Object Mode y `reasoning_effort: none`, siguiendo
  el contrato vigente de visión de Groq.
- **Calidad:** lint limpio, 109 archivos/458 pruebas y build/PWA correcto con
  verificadores de aislamiento y sitemap de 444 URLs.
- **Operación:** los anuncios que fallaron antes del despliegue conservan su
  resultado anterior hasta ejecutar `Reevaluar con IA`; las publicaciones nuevas
  ya usan el modelo configurado.

## Aislamiento DEV/producción tras el copy legal — 2026-09-28

- **DEV:** el asset servido respondió `200`, contiene `El portal inmobiliario
  para Cuba` y no contiene la afirmación anterior.
- **Producción:** la portada respondió `200` y no contiene el nuevo claim; no se
  desplegó ni modificó producción en este trabajo.
- **Conclusión:** el cambio de copy quedó aislado al Worker DEV; la diferencia
  entre pestaña limpia y cacheada del Service Worker no altera la evidencia HTTP.

- **Revalidación local posterior:** `npm run lint` limpio; `npm run test:run`
  aprobó 115 archivos y 489 pruebas; `npm run build` aprobó los verificadores
  de aislamiento de producción y Worker y generó 446 URLs del sitemap.

## Migración de moderación IA a Qwen 3.8 — 2026-09-20

- **Causa comprobada:** producción registró HTTP 404 al invocar
  `qwen/qwen3.6-27b`, retirado por Groq el 2026-09-14.
- **Cambio:** `GROQ_MODEL` y el valor por defecto del Worker pasan a
  `qwen/qwen3.8-27b`, reemplazo multimodal oficial.
- **Compatibilidad:** el Worker limita cada solicitud a tres imágenes, máximo
  documentado para Qwen 3.8 27B.
- **Pendiente operativo:** desplegar y ejecutar una reevaluación IA autorizada
  para verificar el resultado real en producción.

## Actualización automática tras reevaluación IA — 2026-09-13

- El panel de moderación consulta únicamente la publicación reevaluada mientras
  el Worker procesa la tarea asíncrona.
- Al cambiar el estado o el mensaje de moderación, la tarjeta y los contadores se
  actualizan sin recargar la página completa.
- La espera está acotada a 30 segundos y muestra un aviso recuperable si expira.
- **Producción:** Worker 14a5dd39-9f47-4077-bed4-ef916c2bd24b.

## Integración y revalidación de Fase 1 — 2026-09-14

- **Git:** PR `#108` fusionado; `main` y `origin/main` quedaron en `73a3c8d`.
- **Calidad:** lint limpio, 111 archivos/460 pruebas y build PWA correcto con
  verificadores de aislamiento y sitemap de 444 URLs.
- **Backend:** migraciones locales/remotas sincronizadas hasta la 59 y
  `supabase db lint --linked --level warning` sin hallazgos.
- **Privacidad pública:** 304 ubicaciones publicadas revisadas sin patrones de
  calle o número; las tablas privadas de dirección y coordenadas no aparecen
  para el rol anónimo (HTTP 404).
- **Pendiente:** QA física Push Android/iOS y cambio de cuentas, fallo/reintento
  real de fotos, restauración manual de borrador, moderación AAL2 sin recarga,
  inventario aprobado y revisión jurídica.

## Habilitación reversible de UI KYC en Worker DEV — 2026-09-26

- **Causa:** el Worker remoto `cubitat1-phase2-dev` servía un build Vite donde
  `import.meta.env.DEV` era falso; por eso la UI KYC no aparecía aunque el
  módulo y el esquema DEV existieran.
- **Cambio:** `AccountPage` usa la bandera de build explícita del modo
  `phase2-dev`. `npm run build:phase2-dev` habilita KYC y verifica sus marcadores.
- **Aislamiento:** `npm run build` sigue usando el verificador de producción y
  mantiene fuera KYC; no se modifica `wrangler.jsonc` ni el Supabase productivo.
- **Siguiente evidencia:** desplegar únicamente con
  `wrangler deploy --config wrangler.phase2-dev.jsonc` y comprobar KYC en
  `/mi-cuenta` con una cuenta DEV antes de subir documentación de prueba.

## Corrección de detección PWA específica de Cubitat — 2026-09-28

- `hasInstalledRelatedWebApp` ya no considera instalada cualquier PWA del
  dispositivo; exige que el `id` o `url` pertenezca a Cubitat en producción o
  DEV. Se añadió una regresión para una PWA ajena.
- Gate: lint limpio, 115 archivos/491 pruebas y builds de producción/DEV
  correctos. Se desplegó únicamente DEV como versión
  `50e55bb3-74be-4fae-8754-f5319336ef54`.
- `manifest.webmanifest` remoto respondió `200` y su `related_applications`
  apunta al origen DEV. Producción permaneció sin cambios.

## Verificación documental de propiedad en DEV — 2026-09-27

- Se añadió el módulo reversible de solicitud del propietario y la pestaña
  administrativa separada para revisar documentos privados.
- La migración DEV `20260810000000_property_verification_and_trust_score.sql`
  fue aplicada al proyecto Supabase DEV y verificada sin crear fixtures.
- El lint remoto DEV detectó una referencia ambigua en el RPC de Trust Score;
  se corrigió calificando los factores y la segunda ejecución terminó sin
  errores de esquema.
- Las políticas de Storage del bucket documental también validan que la
  segunda carpeta sea la propiedad real del usuario; no basta con el `user_id`.
- Gates: lint correcto, 118 archivos/499 pruebas, build productivo aislado y
  build `phase2-dev` correcto con el chunk `PropertyVerificationModerationTab`.
- Worker DEV desplegado como versión `42afda30-2b43-4ab5-b5f3-9d50581c9557` en
  `https://cubitat1-phase2-dev.pochiprats18.workers.dev`.
- La pestaña muestra el indicador interno y sus cuatro factores cuando están
  disponibles, sin bloquear la revisión si el RPC falla.
- Producción no modificada. Pendiente QA E2E persistente con una cuenta DEV y
  documento de prueba controlado.

### Cobertura adicional de verificación documental — 2026-09-27

- El repositorio administrativo conserva la revisión si falla la firma del
  documento privado o el RPC del indicador interno.
- Las regresiones cubren respuestas de Trust Score como objeto y fallos de
  Storage; la prueba focalizada pasó 5/5.
- La pestaña administrativa quedó cubierta directamente para renderizar el
  indicador interno, conservar el rechazo y bloquear solo la aprobación cuando
  falta el documento firmado.
- El hook de moderación documental cubre aprobar, conservar la solicitud ante
  error remoto y exigir motivo antes de rechazar.
- El diálogo de rechazo cubre motivo obligatorio, cancelación, confirmación y
  bloqueo durante procesamiento.
- Suite completa posterior: 122 archivos/514 pruebas, lint y build normal
  correctos; el aislamiento productivo y el sitemap real de 446 URLs pasaron.
- El bloque solo amplía pruebas; no cambió esquema, runtime ni producción.

## Notificaciones: cierre del comportamiento de lectura — 2026-09-27

- Se añadió `web/src/modules/auth/hooks/useNotifications.test.tsx` para cubrir
  carga de no leídas, desaparición optimista al marcar una notificación y
  restauración cuando falla la persistencia.
- Gates: lint correcto, 119 archivos/502 pruebas correctas, build productivo y
  build `phase2-dev` correctos; el sitemap DEV generó 446 URLs.
- Se añadió una prueba del despachador que confirma que un `503` temporal del
  proveedor devuelve la entrega a `pending` para el siguiente intento; la
  suite completa queda en 119 archivos/503 pruebas.
- Worker DEV desplegado como versión
  `d87af246-bb75-4b62-ac45-7f095ab56b40`; la URL raíz respondió HTTP 200.
- La cuenta autenticada DEV abierta en Chrome muestra el estado activo de
  notificaciones y la acción de desactivación; la entrega física en segundo
  plano y el toque desde un dispositivo cerrado siguen pendientes.
- La bandeja cierra el menú al marcar avisos sin destino válido, además de
  navegar y marcar como leídos los avisos con destino interno. La regresión
  queda cubierta por `UserMenu.test.tsx`; el ciclo completo posterior pasó con
  119 archivos y 504 pruebas.
- La corrección quedó desplegada únicamente en `cubitat1-phase2-dev` como
  versión `a00f6d86-e8a8-4cab-bfe5-0dbde30daadf`. Las rutas `/`, `/mi-cuenta`,
  `manifest.webmanifest` y `sw.js` respondieron HTTP 200; el manifest conserva
  `related_applications` apuntando al origen DEV.
- Producción no modificada. El comportamiento permanece aislado en el módulo
  de notificaciones y no altera la lógica de publicación o moderación.

## Revalidación remota Supabase DEV — 2026-09-27

- `supabase migration list --linked` confirmó coincidencia entre migraciones
  locales y remotas registradas.
- `supabase db lint --linked --level warning` respondió `No schema errors found`.
- No hubo escrituras de datos ni cambios en el proyecto productivo.

### Reintento de lint remoto — 2026-09-27

- Las migraciones locales y remotas continuaron alineadas.
- El primer `db lint` falló antes del análisis por `LegacyDbConnectError`; el
  reintento terminó con `No schema errors found`.
- No hubo escrituras, cambios de roles ni acciones sobre producción.

## Gates CI — 2026-09-27

- Se añadió `.github/workflows/phase2-quality.yml` con lint, pruebas, build
  productivo aislado y build DEV en pushes, PRs y ejecución manual.
- El modo `SITEMAP_MODE=static` se limita a CI para que estos gates no dependan
  de secretos ni escriban en Supabase; el flujo local/DEV continúa usando el
  inventario publicado real.
- Revalidación local: lint correcto, 119 archivos/503 pruebas y ambos builds
  correctos con el modo estático.
- Revalidación adicional del build normal: aislamiento productivo correcto y
  sitemap real regenerado con 446 URLs. No usar `SITEMAP_MODE=static` para
  generar el sitemap de un despliegue real.

## Superficie HTTP DEV — 2026-09-27

- Las rutas `/`, `/mi-cuenta` y `/moderar` respondieron HTTP 200.
- El manifest y el service worker DEV respondieron HTTP 200; el manifest usa
  el origen DEV en `related_applications`.

## Checklist QA física Push — 2026-09-27

- Se creó `docs/FASE2_PUSH_QA_FISICA.md` con pasos reproducibles para Android
  Chrome y iOS Safari/PWA, criterios de navegación, lectura, aislamiento y
  evidencia requerida.
- El documento no contiene secretos ni requiere usar service role desde el
  navegador. El resultado físico sigue pendiente hasta ejecutar la matriz en
  dispositivos reales.

## Panel de agentes: cobertura del hook — 2026-09-27

- Se añadió `web/src/modules/agents/hooks/useAgentDashboard.test.tsx`.
- La prueba cubre carga de agente verificado, métricas derivadas, actualización
  local tras ocultar una publicación, conservación del estado ante error remoto
  y error seguro durante la carga.
- Suite completa: 123 archivos y 518 pruebas; lint correcto.
- Build productivo correcto con verificadores de aislamiento y sitemap real de
  446 URLs.
- No hubo cambios de esquema, runtime, datos remotos ni producción. El QA
  físico autenticado del panel de agente continúa pendiente.

## Errores administrativos sin filtración de detalles — 2026-09-27

- `web/src/modules/admin/core/errors.ts` ya no expone mensajes crudos de
  backend; los paneles administrativos usan únicamente sus fallbacks seguros.
- Se añadieron regresiones para errores de tipo `Error` y objetos desconocidos.
- Revalidación: 125 archivos y 523 pruebas, lint y build correctos; los
  verificadores de aislamiento productivo y el sitemap real de 446 URLs pasaron.
- No hubo cambios de esquema, runtime remoto, datos ni producción.

## Flujo KYC: cobertura del hook — 2026-09-27

- Se añadió `web/src/modules/kyc/hooks/useKycSubmission.test.tsx`.
- La cobertura comprueba validación de archivos, compensación del documento si
  falla la subida de selfie y callbacks de finalización tras una solicitud
  exitosa.
- Suite completa: 126 archivos y 527 pruebas; lint y build correctos, con
  aislamiento productivo y sitemap real de 446 URLs.
- No hubo cambios remotos ni despliegue; el E2E persistente con una cuenta DEV
  sigue pendiente.

## Alertas de búsqueda: cobertura del hook — 2026-09-27

- Se añadió `web/src/modules/search/hooks/useSearchAlerts.test.tsx`.
- La cobertura comprueba carga, error seguro, creación autenticada, rechazo sin
  sesión y eliminación local.
- Suite completa: 127 archivos y 532 pruebas; lint y build correctos, con
  aislamiento productivo y sitemap real de 446 URLs.
- No hubo escrituras remotas ni despliegue. La entrega física de Push/correo
  continúa pendiente de dispositivos y proveedores reales.

## Robustez de alertas de búsqueda — 2026-09-27

- `useSearchAlerts` limpia siempre `loading`/`creating` si Supabase lanza una
  excepción y limpia el estado cuando no existe usuario autenticado.
- Se añadieron regresiones para excepciones de carga y creación.
- Revalidación: 127 archivos y 534 pruebas, lint y build correctos; aislamiento
  productivo y sitemap real de 446 URLs verificados.

## Despliegue DEV de alertas robustas — 2026-09-27

- Build `phase2-dev` y dry-run de Wrangler correctos.
- Se desplegó únicamente `cubitat1-phase2-dev` como versión
  `9d6d3097-fe9c-49d2-b8cf-961e33f8e244`.
- `/`, `/mi-cuenta`, `/manifest.webmanifest` y `/sw.js` devolvieron HTTP 200;
  el manifest conserva `start_url=/` y el origen DEV relacionado.
- Producción no fue modificada.

## Contacto público: cobertura aislada — 2026-09-27

- Se añadió `web/src/worker/public-submissions.test.ts` con seis casos para
  payload inválido, Turnstile inválido/no disponible, normalización telefónica,
  fallo del RPC y reporte público.
- La suite completa quedó en 127 archivos y 535 pruebas; lint y build correctos,
  con aislamiento productivo y sitemap real de 446 URLs.
- No hubo cambios de runtime ni nuevo despliegue; producción sigue intacta.

## MFA: cobertura del servicio — 2026-09-27

- `web/src/modules/auth/mfa/mfaService.test.ts` cubre ocho escenarios del
  servicio MFA: AAL/factores, fail-closed, limpieza de enrollment pendiente,
  clasificación de errores y bloqueo seguro ante fallos.
- Revalidación completa posterior: 132 archivos y 562 pruebas, lint y build correctos;
  aislamiento del bundle productivo y sitemap real de 446 URLs verificados.
- Sin escrituras remotas ni despliegue adicional. Pendiente: E2E persistente
  de MFA con una cuenta DEV y validación física de dispositivo.
## Revalidación remota DEV — 2026-09-27

- `/`, `/mi-cuenta`, `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200
  desde `cubitat1-phase2-dev`.
- El manifest conserva `start_url=/` y `related_applications` con el origen
  DEV, sin cambios sobre producción.
## Revalidación de disponibilidad de producción — 2026-09-27

- El sitio productivo, su manifest y su Service Worker respondieron HTTP 200.
- La comprobación fue de solo lectura y no altera el aislamiento de Phase 2.
## Routing de clics Push y despliegue DEV — 2026-09-27

- El routing seguro de notificaciones quedó aislado en `web/src/swRouting.ts`
  con cobertura de rutas internas, externas y UUIDs.
- Revalidación posterior: 133 archivos y 564 pruebas, lint y build correctos.
- Despliegue solo a `cubitat1-phase2-dev`, versión
  `ffba90f5-4ded-4f1d-9845-72ea02258d2e`; los endpoints públicos DEV y el
  Service Worker remoto respondieron correctamente.
- Pendiente: prueba física de recepción y clic en Android/iOS con PWA instalada.
## Eliminación de fallback Supabase incrustado — 2026-09-27

- El Worker dejó de incluir la URL y la clave `anon` antiguas como fallback;
  exige las variables Supabase del entorno.
- Validación: 133 archivos y 564 pruebas, lint y build correctos.
- DEV desplegado como `bf52157f-62d8-49d2-86d5-c0bf07cb142f`; respondió 200 y
  no expuso la referencia al proyecto antiguo. Producción quedó intacta.

## Inventario operativo de secretos DEV — 2026-09-27

- Consulta no destructiva de Wrangler, únicamente nombres: Push (`VAPID_*`),
  Resend, `CONTACT_METRICS_SALT`, `SUPABASE_SERVICE_ROLE_KEY` y
  `VITE_SUPABASE_ANON_KEY` están configurados.
- Falta `GROQ_API_KEY`; por diseño el Worker deja la publicación en
  `pending_review` para revisión manual, por lo que la moderación IA sigue
  pendiente de configuración real.
- Faltan también las credenciales de Cloudflare, Supabase Management y Google
  Analytics usadas por métricas externas. Esas ausencias son aisladas y el
  panel las reporta sin bloquear publicaciones, contactos, auth ni Push.
- No se escribieron ni rotaron secretos. Antes de cerrar estos submódulos se
  debe configurar sus valores desde el gestor de secretos y repetir la prueba
  autenticada de DEV.

## Regresión de fallback Groq — 2026-09-28

- Se cubrió explícitamente el caso sin `GROQ_API_KEY`: no se llama a Groq y la
  RPC persiste `pending_review` con proveedor nulo para revisión manual.
- Revalidación: lint correcto, 133 archivos y 565 pruebas, build productivo
  correcto, aislamiento de Fase 2 y sitemap real de 446 URLs.
- Cambio solo de pruebas; no hubo despliegue ni cambios remotos.

## Endurecimiento de recuperación de contraseña — 2026-09-28

- El flujo exige ahora credenciales reales del enlace además de la marca
  `type=recovery` o del evento de recuperación; `type=recovery` aislado ya no
  habilita una sesión de cambio de contraseña.
- La regresión está cubierta en `web/src/pages/auth/authUrlParams.test.ts`.
- Revalidación: lint correcto, 133 archivos y 565 pruebas, build productivo
  aislado correcto y sitemap real de 446 URLs. Sin despliegue ni cambios
  remotos.

## Despliegue DEV del endurecimiento de recuperación — 2026-09-28

- Build `phase2-dev` y dry-run de Wrangler correctos.
- Se desplegó solo `cubitat1-phase2-dev`, versión
  `e74048af-9c74-4f8e-926b-f195cc902c36`.
- `/`, `/recuperar-contrasena` y `/sw.js` respondieron HTTP 200; producción no
  fue modificada.

## Regresión de componente en recuperación — 2026-09-28

- `ResetPasswordPage` queda cubierto cuando existe una sesión pero falta toda
  credencial del enlace: muestra error, deshabilita guardar y no llama a
  `updateUser`.
- Revalidación final: lint correcto, 133 archivos y 566 pruebas, build
  productivo aislado correcto y sitemap real de 446 URLs.
- Solo se amplió cobertura; no hubo un segundo despliegue.

## Verificación de bundle de recuperación DEV/producción — 2026-09-28

- Los chunks DEV de `ResetPasswordPage` y `authUrlParams` respondieron HTTP 200
  y contienen la protección nueva.
- Los chunks equivalentes de producción respondieron HTTP 200 sin ese marcador,
  confirmando el aislamiento de Fase 2.

## Separación de guía de secretos DEV — 2026-09-28

- `docs/ROTACION_SECRETOS.md` separa ahora el proyecto Supabase DEV y el Worker
  DEV de las instrucciones productivas históricas.
- Las operaciones de Fase 2 quedan documentadas con
  `wrangler.phase2-dev.jsonc`; no se escribieron ni expusieron valores.

## Métricas administrativas sin credenciales — 2026-09-28

- Se añadió una regresión del endpoint `/api/metrics` para comprobar que un
  administrador AAL2 recibe estados parciales explícitos cuando faltan las
  credenciales de Cloudflare, Supabase Management y Google Analytics.
- Revalidación: lint correcto, 133 archivos y 565 pruebas correctas, build
  productivo aislado correcto y sitemap real de 446 URLs.
- No hubo despliegue ni cambios remotos; el panel mantiene esas métricas como
  pendientes sin bloquear publicación, contactos ni Push.

## Auditoría de especificación administrativa — 2026-09-28

- `web/openspec/specs/administration/spec.md` fue contrastada con módulos y
  pruebas actuales. Acceso AAL2, publicaciones, reportes, usuarios,
  KYC/retención, bitácora, métricas, moderación IA, arquitectura modular y
  contexto del anunciante tienen cobertura dedicada.
- No se encontró un requisito administrativo local huérfano. El cierre de la
  Fase 2 aún depende de secretos opcionales de proveedores y QA físico real.
## Corrección de mapa MapLibre en DEV — 2026-09-28

- MapLibre 6.11.2 ya carga el mapa base en DEV, pero el estilo remoto podía
  dejar sin pintar la fuente GeoJSON. Se añadieron señales alternativas de
  inicialización y un timeout de seguridad de 2 segundos.
- El fallback de marcadores DOM se activa solo si no hay features renderizadas,
  usa la fuente actual y se limpia al desmontar el mapa; no sustituye el
  clustering normal cuando el canvas funciona.
- Verificación visual remota: 7 marcadores de propiedades en
  `/resultados?operacion=venta`; bundle final sin atributos de diagnóstico.
- Gates completos: lint, 134 archivos/573 pruebas, build productivo aislado y
  build DEV correctos. Worker DEV desplegado como
  `1b6c96d9-bb6f-45d9-bdae-211c4595ced1`.
- Producción permanece sin despliegue. Pendientes de Fase 2 no relacionados
  con este módulo continúan abiertos.

## Actualización PWA y despliegue DEV — 2026-09-28

- `PWAInstallPrompt` vuelve a registrar el Service Worker mediante
  `vite-plugin-pwa`; `onNeedRefresh` muestra el aviso y `Actualizar` aplica la
  nueva versión con recarga.
- Regresión focalizada: 10/10; suite completa: 134 archivos y 576 pruebas.
- Lint, build productivo aislado y build DEV correctos; sitemap DEV con 446
  URLs.
- Worker DEV desplegado como `0d1170a4-5eb9-481c-a65d-1216f7c709a0`; raíz,
  cuenta, manifest y Service Worker respondieron HTTP 200.
- Pendientes externos: probar actualización entre dos versiones y recepción/
  clic Push en dispositivos físicos. Producción permanece intacta.

## Frontera de proveedores IA — 2026-09-28

- El Worker remoto usa `GROQ_API_KEY`/`qwen/qwen3.8-27b`; el inventario DEV no
  contiene ese secreto y el fallback comprobado conserva `pending_review`.
- La ruta local de Vite usa `GEMINI_API_KEY` de forma independiente; no debe
  usarse como evidencia de que la moderación IA del Worker está activa.
- Pendiente operativo: configurar `GROQ_API_KEY` en DEV y ejecutar una prueba
  autenticada controlada. No se expusieron ni modificaron valores.
- `wrangler check startup --config wrangler.phase2-dev.jsonc` completó el perfil
  local con una ventana de 30,6 ms; el arranque no es el bloqueo actual.

## Revalidación de esquema DEV — 2026-09-28

- `supabase db lint --linked --level warning`: `No schema errors found`.
- `supabase db push --linked --dry-run`: `Remote database is up to date`; no
  hubo escrituras ni migraciones aplicadas.
- El CLI advirtió que faltan en el entorno local `SUPABASE_AUTH_CAPTCHA_SECRET`,
  `RESEND_API_KEY` y `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`; quedan como
  configuración operativa pendiente para DEV.
- `supabase migration list --linked` quedó sin salida después de iniciar el rol
  de login y se canceló; no se usa como evidencia, a diferencia del dry-run.

## Error seguro de OAuth Google — 2026-09-28

- El modal traduce los errores de proveedor OAuth ausente a un mensaje seguro y
  ofrece correo/contraseña como alternativa; no expone `Unsupported provider`.
- Regresión focalizada 5/5; suite completa 134/577, lint y builds correctos.
- DEV desplegado como `1580c8c4-9826-443a-9dd6-5ddd772d4ea9`; rutas públicas,
  manifest y `sw.js` respondieron 200 y el asset remoto verificó el texto nuevo.
- Producción intacta. El secreto OAuth real sigue pendiente de configuración.

## Mensajes seguros de CAPTCHA y correo — 2026-09-28

- `LoginModal` centraliza la traducción de errores de Supabase para OAuth,
  CAPTCHA/Turnstile, credenciales, confirmación y límites de correo; los
  detalles técnicos de proveedor ya no se muestran al usuario.
- `/api/auth/resend-confirmation` ahora devuelve indisponibilidad controlada
  si falta `RESEND_API_KEY`, la configuración pública de Supabase o falla el
  proveedor de correo, en lugar de afirmar éxito sin envío.
- Regresión focalizada 6/6; suite completa 134/578; lint, build productivo
  aislado y build Phase 2 DEV correctos.
- El helper quedó en módulo separado para conservar Fast Refresh limpio.
- DEV desplegado como `d4e3347a-a61e-4032-b420-256382a1e496`; raíz, cuenta,
  manifest y `sw.js` respondieron 200. El asset remoto conserva el mensaje
  seguro y omite `missing OAuth secret`.
- Producción permanece intacta. Pendiente operativo: configurar y probar los
  secretos reales de Turnstile, correo y OAuth en DEV, sin copiar valores al
  repositorio ni a la documentación.

## Cierre incremental de calidad y despliegue DEV — 2026-09-28

- Se eliminaron límites `any` en el manejo de errores de `LoginModal` y
  `useSavedProperties`; las lecturas de mensajes y códigos ahora validan
  `unknown` sin cambiar los contratos de autenticación o favoritos.
- Se añadió `web/src/modules/properties/exchangePreferences.test.ts` para
  cubrir construcción, validación, hidratación y compatibilidad con datos
  antiguos de preferencias estructuradas de permuta.
- Evidencia actual: 135 archivos y 592 pruebas, lint, build productivo y
  `build:phase2-dev` correctos.
- DEV desplegado como `0d11e5e1-cc70-4088-ad6a-856f9d3d4d41`; `/`,
  `/mi-cuenta`, `/moderar`, `manifest.webmanifest` y `sw.js` respondieron 200.
  Producción continúa intacta.

## Revalidación posterior del árbol actual — 2026-09-28

- Los gates se repitieron sin cambios de código posteriores al despliegue:
  lint correcto, 135 archivos/592 pruebas correctas, build productivo aislado y
  build Phase 2 DEV correctos.
- El build DEV volvió a producir el sitemap del origen DEV con 446 URLs y
  confirmó el módulo KYC en el bundle.
- Las rutas remotas `/`, `/mi-cuenta`, `/moderar`, `/manifest.webmanifest` y
  `/sw.js` respondieron HTTP 200 mediante comprobación de solo lectura.

## Revalidación remota del esquema DEV — 2026-09-28

- `supabase migration list` confirmó que las migraciones locales y remotas
  coinciden hasta `20260916010000`; no hay deriva ni pendientes.
- `supabase db lint --linked --level warning` devolvió `No schema errors found`
  para `extensions` y `public`.
- No se aplicaron migraciones ni se modificó producción.

## Limpieza de pruebas PWA — 2026-09-28

- `PWAInstallPrompt.test.tsx` usa `act` para las acciones asíncronas de
  instalación y "Quizás luego"; la prueba focalizada pasa 10/10 sin los
  avisos React observados anteriormente.
- Suite completa: 135/592; lint y builds productivo/DEV correctos.
- El cambio es exclusivo de pruebas, por lo que no requirió desplegar una
  nueva versión del Worker.

## Cancelación segura del compartir — 2026-09-28

- `DetailPage` endurece el `catch` de `navigator.share()` con `unknown` y
  reconoce `AbortError` sin depender de propiedades no tipadas.
- Prueba focalizada: 15/15; suite completa: 135/592; lint y builds
  productivo/DEV correctos.
- DEV desplegado como `02d589ac-1c10-4369-9b0d-ba461260ab42`; las rutas base,
  cuenta, moderación, manifest y service worker respondieron 200. Producción
  continúa intacta.

## Callback OAuth con errores tipados — 2026-09-28

- `AuthCallbackPage` usa `unknown` en el límite de errores y mantiene los
  mensajes seguros para enlaces PKCE, expirados o inválidos.
- Prueba focalizada: 5/5; suite completa: 135/592; lint y builds
  productivo/DEV correctos.
- DEV desplegado como `bbaed447-5590-49c6-9f0e-ac4a21ba7af1`; `/auth/callback`
  y las rutas principales respondieron 200. Producción continúa intacta.

## Rate limiter con almacenamiento tipado — 2026-09-28

- El Durable Object `RateLimiter` valida la forma de los registros recuperados
  y abre una ventana nueva ante datos corruptos, evitando confiar en estados
  inválidos.
- Se añadió regresión para el caso `NaN`; suite completa: 135/593, lint y
  builds productivo/DEV correctos.
- DEV desplegado como `e534c947-45fe-4126-82b2-d9d1efd931f2`; las rutas
  principales, callback, manifest y service worker respondieron 200. Producción
  continúa intacta.

## API Turnstile tipada — 2026-09-28

- `TurnstileWidget` define el contrato local de `window.turnstile` y elimina
  los accesos `window as any`; se conservan los callbacks y la limpieza del
  widget.
- Prueba focalizada: 2/2; suite validada con 135/593, lint y builds
  productivo/DEV correctos.
- El cambio solo afecta tipado y no requirió desplegar otra versión; DEV sigue
  en `e534c947-45fe-4126-82b2-d9d1efd931f2`. Producción continúa intacta.

## CubitatApp con límites de datos seguros — 2026-09-28

- La lectura de `profiles.role` valida la forma del dato antes de actualizar
  el estado; la carga SWR de propiedades usa `unknown` en el límite de errores.
- Prueba focalizada: 4/4; suite completa: 135/593; lint y builds
  productivo/DEV correctos.
- DEV desplegado como `364df13f-f3c9-45c8-ada8-0bd345b802cf`; rutas base,
  callback, cuenta, moderación, manifest y service worker respondieron 200.
  Producción continúa intacta.
## Endurecimiento de tipos y despliegue DEV — 2026-09-28

- `CubitatApp` filtra las operaciones de la URL contra `OPERATION_VALUES` y el
  formulario de publicación restringe las claves de amenidades al modelo,
  eliminando dos accesos `any` del flujo de usuario.
- `npm run lint`, `npm run build` y `npm run build:phase2-dev` pasaron; el
  verificador DEV confirmó KYC y sitemap con 446 URLs.
- Se desplegó solo `cubitat1-phase2-dev`, versión
  `e393db88-cda4-4986-94c6-c2e36e4af6d8`; las rutas base, callback, cuenta,
  moderación, manifest y Service Worker respondieron HTTP 200.
- Producción permanece intacta. Los avisos conocidos del runner (`happy-dom`,
  `act(...)` y proveedores simulados) siguen como deuda no bloqueante.

## Tipado del retorno al listado y despliegue DEV — 2026-09-28

- `DetailPage` usa `OperationType[]` al reconstruir el filtro desde el
  breadcrumb de operación; se eliminó un cast `any` en ese flujo.
- Lint, las 15 pruebas focalizadas de detalle y los builds productivo/DEV
  pasaron. El verificador DEV confirmó KYC y sitemap con 446 URLs.
- DEV quedó en `dfd07087-881f-43b5-a5ab-f2a0c50c5b75`; las rutas principales,
  manifest y Service Worker respondieron HTTP 200. Producción no fue tocada.

## Validación segura de SEO dinámico y despliegue DEV — 2026-09-28

- El Worker valida como `unknown` la respuesta de Supabase usada para
  metadatos de una propiedad; los valores inválidos ya no atraviesan el
  renderizador SEO.
- Lint, 51 pruebas focalizadas del Worker y los builds productivo/DEV pasaron.
- DEV quedó en `783d47fc-e2f2-4e28-a478-aedea68f0ba1`; una propiedad DEV real
  respondió `200` y produjo `title`/`og:title` dinámicos. Producción continúa
  intacta.

## Regresión de respuesta SEO malformada — 2026-09-28

- `worker.test.ts` cubre filas JSON que no son objetos en la consulta SEO; el
  Worker responde de forma segura sin leer datos inválidos.
- Pruebas focalizadas del Worker: 52/52. Solo se amplió cobertura; no hubo
  nuevo despliegue ni cambios en producción.

## Frontera DEV para verificación documental — 2026-09-28

- Se corrigió la importación estática de `PropertyVerificationPanel` en
  `MyPropertiesPage`; ahora solo se carga en DEV o con `VITE_PHASE2_UI_ENABLED`.
- El verificador productivo cubre también `property_verification_requests` y
  `get_property_trust_score`, además de los chunks exclusivos de Fase 2.
- Suite completa: 135 archivos y 594 pruebas; lint y ambos builds correctos.
- DEV desplegado como `c451aa01-9194-4bf1-9bbb-b5336f6117c9`; rutas principales
  verificadas con HTTP 200. Producción no fue tocada.

## Revalidación de esquema DEV — 2026-09-28

- Migraciones locales y remotas alineadas hasta `20260916010000`.
- `supabase db lint --linked --level warning`: `No schema errors found`.
- Sin escrituras nuevas de esquema y sin cambios en producción.

## Secretos pendientes de proveedor — 2026-09-28

- El inventario nominal de secretos DEV contiene Resend, Supabase service role
  y VAPID, pero no `GROQ_API_KEY`.
- No se copiaron valores sensibles. La prueba remota de moderación IA queda
  pendiente y el fallback actual es revisión manual.

## Resultado E2E local — 2026-09-28

- El flujo de publicación local pasó.
- Los escenarios dependientes de backend quedaron bloqueados por la ausencia
  de Supabase local en `127.0.0.1:54321`; no deben confundirse con regresiones
  de frontend. La prueba externa de red reportó `EACCES`.
- `docker ps` confirmó que `docker_engine` no está disponible; reanudar este
  carril cuando Docker/Supabase local pueda iniciarse.

## E2E remoto configurable — 2026-09-28

- `playwright.config.ts` acepta `CUBITAT_E2E_BASE_URL`; sin la variable usa el
  servidor Vite local, y con ella no inicia `webServer` local.
- `search.spec.ts` ya verifica el flujo vigente de ubicación estructurada y la
  ruta SEO canónica; DEV remoto pasó 1/1 en modo solo lectura.
- No hubo despliegue adicional: fueron cambios de pruebas y configuración.

## E2E remoto de seguridad — 2026-09-28

- Turnstile/contacto/reporte/autenticación: 1/1 pasada contra DEV.
- Proxy, anon key, moderación y métricas: 4/4 pasadas contra DEV.
- `security.spec.ts` permite configurar tanto la base URL como el proyecto
  Supabase del escenario; no se hacen escrituras.
- Lint, 135/594 y ambos builds permanecen correctos; producción intacta.

## E2E remoto de publicación — 2026-09-28

- `publish.spec.ts`: **1/1** contra DEV remoto, con sesión simulada y borrador
  local; no hubo escritura persistente de una propiedad.
- No sustituye las pruebas reales de cuenta, correo, Push o dispositivos.

## Corrección del borrador y auditoría React — 2026-09-28

- Se corrigió `web/src/pages/publish/usePublicationDraft.ts` para actualizar
  refs en efectos comprometidos y evitar mutaciones durante render.
- Prueba focalizada 3/3; suite completa 135/594; lint y builds productivo/DEV
  correctos.
- React Doctor quedó en 179 incidencias, sin el hallazgo de mutación de refs.
  Los avisos de escritura de autorización y RLS siguen en revisión contextual;
  no cambiar migraciones sin confirmar el estado activo en DEV.
- No hubo despliegue: producción continúa intacta.
- El cambio se desplegó después únicamente en `cubitat1-phase2-dev` como
  `779aad98-9f56-4900-b690-9ca21ec303f1`; las rutas base, cuenta, publicación,
  manifest y Service Worker respondieron HTTP 200. Producción continúa intacta.
- El E2E remoto del asistente de publicación pasó 1/1 después del despliegue;
  solo verificó sesión simulada y borrador local.
- La revalidación agrupada de búsqueda, seguridad, Turnstile y publicación
  pasó 7/7 contra DEV sin escrituras persistentes.
- La auditoría de navegación pública pasó 1/1 contra DEV; el segmento
  autenticado sigue condicionado a credenciales E2E explícitas.

## Accesibilidad del aviso administrativo — 2026-09-28

- Se añadieron referencias accesibles al título y mensaje de
  `AdminNoticeDialog`, con prueba focalizada 1/1.
- Suite completa 136/596; DEV desplegado como
  `a57e1d1c-1c1f-47b0-9423-1b4eedf7640f`; producción intacta.
- La revalidación del CLI Supabase quedó pendiente por `EPERM` al actualizar
  su telemetría local; no se modificaron Docker, el enlace ni el esquema.
- Auditoría posterior: React Doctor quedó en 177 incidencias; desapareció el
  aviso de nombre accesible de `AdminNoticeDialog`.

## Robustez del envío KYC — 2026-09-28

- `useKycSubmission` libera `loading` en `finally`, conserva el mensaje de
  compresión y limpia archivos remotos si una etapa posterior falla.
- Focalizadas 13/13; suite 136/597; lint, build productivo y build DEV
  correctos.
- DEV desplegado como `2ef50ca4-e1b5-4562-9623-26a17a8344c5`; rutas base,
  cuenta, moderación, manifest y Service Worker respondieron HTTP 200.
- React Doctor posterior quedó en 176 incidencias y ya no marca el estado de
  carga KYC fuera de `finally`.
- Producción continúa intacta.

## Accesibilidad del buscador de moderación — 2026-09-28

- Se añadió una etiqueta asociada al buscador de `PropertiesTab`.
- React Doctor posterior quedó en 175 incidencias.
- DEV desplegado como `bb95caed-a36f-46f5-9819-df6dc96ae6ce`; rutas base,
  moderación, manifest y Service Worker respondieron HTTP 200.
- Producción continúa intacta.

## Auditoría pública DEV posterior — 2026-09-28

- Auditoría completa pública: 1/1 contra DEV en Chromium.
- No requiere credenciales ni crea datos; el segmento autenticado permanece
  condicionado a variables E2E explícitas.

## Robustez del endpoint de métricas — 2026-09-28

- Se añadió comprobación de estado HTTP para la respuesta GraphQL de Cloudflare
  y una regresión de upstream 503.
- Suite completa 135/595; DEV desplegado como
  `01798924-988a-43df-8a19-167ee8df626e`; E2E de seguridad 4/4.
- React Doctor quedó en 178 incidencias; se cerró el aviso de respuesta HTTP
  sin comprobar. El aviso de `createObjectURL` de KYC está cubierto por el
  cleanup existente y no se modifica sin reproducción.
- Producción continúa intacta.

## Continuación autónoma - 2026-09-28

- Se amplió la matriz SQL de seguridad para contactos, reportes y notificaciones
  sin cambiar migraciones ni introducir datos persistentes.
- Gates ejecutados después del cambio: lint, 136/597 pruebas, build productivo
  y build DEV correctos.
- Pendiente de verificación: `supabase test db --linked` requiere Docker para
  descargar `pg_prove`; el daemon `dockerDesktopLinuxEngine` no está disponible.
- Siguiente carril: reintentar la matriz cuando Docker esté disponible y luego
  continuar con proveedores externos y QA físico Push/PWA; producción sigue
  fuera de alcance.

## Accesibilidad de formularios - 2026-09-28

- Se corrigieron etiquetas asociadas del avatar de cuenta y del formulario de
  reportes.
- Gates completos: lint, 136/597 pruebas, build productivo y build DEV.
- DEV desplegado como `22c90271-477f-486f-bcb8-f09be083957f`; producción intacta.

## Continuación autónoma: PWA y proveedores DEV - 2026-09-28

- Pruebas focalizadas de `PWAInstallPrompt` y `pushService`: 24/24 correctas.
- Las rutas `/`, `/mi-cuenta`, `/moderar`, `/manifest.webmanifest` y `/sw.js`
  respondieron HTTP 200 en DEV.
- `wrangler secret list` confirmó los nombres de secretos presentes sin leer
  valores: Resend, Supabase service role, VAPID y sal de métricas.
- `GROQ_API_KEY` no está configurada; la moderación IA permanece correctamente
  en `pending_review` para revisión manual.
- Las pruebas físicas de Push/PWA en Android e iOS y las métricas externas
  siguen pendientes. Producción continúa intacta.

## Arranque del Worker DEV - 2026-09-28

- `wrangler check startup --config wrangler.phase2-dev.jsonc` completó el
  análisis con una ventana local de `23.6 ms`; no se detectó un problema de
  inicialización.
- El perfil temporal generado por Wrangler fue eliminado y no se conserva en
  el repositorio.

## Revalidación de gates - 2026-09-28

- Lint correcto; suite completa `136/597`; build productivo aislado correcto;
  build `phase2-dev` correcto con KYC y 446 URLs DEV.
- Las advertencias de Turnstile y Supabase local aparecieron durante el
  entorno de pruebas, pero no cambiaron el resultado ni tocaron bases remotas.
- Producción permanece intacta.

## Revalidación de Supabase DEV - 2026-09-28

- `supabase db lint --linked --level warning` terminó con `No schema errors
  found` en `extensions` y `public`.
- `supabase db push --linked --dry-run` confirmó `Remote database is up to
  date`; no se aplicaron migraciones ni escrituras.
- Persisten únicamente advertencias de variables externas ausentes para
  CAPTCHA, Resend y OAuth Google.

## Auditoría E2E pública DEV - 2026-09-28

- `comprehensive-audit.spec.ts` pasó `1/1` en Chromium contra DEV.
- Fue una comprobación de navegación pública, sin credenciales ni escrituras
  persistentes.

## Auditoría de dependencias - 2026-09-28

- `npm audit --audit-level=high` contra el registro oficial terminó con
  `found 0 vulnerabilities`.
- No se modificaron dependencias.

## Gate de dependencias en CI - 2026-09-28

- El workflow `phase2-quality.yml` incorpora `npm audit --audit-level=high`
  contra el registro oficial después de `npm ci`.
- Revalidación posterior: lint, 136/597 pruebas y builds productivo/DEV
  correctos. Producción permanece intacta.

## E2E público y seguridad DEV - 2026-09-28

- La suite seleccionada de navegación pública, búsqueda, Turnstile y seguridad
  se repitió con conectividad autorizada después de un primer bloqueo de red del
  entorno local.
- Resultado: **7/7 correctos** en Chromium contra
  `cubitat1-phase2-dev.pochiprats18.workers.dev`.
- Los escenarios autenticados o con escritura real no se consideran cerrados:
  necesitan cuentas QA autorizadas, proveedor externo disponible y limpieza
  comprobable.

## Estado vigente posterior a revalidación - 2026-09-28

Este bloque sustituye los conteos anteriores de este handoff para el estado
actual; se conserva el historial previo para trazabilidad.

- Gates completos: `npm run lint`, `npm run test:run` (**136 archivos / 600
  pruebas**), `npm run build` y `npm run build:phase2-dev` correctos.
- E2E público seleccionado: **6/6 correctos en DEV** y **6/6 correctos en
  producción**. No se ejecutaron credenciales QA ni mutaciones persistentes.
- DEV desplegado en la versión `97259d81-46cd-42e9-a2d0-4784390d458b`, con
  100% del tráfico activo. Producción no fue modificada.
- Supabase DEV alineado hasta `20260916010000`; `db lint` sin errores y
  `db push --linked --dry-run` indicó `Remote database is up to date`.
- Verificaciones focalizadas correctas: Push/service worker 4 archivos / 27
  pruebas; propiedad, verificación y antifraude 9 / 30; autenticación 7 / 36;
  admin/KYC/agentes 15 / 58; público/PWA 22 / 106.
- Auditoría de dependencias: `npm audit --audit-level=high` sin
  vulnerabilidades.
- Pendientes externos: `GROQ_API_KEY`; secretos de OAuth Google, CAPTCHA y
  Resend en Auth; credenciales QA y autorización para pruebas con escritura;
  Docker para ejecutar la matriz RLS; prueba física de Push en Android/iOS; y
  decisión funcional del Trust Score.
- La complejidad estructural alta de `worker.ts`, `CubitatApp` y
  `moderateBackground` queda registrada como deuda técnica separada, sin
  refactor amplio en este ciclo.

## Revalidación remota posterior - 2026-09-28

- Supabase DEV: `db lint` sin errores y `db push --linked --dry-run` indicó
  `Remote database is up to date`; no se aplicaron migraciones.
- Worker DEV: versión `97259d81-46cd-42e9-a2d0-4784390d458b` al 100% del
  tráfico.
- Continúan ausentes los secretos externos de CAPTCHA, Resend Auth y OAuth
  Google; no se leyeron ni modificaron valores.

## Arranque DEV revalidado - 2026-09-28

- `wrangler check startup` terminó correctamente para el Worker DEV.
- Bundle analizado: 87.69 KiB (20.71 KiB gzip); startup local medido: 20.6 ms.
- El perfil temporal generado por Wrangler fue eliminado tras la prueba.

## Auditoría de secretos en artefactos - 2026-09-28

- `web/dist` no contiene identificadores ni valores de prueba de secretos
  privados (`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `VAPID_PRIVATE_KEY` o
  `RESEND_API_KEY`).
- Las referencias encontradas se limitan al código del Worker, pruebas y
  scripts operativos; no se leyeron ni modificaron valores secretos.

## Guard automatizado de secretos en build - 2026-09-28

- `scripts/verify-private-secret-bundle.mjs` quedó conectado a `build` y
  `build:phase2-dev`.
- El guard revisa el artefacto completo y bloquea marcadores de secretos
  privados o valores de prueba.
- Los builds productivo y DEV pasaron el guard.

## Modularización de moderación IA - 2026-09-28

- La lógica de moderación se separó en `web/src/worker/ai-moderation.ts` y el
  Worker conserva la orquestación del endpoint.
- El carril crítico pasó 53/53 pruebas; la suite completa quedó en 136/136
  archivos y 600/600 pruebas.
- No se desplegó producción; la rama mantiene el cambio reversible.

## ADR de fronteras modulares - 2026-09-28

- Se añadió `docs/ADR-002-Fase2-fronteras-modulares.md` con las reglas de
  separación entre router, módulos de dominio, secretos y bundles DEV/producción.
- El ADR conserva los bloqueos externos como criterios explícitos de no
  promoción, no como fallos del código local.

## Verificador de Auth DEV endurecido - 2026-09-28

- El guard de configuración exige referencias por entorno para Turnstile,
  Resend SMTP y Google OAuth, sin leer valores secretos.
- Lint, 600 pruebas y los builds productivo/DEV pasaron después del cambio.

## Trust Score auditado - 2026-09-28

- El Trust Score no se muestra ni se consulta desde la UI pública; permanece
  limitado al esquema DEV mientras falta la decisión de producto.

## Aislamiento del workflow CI - 2026-09-28

- El workflow de calidad solo instala, audita, prueba y construye los bundles
  productivo y DEV.
- No ejecuta `wrangler deploy` ni `supabase db push`; producción no puede ser
  promovida por ese workflow.

## Auditoría de cierre Fase 2 DEV — 2026-10-07

- Se corrigió el lockfile en `bugfix/phase2-lockfile-sync`; instalación limpia, lint, 607 pruebas (1 omitida) y builds productivo/DEV pasaron. El build DEV usó el inventario público remoto de DEV (34 rutas); producción se construyó con sitemap estático y no se desplegó.
- Supabase DEV pasó `db lint`. No hubo escrituras. El dry-run de la cadena normal lista siete migraciones de producción; no aplicarlas como migraciones DEV. La nota de Obsidian dice que el digest diario estaba implementado, pero este checkout no contiene su código/pruebas ni la migración `20261001120000_daily_search_alert_email_digest.sql`; no aplicar SQL hasta recuperar o reimplementar y revisar el cambio.
- Wrangler confirmó los nombres `RESEND_API_KEY` y `GROQ_API_KEY` en DEV, sin leer valores. El Worker DEV no recibe una versión de aplicación posterior a 2026-09-28. DEV y producción respondieron HTTP 200.
- Pendientes externos: confirmar envío Resend, completar QA de documentos de propiedad con cuenta autenticada y Push en Safari iOS. Push Android ya tiene evidencia en Obsidian. Trust Score sigue interno por decisión documentada.
- Producción no fue modificada; no se enviaron correos ni se aplicaron SQL.
- También quedan pendientes la revisión de falsos positivos de la regla anti-duplicados con casos QA representativos y la comprobación de Turnstile con el proveedor real; las pruebas automatizadas no sustituyen esas verificaciones operativas.
- Corrección documental: la guía de despliegue estaba desactualizada. El commit `420b9ea` (`fix(production): defer alert email delivery`) retiró deliberadamente `dispatchPendingAlertEmails` del Worker productivo. Producción conserva el esquema de cola, pero solo DEV ejecuta el dispatcher Resend; no hay evidencia de entrega automática de alertas por correo en producción. La eventual reactivación requiere QA y aprobación de promoción.

## Alcance formal de cierre Fase 2 — 2026-10-08

- Baseline: `Propuesta_Cubitat_completa_cliente_actualizada.pdf` (junio 2026). Fase 2 entrega panel maestro, aprobar/rechazar, KYC carnet+selfie, verificación documental de propiedad, vendedor verificado, Trust Score inicial y reglas antifraude.
- KYC de identidad: QA completado; la bitácora registra aprobación local con AAL2/TOTP y limpieza (2026-07-24), envío/rechazo de evidencia sintética en DEV (2026-09-28) y confirmación del usuario (2026-10-08).
- Pendientes centrales: QA E2E persistente autenticado de documentos de propiedad (revisión AAL2, aislamiento y limpieza); revisión con casos QA de anti-duplicados y moderación real de imágenes/falsos positivos.
- El requisito “vendedor verificado” no debe confundirse con la red de agentes: el estado KYC se muestra en la cuenta del usuario, pero el indicador de resultados `isVerifiedAgent` se limita a perfiles de agente. Falta validar si la propuesta requiere un distintivo público para vendedores KYC no-agentes y cerrar ese criterio.
- Trust Score puede permanecer interno; la propuesta no requiere su exposición pública. La validación legal manual está excluida.
- Red de agentes, dashboard de captación y comisiones son Fase 3. Push y digest/correo no aparecen como entregables formales de Fase 2; no bloquear su cierre técnico por ellos.
- Evidencia DEV no equivale a producción. Cualquier promoción productiva adicional se planifica aparte y requiere decisión expresa.

## Diagnóstico publicación DEV — 2026-10-08

- Se añadió diagnóstico estructurado seguro en `logger.ts`; lint y suite completa pasaron (137 archivos, 608 pruebas aprobadas, 1 omitida). El build productivo requirió `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` para sitemap dinámico; el bundle DEV se generó con sitemap estático de dos URLs y pasó sus guards. No se desplegó producción.
- Se desplegó la versión DEV `14057cea-ac4b-44ea-b7bb-a2838e0eca46`. La pestaña conservaba HTML/bundle anterior por caché; al abrir `/publicar?verify=20261008` cargó el bundle nuevo `index-CBeCRUqf.js` y restauró el borrador ficticio.
- Se hizo un solo reintento de publicación sintética en DEV. Resultado: `PGRST002` en `PUBLISH:publish_property`, también aparece al cargar propiedades y notificaciones. Supabase CLI reportó el proyecto `bknwerqbbysveehcdmzr` como `ACTIVE_HEALTHY`; no se aplicaron migraciones ni cambios de configuración de Supabase.
- Según la guía oficial de Supabase para PGRST002, revisar en DEV **Settings > Data API > Exposed schemas**: PostgREST falla al crear la caché si algún esquema configurado ya no existe. Confirmar con los logs PostgREST antes de cambiar la lista o volver a publicar. No hacer un segundo envío hasta recuperar API.
- Revisión posterior por CLI (solo lectura): `supabase db query --linked` se ejecutó desde un workdir temporal vinculado a DEV. Existen `public` y `graphql_public`; `authenticator` no muestra un override `pgrst.db_schemas`; `supabase postgres-config get` no devolvió overrides. Esto descarta que falte uno de esos dos esquemas estándar, pero no revela la lista efectiva de Exposed Schemas del Dashboard ni el detalle de logs PostgREST. No se cambió configuración.
- El archivo descargado `C:\Users\UNAM-5G\Downloads\supabase_logs.json` contiene 100 filas PostgREST: 41 con `PGRST002` (reintento de carga de caché de esquema) y 5 con `PGRST003` (timeout al adquirir conexión del pool), entre 19:19:20 y 19:21:18 en los timestamps exportados. `PGRST003` hace más probable contención/conectividad transitoria que un payload inválido. Un snapshot posterior de `pg_stat_activity` mostró 10 conexiones cliente idle y una active; no demuestra ni excluye saturación en el momento del fallo. Falta revisar `postgres_logs` y `supavisor_logs` del mismo intervalo. El panel Unified Logs del navegador devolvía “No access token provided”; se usó el archivo exportado.
- El intento pudo subir antes una foto sintética a `property_images`; debido a la respuesta de escritura ambigua no se borró nada. Verificar fila/objeto antes de cualquier limpieza. Producción permanece intacta.
- La segunda exportación `C:\Users\UNAM-5G\Downloads\supabase_logs (1).json` trae 1,000 filas, todas de PostgREST, entre 19:07:19.383 y 19:25:56.284. Encontré 425 `PGRST002` y 39 `PGRST003`; solo entre 19:07 y 19:09 hay 58 y 4, respectivamente. A las 19:07:22, segundo del envío fallido, hay múltiples `PGRST002`. Confirma degradación sostenida del Data API alrededor de la publicación y descarta un error aislado del formulario; falta la causa interna de la caché/pool. Descargar `postgres_logs` y/o `supavisor_logs` del mismo intervalo para separar conexión, carga y schema remoto.
- El usuario compartió otra muestra (08-Oct-2026, 13:27:55–13:28:10 CDMX): `PGRST002/003`, incluyendo timeout al consultar configuración y versión PostgreSQL, y respuestas 503 a `claim_pending_push_deliveries`, `claim_pending_alert_emails` y `claim_kyc_evidence_for_purge` con service role. En el código, el cron DEV corre cada minuto (`wrangler.phase2-dev.jsonc`) y ejecuta esos tres dispatchers en paralelo (`worker-phase2-dev.ts:37-40`). Esto demuestra que el fallo afecta varias RPC del Worker, no solo publicar; el cron puede añadir solicitudes, pero no se ha probado que origine la saturación. No desactivar ni cambiarlo sin evaluar entregas de alertas/push y retención KYC. Revisar logs Postgres/Supavisor para causa raíz.
- La misma captura detalla que fallaron consultas internas de configuración, rol y versión con `PGRST003`, PostgREST intentó cargar caché usando `db-schemas=public,graphql_public` y `db-extra-search-path=public,extensions`, y anunció reconexión al DB en 32 segundos. Esto descarta la hipótesis simple de un nombre de esquema estándar faltante y confirma indisponibilidad/congestión de conexiones en PostgREST en ese intervalo; no cambiar Exposed Schemas. SQL de solo lectura a través de Management API respondió después, a las 19:33:25 UTC: 12 client sessions, 1 active, `max_connections=60`, por lo que no hay evidencia de saturación global en ese snapshot posterior. La causa temporal sigue sin aislar; faltan logs Postgres/Supavisor durante 19:26–19:29 UTC.
- Verificación posterior de UI DEV `/resultados` a las 19:35 UTC: tras 3 segundos terminó en “Error al cargar datos / Error al conectar con el servidor”; la consola registró `PGRST002` en `PROPERTIES:load_saved_properties` y `APP:load_properties_supabase`. La falla de lectura de propiedades sigue activa en DEV, aun después de que la consulta SQL directa respondiera.
- Nueva captura del usuario (13:32:54–13:37:54 CDMX): 97 eventos HTTP, 94 con 503. Fallan GET de `/properties` (8), `/profiles` (32), `/notifications` (16), `/search_alerts` (12), `/saved_properties` (8), además de las tres RPC del cron (6 cada una). En esa ventana aparecen 2 websocket Realtime 101 y 1 endpoint administrativo 200; hay un evento rutinario `checkpoint complete`. Confirma que el 503 afecta transversalmente REST/PostgREST, no solo la consulta pública de propiedades. La captura no incluye errores detallados de Postgres/Supavisor; evitar copiar identificadores de usuario que aparecen en query strings.

## Recuperación Supabase DEV y publicación QA — 2026-10-08

- El proyecto Supabase DEV bknwerqbbysveehcdmzr completó el reinicio y `supabase projects list` reportó `ACTIVE_HEALTHY`. La ruta DEV `/resultados` cargó 9 propiedades. Producción no se tocó.
- Se reintentó el borrador QA conservado. La aplicación confirmó “Publicación recibida”; el anuncio quedó persistido en Mis publicaciones como “Rechazada por IA”. El motivo confirma que descripción e imágenes identifican el inmueble como ficticio. Es el resultado esperado y no debe contarse como falso positivo ni aprobarse; no aparece en el catálogo público.
- Wrangler mostró el nombre `GROQ_API_KEY` en los secretos del Worker DEV; no se leyó su valor.
- El reinicio recuperó el servicio, pero no identifica la causa raíz de los PGRST002/PGRST003 previos. La interrupción parece resuelta en esta comprobación; mantenerla como incidente transitorio sin causa aislada.
- La primera publicación fallida había subido una imagen a Storage antes del 503. No se borraron objetos; verificar su asociación antes de cualquier limpieza.
- El QA E2E de verificación documental sigue pendiente: el único anuncio de esta cuenta es ficticio/rechazado. No se cargaron documentos ni se creó una solicitud de revisión. Se necesita una propiedad de QA apta y evidencia sintética claramente marcada para validar subida, AAL2, aislamiento y limpieza.
- Revisar aún falsos positivos anti-duplicados y moderación de una publicación/imágenes legítimas de QA. Esta prueba demuestra rechazo esperado de contenido abiertamente falso, no el comportamiento con contenido legítimo.
# Hash perceptual de imágenes para moderación DEV — 2026-10-09

- Se implementó el pHash de 64 bits en `web/src/worker/image-phash.ts`. Después
  de guardar una publicación, el cliente envía solo su ID; el Worker autentica
  al propietario, lee las URLs persistidas, valida dominio/bucket/propietario,
  MIME, tamaño y dimensiones, y calcula hashes de portada y primera imagen de
  galería.
- La migración DEV `20261009010000_property_image_phash_duplicates.sql` se
  aplicó al proyecto Supabase DEV `bknwerqbbysveehcdmzr`. RLS limita lectura a
  administrador AAL2 y las mutaciones RPC al `service_role`; las verificaciones
  de tablas, RLS y privilegios devolvieron los estados esperados.
- Un umbral conservador de distancia de Hamming `<= 8/64` crea una advertencia
  revisable en `/moderar`; nunca rechaza ni publica automáticamente. El Cron
  DEV indexa una publicación antigua por minuto y vuelve a comparar señales
  contra anuncios todavía en revisión.
- Worker DEV desplegado como `6b3f7913-fa3b-4ec5-a119-ce37f61031d9`. El
  módulo Wasm WebP se empaqueta y se instancia directamente desde el Worker.
  Comprobación HTTP posterior: portada `200`, el endpoint nuevo rechaza `GET`
  con `405` y un POST sin sesión con `401`. Producción no fue modificada.
- `npm run lint` pasó. `npm run build:phase2-dev` pasó con `SITEMAP_MODE=static`
  porque este checkout no tiene `.env`; generó 2 rutas estáticas que coinciden
  con el sitemap público DEV actual y pasó verificadores de aislamiento y
  secretos. No se ejecutó la suite de pruebas.
- Pendiente QA con dos imágenes autorizadas para confirmar que el Worker
  decodifica WebP en Cloudflare, muestra el anuncio relacionado y permite
  registrar/revisar falsos positivos. No publicar fotos privadas ni usar un
  anuncio real ajeno como fixture.

## Notificación de aprobación y criterio pHash — 2026-10-09

- DEV Supabase `bknwerqbbysveehcdmzr`: el siguiente aviso `ai_approved` usa el
  título «Revisión aprobada» y el cuerpo «Tu publicación … fue aprobada», sin
  mencionar IA ni el mecanismo de decisión. La definición remota de la función
  `notify_property_status_change()` se consultó y confirmó después de aplicar
  `dev-migrations/20261009030000_simplify_property_approval_notification.sql`.
- La migración canónica `20261009100000_simplify_property_approval_notification.sql`
  queda en espera de promoción productiva. Los avisos ya creados/entregados no
  se reescriben.
- Criterio pHash para moderación: 0 bits = hash idéntico; 1–4 = similitud alta;
  5–8 = coincidencia parcial. En todos los rangos el moderador compara imágenes
  y datos del inmueble; solo confirma si es la misma propiedad. El hash nunca
  rechaza automáticamente.
- Clasificación y prueba del panel añadidas; lint, build y suite pasaron (140
  archivos, 627 pruebas aprobadas, 1 omitida). Worker DEV desplegado como
  `758b1db1-24ed-4097-9ec1-175463a029c9`; `/` y `/moderar` respondieron 200 y
  el bundle de administración contiene las etiquetas y la guía manual.

## Estado visible de cobertura pHash en moderación — 2026-10-09

- Las tarjetas DEV muestran siempre el resultado de hash: pendiente, sin imagen
  procesable o sin coincidencias. La respuesta negativa incluye cuántas
  publicaciones con imágenes están indexadas del total activo y advierte si el
  backfill sigue incompleto; no se presenta una ausencia de flags como revisión
  total sin comprobar cobertura.
- La RPC `get_admin_property_image_hash_status(uuid[])` se aplicó a DEV y se
  verificó que `anon` no puede ejecutarla y que exige `is_admin_aal2()`.
- Causa de que no apareciera la consulta en el panel: `vite.config.ts` no
  inyectaba `VITE_SUPABASE_URL` en el build sin `.env`; el guard
  `PHASE_TWO_ENABLED` desactivaba las consultas. Los builds `phase2-dev` y
  `phase2-agents` ahora reciben el origen público Supabase DEV; producción no
  recibe el fallback DEV. `verify-phase2-dev-config.mjs` valida el aislamiento.
- Worker DEV actualizado a `cfafb374-1eef-400b-a080-37c3cdfb49ca`. La primera
  consulta desde moderación fallaba porque el proxy del Worker no permitía el
  RPC autenticado `get_admin_property_image_hash_status`; se agregó a la lista
  autenticada exclusiva de Fase 2 DEV. Lint y build DEV pasaron.
- Verificación visual autenticada en Chrome: el filtro `Publicadas (9)` carga
  las nueve fichas y muestra el estado hash en cada una. Cobertura observada:
  1 de 9 con hash; ocho indican que no se pudo comparar ninguna imagen. La
  ausencia de coincidencias sigue incompleta para el catálogo entero.
- La pestaña del navegador integrado de Codex todavía conserva un bundle viejo;
  la vista sí fue comprobada en Chrome normal. Producción no se modificó.

## Revalidación UI pHash y publicación DEV — 2026-10-09

- Se publicó exclusivamente el Worker `cubitat1-phase2-dev`, versión `f8cf4e0e-05d4-46b5-ae5b-10c58705baa1`; ningún cambio llegó a producción.
- En la sesión autenticada `/moderar`, `Publicadas (9)` carga las nueve fichas, expone el filtro `Coincidencias pHash (0)` y presenta el resultado por anuncio. La cobertura real es 1/11 publicaciones con imágenes. Las fichas sin datos comparables dicen explícitamente que no hubo imágenes para comparar; por tanto, cero coincidencias no significa catálogo limpio.
- Verificación: `npm run lint`, suite completa (140 archivos, 628 aprobadas, 1 omitida), `npm run build:phase2-dev` con `SITEMAP_MODE=static`, guards de build y `wrangler deploy --dry-run --config wrangler.phase2-dev.jsonc`; despliegue DEV confirmado y assets con las cadenas UI/RPC esperadas.
- Build normal no llegó a generar sitemap por ausencia local de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Esto no bloqueó el build/despliegue aislado DEV; no se modificó `.env` ni se hizo deploy productivo.
- Pendiente: ejecutar QA de coincidencia positiva usando las imágenes sintéticas ya autorizadas y confirmar que el moderador puede abrir la publicación relacionada. No afirmar que la detección está completa mientras el backfill quede en 1/11.

## QA pHash positivo visible — 2026-10-09 (actualización)

- Al volver a consultar `/moderar`, el backfill había progresado: el filtro mostraba `Coincidencias pHash (2)` y cobertura `3 de 11` publicaciones activas con imágenes.
- Las dos fichas QA «Casa en venta en Playa», con anunciante sintético `Prueba Cubitat DEV`, muestran hash idéntico (`0/64 bits distintos`); al abrir la ficha se puede revisar el detalle y el anuncio relacionado. No se creó una nueva propiedad durante esta comprobación: los casos QA existentes quedaron indexados por el backfill.
- Observación a investigar antes de dar por cerrado el QA integral: el texto de decisión IA indica «No se adjuntaron imágenes para su análisis», mientras que el detalle contiene una imagen y moderación presenta hash; confirmar la diferencia entre las imágenes enviadas al evaluador IA y las URLs persistidas que lee el Worker pHash.
- La vista demuestra el camino positivo de moderación. No demuestra cobertura completa ni falsos positivos validados; DEV únicamente, producción intacta.

## Comparación visual en paralelo de alertas pHash — 2026-10-09

- `ImageDuplicateComparison.tsx` renderiza cada candidata existente al lado de la publicación nueva en moderación DEV; muestra foto, estado, fecha, título, ubicación, precio, tipo/operación, área, dormitorios, baños y descripción.
- El aviso explica el resultado de Hamming y orienta la decisión: comparar; si se confirma mismo inmueble, conservar existente y ocultar la nueva con motivo; si no se confirma, no rechazar únicamente por pHash y continuar revisión manual.
- `propertiesRepository.ts` consulta campos de las fichas relacionadas bajo la sesión administrativa, además de los IDs y hashes. No hubo escrituras/migraciones Supabase.
- Lint y build `phase2-dev` con `SITEMAP_MODE=static` pasaron; se comprobó en la vista DEV que el filtro sigue mostrando dos coincidencias e incluye los paneles comparativos. Worker `cubitat1-phase2-dev` desplegado como `d4dfd0e9-a562-439b-ab4e-643b5fd83a8d`. No se ejecutaron tests. Producción intacta.

## Explicación de pHash en lenguaje sencillo — 2026-10-09

- La tarjeta de comparación explica «El sistema detectó que ambas fotos se ven prácticamente iguales» y que eso no demuestra que sea la misma vivienda.
- Se conserva el detalle técnico (`pHash`, distancia de 64 bits) en un desplegable secundario «Ver detalle técnico».
- Se verificó en la cola DEV existente: comparación Nueva/Existente, aviso claro y acciones manuales visibles. Lint y build `phase2-dev` con sitemap estático correctos. Worker `cubitat1-phase2-dev` versión `42387e88-330b-4bf2-b8ab-e79d52a07147`; no se ejecutaron tests ni se tocó producción.

## Revalidación de limpieza de documentos sintéticos — 2026-10-10

- Tras la autorización del usuario, se inspeccionó Supabase DEV sin leer ni
  descargar documentos: `property_verification_requests` contiene 0 filas y
  `property_documents` contiene 0 PDFs/objetos con contenido.
- Storage conserva 3 marcadores `.emptyFolderPlaceholder` de 0 bytes; no son
  documentos. Se preservan 8 eventos de bitácora. La base conserva sus
  anuncios; no se tocó producción.
- No se encontraron solicitudes ni PDFs pendientes que borrar durante esta
  revalidación.

## 2026-10-10 — Exploración sintética de umbral pHash

- Comparación local con WebP sintéticos: seis pares de escenas distintas dieron distancias de 12–36/64, por encima del umbral vigente (`<= 8`).
- Una misma escena con recorte centrado dio 8 bits al recortar 5 %, 10 bits al recortar 10 % y 12 bits al recortar 15 %. Los recortes más amplios no entrarían en la cola actual.
- 19 pruebas focalizadas de moderación, política y repositorio pasaron. Ningún dato fue escrito en DEV; producción y anuncios/bitácora existentes permanecen intactos.
- Alcance: medición de algoritmo con escenas sintéticas; no valida el decodificador WebP del Worker desplegado ni tasas con fotografías reales. No ajustar `<= 8` con esta muestra; pendiente una matriz QA con fotos variadas y revisión de la cobertura del backfill.

## 2026-10-10 — Prueba local con fotografías sintéticas pHash

- Tres imágenes sintéticas WebP: las escenas distintas sala/cocina dieron `30/64`; otra sala con paleta parecida dio `38/64` frente a la primera. Los tres pares evaluados quedaron fuera de `<= 8`.
- En recortes centrados, el comportamiento fue no monótono: 3 % eliminado `10/64`; 5 % y 7 % `4/64`; 10 % y 15 % `14/64`. No modificar umbral con estos pocos casos.
- La carga E2E no se completó: el navegador conectado no ofreció un mecanismo para adjuntar el archivo. El formulario quedó cerrado sin enviar. Supabase DEV siguió en 12 anuncios activos con imágenes, 4 indexados y 4 flags abiertos; consulta de solo lectura. Producción intacta.
- Próximo paso: habilitar un flujo de adjunto desde el navegador o usar sesión de carga de QA autorizada; ejecutar Worker y confirmar moderación visible. Mantener pendiente el backfill y medición con fotos variadas.

### Revalidación local con Worker WASM — 2026-10-10

- Wrangler ejecutó el módulo real `image-phash.ts` y su decodificador WebP WASM con fetch/RPC simulados. No se enviaron hashes a Supabase ni se usaron credenciales reales.
- Resultados: sala/cocina `30/64`, sala distinta `34/64`; recortes 3/5/7/10/15 % dieron `8/4/8/12/16`. Umbral `<= 8`: sin coincidencia para las escenas distintas de esta muestra, candidata para recortes 3–7 %, omisión para 10–15 %.
- Se mantiene pendiente el QA visual con el Worker desplegado y fotos en moderación; el selector de archivos del navegador conectado no estuvo disponible y no se envió una publicación. DEV remoto permaneció en 12 activas, 4 indexadas, 4 flags abiertos. Sin cambios productivos.

## 2026-10-10 — QA pHash E2E visible en DEV

- Se completó el flujo real de carga del navegador y el Worker produjo hash para el anuncio de prueba. Con una foto base de una publicación QA existente y un recorte exacto del 5 % de cada borde, el filtro `Coincidencias pHash` mostró comparación en paralelo y distancia `8/64` (coincidencia parcial), justo en el umbral inclusivo configurado.
- La IA aprobó el contenido de prueba para revisión humana; la ficha sigue pendiente de decisión manual y no está publicada. Los anuncios explícitamente etiquetados como sintéticos fueron rechazados por la IA, aunque el Worker procesó su hash; sus flags se resuelven al quedar rechazados, por lo que no salen en la cola abierta.
- DEV mostraba 19 anuncios, 4 aprobados por IA, 6 rechazados por IA, 9 publicados y 4 anuncios con coincidencias pHash; cobertura visible: 5/13 anuncios activos con imágenes indexados. La cobertura sigue siendo insuficiente para considerar concluyentes los casos sin resultados.
- Producción intacta. No se aprobaron manualmente ni publicaron las fichas de prueba.
- Pendiente: ampliar el backfill, limpiar fixtures de prueba con autorización y ampliar la matriz de similitud/recortes antes de recalibrar el umbral.

## pHash: cierre del backfill elegible en DEV — 2026-10-10

- Consulta de solo lectura al proyecto Supabase DEV `bknwerqbbysveehcdmzr`: 13 anuncios activos con imágenes; 5 con al menos una imagen procesada por pHash; 8 intentados con cero imágenes procesables; 0 anuncios elegibles sin intento registrado.
- Los 5 procesados tienen rutas del bucket privado `property_images`. Los otros 8 solo referencian URLs externas o rutas que no corresponden al bucket esperado. El backfill y sus reintentos ya los alcanzaron; no son ocho trabajos esperando turno.
- La especificación `web/openspec/specs/media/spec.md` limita el hash a WebP guardados en el bucket privado DEV y prohíbe procesar URLs fuera de él. No se habilitó fetch externo ni se cambiaron datos/Storage. Producción intacta.
- Interpretación: `5/13` refleja cobertura del catálogo total, pero no permite declarar “sin coincidencias” para los 8 anuncios no procesables. Para comparar esos anuncios, primero se necesita una migración controlada de sus imágenes a Storage DEV, o conservarlos explícitamente como fuera de cobertura.
- Pendiente de decisión: definir si se normalizan en DEV las 8 referencias existentes a imágenes del bucket privado. Hasta entonces el límite de cobertura está identificado y el sistema permanece cerrado a URLs arbitrarias.

## 2026-10-10 — Cobertura pHash del catálogo DEV

- Estado comprobado en lectura de solo lectura: 13 anuncios activos con imágenes; 5 procesados; los otros 8 ya fueron intentados pero el Worker no encontró imágenes dentro de las fuentes permitidas. No hay anuncios elegibles sin intento.
- La regla vigente limita el cálculo a imágenes WebP del bucket privado DEV `property_images`; esos 8 anuncios conservan URLs externas o rutas no reconocidas. No se abrió el Worker a orígenes arbitrarios ni se hizo una importación de imágenes.
- La cobertura `5/13` es parcial. El resultado «sin coincidencias» solo es concluyente dentro de lo procesado, nunca para todo el catálogo.
- Para avanzar: decidir una migración controlada de esas imágenes a Storage DEV o mantenerlas explícitamente excluidas. No cambiar el umbral pHash con este dato. Producción intacta.

### Decisión de alcance pHash — 2026-10-10

El usuario confirmó que los 8 anuncios sin hash procesable son anuncios de prueba y no requieren migración ni cálculo. Se excluyen intencionalmente del backfill; no es una tarea pendiente. La cifra 5/13 describe el inventario actual de DEV incluyendo esos fixtures, no una deuda sobre anuncios reales. Mantener la restricción de imágenes privadas y no importar URLs externas.

## Caso negativo pHash visible en DEV — 2026-10-10

- Envío QA autorizado desde el formulario normal con la imagen generada `work/qa/property-phash-negative-qa.png` y datos ficticios. IA aprobó para revisión; moderación mostró “Sin coincidencias de imagen. Hash procesado.”
- Cobertura mostrada: 6/14 (incluye la ficha QA recién enviada); `Coincidencias pHash` se mantuvo en 4. Los ocho registros sin imagen procesable son fixtures que el usuario indicó que no se necesitan migrar ni hashear.
- No hubo aprobación manual ni publicación. Producción intacta.
- Conclusión limitada al caso negativo respecto de los hashes disponibles; no prueba ausencia de coincidencias globales ni cierra medición de falsos positivos/negativos.

## 2026-10-10 — Matriz pHash ampliada (local)

- Medí 14 imágenes inmobiliarias sintéticas (91 pares), codificadas como WebP, con la fórmula DCT pHash de 64 bits usada por el Worker; no hubo cambios ni cargas a DEV.
- Las escenas distintas dieron 16–42/64. Variantes visualmente casi idénticas de una sala dieron 10–16/64 y por tanto quedan fuera del umbral actual `<= 8`. Un recorte centrado de 2–3 % por borde marcó 8/64; 5 % marcó 12/64; los recortes más grandes se alejaron aún más en esta imagen.
- No elevar el umbral únicamente con datos sintéticos: faltan casos reales etiquetados para evaluar falsos avisos. pHash detecta copias cercanas; para diferentes ángulos/fotos del mismo inmueble conviene añadir señales independientes y validar su precisión.
- Límite: Sharp se usó para codificar/decodificar WebP y la fórmula del Worker se reprodujo localmente. Es una exploración, no una medición de rendimiento sobre anuncios reales.

### Robustez ante transformaciones de copia (2026-10-10)

- En una foto sintética base, recomprimir WebP a calidad 40, reducir resolución a la mitad, brillo ±15 % y saturación +25 % dieron `0–2/64` bits distintos (dentro del límite `<= 8`). Recorte 2 % por borde quedó exactamente en `8/64`; giro de 2° dio `16/64` y espejo horizontal `32/64` (fuera del límite).
- Solo es una base artificial; no usar esto para inferir similitud entre tomas distintas ni cambiar umbral sin conjunto real etiquetado.


## 2026-10-10 — QA positivo de revisión IA y pHash aceptado por ahora

- En sesión DEV autenticada, el panel mostró una ficha QA en estado “Aprobada por IA” con una explicación que describe su imagen. El Worker solo usa ese estado ante una respuesta válida de Groq; la ausencia o fallo del proveedor deriva a revisión humana. Esto, junto con el rechazo esperado de la ficha marcada como ficticia, verifica ambos resultados principales de la revisión multimodal en DEV.
- El usuario confirma que el pHash actual funciona bien por ahora. Se conserva el límite inclusivo `<= 8/64`; no se modifica código ni configuración. Casos reales y falsos positivos quedan para una calibración futura, no bloquean la decisión actual de mantener el comportamiento.
- No se aprobó manualmente ni publicó la ficha QA. Producción no cambió.

## Turnstile con proveedor real en contacto DEV — 2026-10-10

- Se actualizó el secreto del Worker compartido turnstile-siteverify-cubitat mediante Wrangler, conservando el widget cubitat-turnstile que también usa producción.
- Un envío QA autorizado desde la ficha de contacto de DEV fue aceptado por Siteverify (HTTP 200, outcome ok, sin códigos de error) y la interfaz confirmó “¡Mensaje enviado!”.
- Alcance: valida el proveedor real para contacto en DEV. No se envió formulario a un anunciante en producción ni se repitió registro/login/recuperación contra Supabase Auth. No se hizo cambio de código ni despliegue de la aplicación.
# Fase 3 — atribución segura de altas (2026-11-03)

- Trabajo en `D:\cubitat-phase3-release`, `feature/phase3-production-main`, PR borrador #186.
- Registro por correo captura `?ref=AG-XXXXXXXX`, el trigger de Auth resuelve la elegibilidad, fuerza `buyer` y escribe ledger privado e inmutable. Panel de agente verificado ofrece aprovisionamiento explícito y copia del enlace.
- Solo se restaura `ensure_agent_referral_link()` para `authenticated`; la función de historial conserva rechazo de enlaces inactivos. Visitas, contactos atribuidos, OAuth y comisiones permanecen apagados.
- Gates locales: lint PASS; 181 archivos, 810 pruebas PASS y 1 SKIP; build PASS (sitemap estático de 2 URLs por falta de config Supabase pública en este entorno). Pruebas focales tras UI: 23/23 PASS.
- Migración `20261103170000_agent_signup_referral_attribution.sql` y contrato pgTAP 11 casos pasaron `database-security`/quality en CI. No se ejecutó contra Supabase persistente, DEV ni producción.
- Próximo paso: reconciliar el ledger hosted antes de aplicar esquema; para release, comprobar build Phase 3 habilitado y QA autenticado DEV.

## F3 — CI y lectura de DEV actualizados (2026-11-03)

- Commit `b34a97e` ya está en `feature/phase3-production-main`, PR borrador #186. `quality` y `database-security` terminaron PASS; el contrato de atribución por registro se ejecutó en la base aislada de CI.
- Gates locales: lint PASS; 181 archivos, 810 pruebas PASS/1 SKIP; build estándar PASS con sitemap estático fallback. No es el bundle de release Phase 3.
- `supabase migration list --linked` confirma que el ledger vinculado a DEV sigue híbrido: seis migraciones F3 candidatas, de `20261103120000` a `20261103170000`, no están registradas remotamente, además de otras versiones remotas sin fuente local. No ejecutar `db push` ni `migration repair` hasta reconciliar.
- Consulta SQL de solo lectura confirmó en DEV: `agent_referral_links` existe, `agent_signup_attributions` no existe y el permiso `EXECUTE` a `ensure_agent_referral_link()` está revocado para `authenticated` y `anon`. No se aplicó nada.
- PR actualizado con ese estado. Siguiente paso técnico: reconciliar migraciones y planear el build/QA de release F3; mantener DEV/prod sin cambios hasta tener una ruta de esquema segura.

## F3 — perfil productivo de código preparado (2026-11-03)

- La rama añade `phase3-production` y comandos normal/CI; incluye el formulario, panel de crecimiento y moderación F3. El verificador comprueba marcadores F3 y que no aparezca el proyecto DEV.
- El Worker productivo contempla envío de postulaciones y enlaces privados, rate limiting y tareas programadas de outbox/purga. `PHASE3_ENABLED=false` permanece en `web/wrangler.jsonc`; las rutas responden 404 y las tareas no corren por defecto.
- `ensure_agent_referral_link()` está en la allowlist autenticada del Worker; no se exponen RPC de visitas, comisiones u OAuth.
- Gates locales tras este cambio: lint PASS; 181 archivos, 814 PASS/1 SKIP; build base PASS; `build:phase3-production:ci` PASS. No hubo deploy, merge ni cambios en Supabase.
- Sigue bloqueado habilitar o desplegar F3 hasta reconciliar ledger/esquema DEV, verificar QA autenticado persistente y configurar secretos requeridos. Producción continúa intacta.

## Reconciliación F3 DEV — actualización de solo lectura (2026-11-03)

La consulta actual a DEV encontró 11 versiones solo locales (5 de F2 y las 6 candidatas F3) y 58 versiones solo remotas sin fuente en esta rama. Los objetos principales de las seis migraciones F3 están ausentes; `agent_referral_links`/`ensure_agent_referral_link()` sí existen pero el EXECUTE está revocado para authenticated/anon. No se aplicó SQL ni se reparó el ledger. Esta lectura más reciente reemplaza como snapshot operativo a las cifras anteriores; el detalle está en `docs/RECONCILIACION_F3_DEV_2026-11-03.md`.

### F3 — Recuperación de fuentes de migración DEV — 2026-11-03

- Se localizaron 56 archivos fuente estándar en `D:\cubitat\web\supabase\migrations`; copiados únicamente al worktree aislado `D:\cubitat-phase3-release`, con SHA-256 igual entre origen y destino. En origen estaban sin registrar en Git, así que aún son fuentes candidatas hasta validar el replay y comparar el catálogo.
- La versión `20261101185000_phase4_listing_ai_moderation_claims_reconciled.sql` se localizó en `dev-migrations`; está clasificada DEV-only y no se añadió a `migrations/`.
- `supabase migration list --linked` fue de solo lectura: 11 versiones siguen locales sin marca remota (5 F2 + 6 F3); las 56 estándar ya coinciden con remoto. El ledger deja la DEV-only fuera de la lista estándar, como corresponde.
- CI previo PASS; el replay con estas fuentes nuevas está pendiente. No `db push`, no `migration repair`, no DDL ni cambios a datos; Producción intacta.
- Próximo: lint, suite, build y CI de replay aislado; comparar catálogo y documentar divergencias. No habilitar F3 ni desplegar hasta completar eso y QA autenticado.

### Resultado de gates para replay de fuentes — 2026-11-03

- `npm run lint`: PASS.
- `npm run test:run -- --maxWorkers=2`: 181 archivos, 814 PASS, 1 SKIP. La suite emitió avisos de conexiones de prueba a localhost:3000/Turnstile, pero terminó con exit code 0.
- `npm run build`: PASS con sitemap estático de fallback. `npm run build:phase3-production:ci`: PASS con los placeholders públicos definidos por el workflow; no usa credenciales ni verifica despliegue.
- Falta que GitHub Actions ejecute `database-security` sobre las 56 fuentes recuperadas; después revisar cualquier divergencia del replay.

## F3 — integración en `main` — 2026-11-03

- PR #186 se fusionó en `main` como `99e315369c3d1f69f58a699a9d1a635971bbb4ef` (candidato `9a91649`). Los checks `quality` y `database-security` del candidato pasaron; el segundo ejecutó replay de migraciones y pruebas SQL en Supabase aislado.
- El merge integra código y fuentes, pero no activa el Worker ni aplica migraciones hosted. `PHASE3_ENABLED=false`; producción/Supabase permanecieron intactos.
- Reconciliación DEV en lectura: 11 versiones locales sin registro remoto (5 F2 y 6 F3). Objetos pHash están presentes con RLS y grants revisados; `get_verified_seller_ids()` y el override MFA temporal no existen. Esquema de solicitudes/outbox/cupos/atribución F3 ausente.
- Siguiente paso: documentar/cotejar las cinco fuentes F2 locales sin aplicar, y definir una ejecución controlada en DEV para las seis F3, con fixtures QA y verificación posterior. No usar `db push` global ni `migration repair`.

### F2 local-only migrations — read-only DEV object inventory — 2026-11-03

A catalog-only query checked the five older local-only migrations; remote ledger rows remain zero. No table data was queried or changed.

- `20261010120000`: `property_verification_audit`, expected columns, AAL2 read policy, audit view, capture trigger on `property_verification_requests`, and immutability trigger exist. `get_verified_seller_ids()` is absent, so the migration's full effect is not represented.
- `20261010130000`: all three pHash tables and five RPCs exist; the two moderation read RPCs deny `anon`, require AAL2 internally, and have RLS enabled on fingerprint/duplicate tables. The catalog state is present despite missing history.
- `20261012170000`: `get_verified_seller_ids()` remains absent; its admin-badge extension is not present in DEV.
- `20261013110000`: `get_admin_property_image_hash_status(uuid[])` exists; its DEV definition enforces AAL2 and compares only eligible private-bucket WebP paths. `anon` is denied; `authenticated` and `service_role` can execute.
- `20261013180000`: temporary MFA override table/function are absent in DEV. Do not apply it as a cleanup step; it creates a timed access exception.

No migration was applied or repaired. Production was not queried. Next: compare the missing badge function against the intended migration and dependent UI, then decide a narrowly scoped DEV change separately from F3. Keep the five F2 ledger entries distinct from the six unapplied F3 migrations.

## Estado vigente F3 DEV — 2026-11-03

- Desde `origin/main` `0d20e81` se aplicaron a DEV únicamente las seis migraciones F3 `20261103120000`–`20261103170000`, tras un dry-run de un workdir temporal que excluyó las cinco F2 pendientes y conservó la migración remota DEV-only `20261101185000` para reconciliar el historial. El historial confirmó las seis. Las cinco F2 siguen pendientes.
- Worker DEV desplegado: `cubitat1-phase2-dev`, versión `26fa86b6-9b91-4c96-98f1-c39aedaf68de`; `PHASE3_ENABLED=true` se pasó como override solo a esa publicación; `wrangler.phase2-dev.jsonc` sigue con `false`. Se añadió `AGENT_APPLICATION_EMAIL_TO` como secreto de DEV con el correo provisional indicado; `RESEND_API_KEY` ya constaba como secreto, sin leer su valor.
- Smoke HTTP seguro: endpoint de intake devuelve 405 a GET; endpoint privado de documentos devuelve 401 sin sesión. Gates local lint/build/suite y perfil F3 CI: PASS (181 archivos, 814 PASS, 1 omitida).
- QA positivo sigue pendiente: la pestaña disponible no conserva sesión autenticada y Moderación requiere AAL2. No se creó solicitud ni se subieron documentos/envió correo. Producción intacta. No abrir uso público de F3 hasta completar QA autenticado; suscripciones/ledger de comisiones y atribución al registro continúan incompletos.

## Despliegue Fase 4 en producción — 2026-11-05

- PR #202 integró código y migraciones F4; workflow hardening de ledger quedó en PR #209. `main` al desplegar: `aed12b5c21328e8b53ba83898ab767dfe475ebd8`.
- Supabase producción `tohjzoncoosvjbjcakdl`: workflow `42009714135` PASS; dry-run limitado exactamente a `20261105120000`–`20261105180000`; las ocho migraciones se aplicaron y se verificaron ledger, tablas/RPC, Storage privado y grants. Se copiaron temporalmente fuentes canónicas de versiones ya registradas para resolver las exigencias del CLI; no se ejecutó `migration repair` ni se incluyó la migración DEV-only `20261103180000`.
- Worker `cubitat1` F4 publicado a las rutas productivas, versión `8f8731c7-9384-4490-83d6-e5a5218b43e2`. Build dinámico generó 446 URLs. Smoke de páginas F4 200 y endpoint público de contacto: GET 405 JSON.
- Pendiente QA autenticado de publicación/moderación, reseñas, contacto y valoración. Beneficios no procesa pagos ni aplica bloqueos de suscripción. El smoke HTTP no se toma como prueba de transacciones de usuario.
- Evidencia detallada en `Cubitat - Despliegue Fase 4 Produccion 2026-11-05.md` dentro del vault y en `web/supabase/DATABASE_MIGRATIONS.md`.

## Avance local F3/F4 — diagnóstico seguro de postulaciones — 2026-11-06

- Rama aislada `bugfix/phase34-local-closeout`, basada en `origin/main`; cambios aún sin commit ni despliegue.
- F3: el Worker devuelve códigos públicos enumerados distintos cuando falla la carga privada de documentos o la persistencia de la solicitud. La UI muestra instrucciones específicas y no refleja detalles upstream. El conflicto 409 conserva su mensaje de solicitud abierta.
- Pruebas específicas: 14/14 PASS. Gates raíz: lint PASS; 196 archivos, 874 PASS, 1 SKIP; build estándar PASS. `build:phase4-production:ci` PASS con URL productiva y clave pública placeholder solo para build estático; se verificó bundle combinado F2/F3/F4 y Worker.
- No hubo acceso a Supabase, cambios de esquema/datos ni despliegue. El QA autenticado de postulaciones F3 y los flujos de publicación/moderación, reseñas, contacto y valoración F4 siguen pendientes en DEV/producción según autorización y sesión disponible.
- F4-MAT: si una URL firmada de foto privada falla, el catálogo conserva el anuncio y marca la foto como temporalmente no disponible. La tarjeta y el detalle muestran un aviso accesible en vez de un espacio vacío sin explicación. Prueba focal y gates completos verificados después de añadir el cambio.

## Checklist para cerrar F3/F4 — 2026-11-06

- Se creó `docs/CHECKLIST_QA_CIERRE_FASES_3_4_2026-11-06.md` con pruebas ordenadas para postulación/documentos/decisiones, correo y retención, publicaciones y moderación, filtros/favoritos, reseñas/contacto, responsive y promoción.
- La lista distingue despliegue/rutas de QA funcional autenticado. No se realizaron pruebas remotas ni cambios de datos al redactarla.
- Los arreglos de diagnóstico de postulaciones y error de fotos Materiales siguen solo en la rama local hasta desplegarse deliberadamente a DEV.

## F3 — estado de postulación visible en Mi cuenta — 2026-11-06

- Mi cuenta consulta el `status` más reciente de `agent_applications` del usuario autenticado. La tarjeta informa recibida, en revisión, lista de espera, aprobada, no aprobada o retirada; en errores ofrece reintento y evita invitar a postularse de nuevo.
- La sección vive en `AccountPhaseThreeSection.tsx` y se carga solo con Fase 3 habilitada o en DEV, para mantener la exclusión F2/F3 del bundle base de producción. Aprobados tienen enlace al Panel de Agente; rechazados/retirados pueden volver a postularse.
- La primera versión `26a3b090-994c-48d3-8a3d-06d49c34da4a` habilitó F3, pero no transportó las banderas de F4 del build previo. Se corrigió en DEV con `c68f269f-e863-4deb-81d1-fb9886064d74`: F3 sigue habilitada y `VITE_PHASE4_SVC/REV/MAT/BIZ_ENABLED=true`; `Valorar` continúa apagado. Esta versión también incluye el aviso accesible para fotos Materiales no disponibles.
- La captura del usuario confirma en `/mi-cuenta` el estado real “Postulación no aprobada” y el CTA “Volver a postularme”; por tanto, el QA visual de ese estado queda verificado. No se muestran comentarios internos de moderación.
- El release se construyó en worktree limpio desde `origin/main`; no se incluyeron otros cambios locales. Lint PASS; suite 196 archivos, 874 PASS, 1 SKIP; build DEV y guard de Fase 4 DEV PASS. Smoke HTTP: home, `/mi-cuenta`, `/servicios`, `/materiales`, `robots.txt`, `sitemap.xml` todos 200; los chunks de F3/F4 están publicados y el de Materiales contiene el aviso. Sitemap preservado en 2 URLs. Warnings preexistentes: chunk MapLibre >500 kB y sitemap estático por falta de clave pública.
- Producción y Supabase intactos. El despliegue no ha simulado un fallo real de Storage ni sustituye QA de correo, retención y otros flujos autenticados.

## F3 — corrección de enlaces firmados en Storage — DEV — 2026-11-06

- Causa del aviso «Supabase Storage no pudo generar los enlaces privados»: Storage REST devuelve `signedURL` relativa a la raíz como `/object/sign/<bucket>/<ruta>?token=...`; los Workers de documentos y correo solo aceptaban `/storage/v1/object/sign/...` y rechazaban firmas válidas.
- Ambos consumidores normalizan la respuesta al URL del proyecto y exigen mismo origen, bucket `agent_application_documents` y token; nunca registran ni envían al cliente el detalle bruto del proveedor. Pruebas focales: 12/12 PASS.
- Release limpio derivado de `origin/main` más cambios ya publicados de estado F3 en Mi cuenta y fallback de fotos Materiales; rama local `bugfix/f3-storage-signed-url-dev`. Gates del release: lint PASS; 196 archivos, 874 PASS/1 SKIP; `build:phase2-dev` y verificadores Phase 2/4 PASS.
- Worker `cubitat1-phase2-dev` desplegado como `394ef3fb-d21e-4579-905e-2246a15ca995`. Se mantuvieron F3 y SVC/REV/MAT/BIZ activos; Valorar apagado. Páginas `/`, `/mi-cuenta`, `/moderar`, `/postular-agente`, `/servicios`, `/materiales` responden 200; endpoint protegido de documentos responde 401 sin sesión, señalando que la ruta F3 está activa y conserva autenticación.
- Pendiente: confirmar desde Moderación, con sesión admin AAL2, que «Ver documentos» abre ambos archivos y vuelve a producir enlaces de 120 segundos. No se abrió ni copió ningún documento durante este trabajo. No hubo cambios en Supabase ni producción.
- El diagnóstico seguro para distinguir fallos al enviar postulación continúa local y no se incluyó en este release. El repo `.agents/AGENTS.md` no estaba disponible en este checkout.


## 2026-11-06 — Navegación responsive de Mi cuenta en DEV

- Causa: el lateral de Cuenta usaba lg y quedaba oculto al reducir ventana/zoom, sin navegación sustituta.
- Se añade barra horizontal desplazable bajo md con Mi cuenta, Favoritos, Mis publicaciones y Panel de Agente elegible; el lateral aparece desde md.
- Lint PASS; suite release 196 archivos, 875 PASS/1 SKIP; build DEV, guards Phase 2/4 PASS; build productivo y guards de aislamiento PASS.
- Worker DEV cubitat1-phase2-dev, versión 6dda33ad-0bde-4557-8bb7-3ca991c48370. /mi-cuenta responde 200 y bundle servido contiene la nueva navegación. Producción y Supabase intactos.
- Pendiente: confirmación visual del usuario en viewport estrecho; pruebas automatizadas verifican que los destinos se muestran y navegan.


## 2026-11-06 — Corrección inmediata del bundle DEV

- Se detectó que el despliegue 6dda33ad-0bde-4557-8bb7-3ca991c48370 tomó el dist productivo porque
npm run build había corrido después de build:phase2-dev; F3 no quedaba en la app. Se volvió a compilar explícitamente en modo DEV y se reemplazó el deploy.
- Versión DEV vigente 24e554d3-e2d4-4808-bcf1-b321ab0ad39d. Guards phase2-dev/phase4 PASS. Smoke de /mi-cuenta, /postular-agente, /servicios, /materiales: 200. El JS de entrada referencia AccountPhaseThreeSection, AgentApplicationPage, ServiceDirectoryPage y MaterialsMarketplacePage chunks.
- Producción/Supabase intactos. Si el usuario aún ve assets antiguos, recargar con Ctrl+F5 o limpiar cache PWA.


## 2026-11-06 — Apertura de documentos F3 confirmada por usuario

- En Moderación DEV el usuario confirmó que se abrieron CV y título de la postulación. El cambio de estado a En revisión fue realizado por el usuario.
- Apertura funcional queda confirmada según ese reporte; expiración del URL firmado aún pendiente. No se tocó producción ni Supabase.

## QA F3 y retiro administrativo de agentes — 2026-11-06
- Usuario confirma que rechazó la postulación QA actual en DEV y señala que solo falta probar aprobación. No se aprobó una cuenta real.
- Se preparó localmente la sección Agentes activos para retirar el rol con AAL2, motivo obligatorio, auditoría inmutable y liberación transaccional de plaza. Conserva cuenta, anuncios e historial; admins no aparecen en la lista.
- La migración candidata 20261106100000_agent_access_revocation.sql aún no se valida en scratch, no se ha cotejado/aplicado en DEV y el UI no está desplegado. Producción intacta.

## Despliegue DEV — retiro auditado de agentes — 2026-11-07

- Worker `cubitat1-phase2-dev` publicado con la interfaz F3 de agentes activos y acción **Retirar acceso**, versión `36f2fa5f-95c1-4a9c-8b3f-1ae8a0154ec8`.
- Perfil construido con `VITE_PHASE3_UI_ENABLED=true`; publicación al Worker DEV con `PHASE3_ENABLED=true`. No se desplegó a producción.
- La consulta de Supabase DEV confirmó que existen `agent_role_moderation_events`, `list_active_agents_for_moderation()` y `revoke_agent_access(uuid,text)`. La migración se ejecutó por CLI; falta confirmar con `supabase migration list --linked` que `20261106100000` quedó registrado en el historial, porque el primer `migration repair` se ejecutó desde una carpeta sin el archivo local.
- Smoke posterior: `/` y `/moderar` HTTP 200; el asset publicado `AgentApplicationsModerationTab-yJ40jBwL.js` HTTP 200 y contiene Agentes activos / Retirar acceso.
- Gates: lint PASS; suite 196 archivos, 878 PASS / 1 SKIP; build estándar PASS; build DEV PASS. Build adicional phase3-production:ci omitido por faltar la configuración pública productiva. No se probó una revocación autenticada.
- Pendiente: verificar historial remoto y probar con admin AAL2 y agente sintético, comprobando razón, auditoría, conservación de cuenta/anuncios y liberación de cupo. F3 approval QA también sigue pendiente.

### Diagnóstico — lista de agentes de moderación en DEV — 2026-11-07

- Hallazgo: `/moderar` muestra error al cargar Agentes activos. `worker-phase2-dev.ts` no permitía `list_active_agents_for_moderation` ni `revoke_agent_access`; el proxy las rechazaba con 403 antes de llegar a PostgREST.
- Corrección local en `D:\cubitat-phase34-work`, rama `bugfix/phase34-local-closeout`: ambas RPC se añadieron a la allowlist autenticada; los controles AAL2 continúan en PostgreSQL. El fallback visual ahora describe que la lista no pudo cargarse, no guardarse.
- Regresión Worker: RPC permitidas para sesión autenticada, denegadas a anon; prueba del mensaje de carga. Lint PASS; 196 archivos / 880 pruebas PASS / 1 omitida; build estándar PASS.
- Deploy DEV pendiente. El build `phase2-dev` con UI F3 explícita generó assets, pero falló en el sitemap dinámico por falta local de `VITE_SUPABASE_ANON_KEY`. No se expuso ni se reutilizó la clave de producción. El HTML DEV activo referencia 29 chunks que no existen en `dist` local, por lo que no es seguro desplegar ese bundle mezclado.
- Siguiente paso: recuperar el checkout exacto del release DEV o conseguir su clave pública anon de DEV y construir desde la fuente coherente; desplegar solo tras comparar assets. Producción y Supabase no se modificaron.
### Resultado de despliegue — allowlist de RPC para agentes activos — 2026-11-07

- Estado anterior «Deploy DEV pendiente» supersedido: el Worker `cubitat1-phase2-dev` quedó publicado en `2026-11-07T07:36:08Z`, versión `bc22cfbc-8824-4c9a-82a0-b4dfa4333256` (100%).
- Wrangler usó `wrangler.phase2-dev.jsonc` y una copia de los 73 recursos estáticos servidos por el DEV vigente; subió solo `index.html` (los otros 72 ya estaban en el almacén de assets). No se mezcló el `dist` local divergente.
- Smoke HTTP posterior: `/` y `/moderar` 200. La ruta F3 `/api/phase3/agent-applications` devuelve 404 porque `PHASE3_ENABLED=false` permanece según la configuración de este deploy; no se activó F3 aquí.
- Producción y Supabase no se modificaron. Falta QA en `/moderar` con sesión administrativa AAL2 para confirmar lista y revocación de agente. La prueba CUA no estuvo disponible por timeout.

## Promoción de retiro auditado de agentes — 2026-11-07

- La rama `bugfix/phase34-local-closeout` se basa en `main` actual (`0de16ae3`) y contiene correcciones F3/F4 revisadas para postulación, enlaces privados, cuenta, imágenes de Materiales y moderación de agentes.
- El fix de proxy de RPC se añadió también a `worker-phase2-production.ts`; antes solo estaba en el Worker DEV, por lo que producción habría seguido rechazando la lista/retiro aun con el SQL.
- Migración `20261106100000_agent_access_revocation.sql`: aplicada en DEV según consulta de objetos, pero sin versión remota registrada; producción aún no modificada.
- Se prepara promoción por PR y un workflow manual de producción que aborta si el destino no es `tohjzoncoosvjbjcakdl`, hay esquema parcial, o el dry-run no enumera únicamente esta migración.
- Lint, suite completa y build Fase 4 de producción se están repitiendo antes de abrir PR. Despliegue Worker y migración productiva siguen pendientes hasta integrar CI verde.

## Actualización de gate y builds — 2026-11-18

GitHub retiró `GHSA-fc5q-39xc-vjpf` el 2026-11-18, pero el registro npm aún lo muestra y `picomatch` latest sigue en 4.0.7. CI ahora permite solo ese URL retirado, exige `npm audit --omit=dev --audit-level=high` limpio y mantiene cualquier otro advisory alto/crítico como bloqueo. El filtro falla cerrado ante problemas de red o JSON inválido. Código: `web/scripts/audit-withdrawn-advisories.mjs`; regresiones 3/3. Gates locales completos PASS: lint, suite 248 archivos/1,131 PASS/1 omitida, build estándar y perfiles DEV/producción F2/F3/F4. Auditoría runtime producción: cero hallazgos. Rerun del PR #246 antes del cambio siguió fallando en auditoría; base de datos PASS. Falta enviar cambios y obtener CI actualizado; no hay despliegue nuevo.

## Favoritos filtrables — release manual producción — 2026-11-18

- El Worker `cubitat1` está al 100 % en `f85c0e18-81b2-4059-8001-43e4dab5f823`, construido desde el commit `8867dd4` de PR #247 con el perfil `phase4-production:ci` y el procedimiento manual protegido de Wrangler.
- Se preservó el sitemap productivo vigente de 446 URLs y `robots.txt`; smoke HTTP de home, Favoritos, Resultados, Servicios, Materiales, `sw.js` y sitemap: 200.
- QA autenticado de solo lectura: «Todos» 5; Propiedades 5; Servicios y Materiales 0 con estado vacío; filtrar no cambia `/favoritos` y «Todos» restaura la lista.
- No hubo cambios de base de datos ni escrituras de anuncios. PR #247 sigue abierto porque GitHub Actions no inició `quality` ni `database-security` por el bloqueo de facturación. La validación local y el deploy manual no se presentan como CI verde ni integración del PR.
- Evidencia: `docs/FAVORITES_FILTERS_PRODUCTION_2026-11-18.md`.


## Favoritos SVC/MAT — intento de respaldo local (2026-11-22)

A solicitud del usuario se intentó respaldar desde el equipo local. Bloqueado: solo hay SUPABASE_ACCESS_TOKEN; no existe project-ref enlazado ni URL/contraseña de DB, las herramientas PostgreSQL no están instaladas y el token no tiene permiso projects_read. La sesión Chrome visible está en Cubitat DEV. No se creó respaldo ni se aplicaron migraciones. Para reanudar: resolver el gate de facturación en GitHub Actions o configurar conexión local y herramientas de respaldo; validar primero el backup y después aplicar únicamente el workflow coordinado F3/F4.



Comprobación adicional del intento local (2026-11-22): la referencia productiva 	ohjzoncoosvjbjcakdl sí consta en los workflows. supabase link --project-ref falla porque el token no tiene api_gateway_keys_read; Docker está instalado, pero falta SUPABASE_DB_URL/contraseña para ejecutar pg_dump. No se creó respaldo.



## Verificación de favoritos en producción — 2026-11-23

Consultas read-only confirmaron public.saved_marketplace_listings, versiones 20261116100000 y 20261116120000 en ledger, grants esperados y tres políticas RLS. No se ejecutó DDL/DML. Ledger remoto: 167 versiones, distinto de la huella de 101 que exige el workflow Phase 3/4; no ejecutar el bundle antiguo de 64 migraciones. UI autenticada aún pendiente; si falla, revisar cliente/Worker/sesión. La URI compartida en chat requiere rotación. Evidencia: docs/FAVORITES_PRODUCTION_STATE_2026-11-23.md.


## Favorites SVC/MAT production follow-up — 2026-11-23

Production already had the favorites table, both migration versions, grants and owner RLS policies. Added the table to the production Worker authenticated write allowlist and regression coverage. Deployed version `bf754180-1310-4077-905c-65e70dbb0f3c`. No database migration or data write was performed. Production ledger drift remains; do not run the stale global migration package. Real authenticated UI save/remove QA remains open.

## Admin MFA disabled — production verified — 2026-11-23

Migration `20261123090000_disable_admin_mfa_requirement.sql` applied to production after comparing the exact 167-version remote ledger against the complete release sources; dry-run selected only this migration. No backup was created at the user's explicit request. Postcheck confirms ledger 168, the migration row, and `is_admin_aal2()` delegating to `is_admin()`.

Production Worker `cubitat1` deployed at 100%, version `0d79f4a9-9947-4b20-8eb1-91b3d887cf2a`. Lint, 248 test files (1,134 passed, 1 skipped), phase4-production build/verifiers passed. `/`, `/moderar`, `/recuperar-contrasena` return 200; live index matches the build and admin chunk returns 200. TOTP factors remain enrolled. Pending: authenticated admin AAL1 QA and check for any independent Supabase Auth AAL2 requirement during recovery. The temporary DB password shared in chat must be rotated; do not copy it to repository files.
## Tarjetas con diseño compartido — producción — 2026-11-23

`CatalogCardFrame` unifica Comprar, Servicios y Materiales: 72 rem centrados, grilla con columnas desde 320 px, imagen 16:9 y acciones abajo. `cubitat1` versión `318d5a93-5f0e-4ef2-8a3b-4859924951e1` al 100%. Lint, 1,135 PASS/1 omitida, build F4 y verificadores PASS. Rutas principales y CSS compartido HTTP 200. Sin cambios de base de datos. QA visual manual en móvil queda pendiente.

### Estado al 2026-11-23 — fichas SVC/MAT
- `MarketplaceListingDetail` comparte toolbar, breadcrumb, hero split, galería y contacto; las secciones particulares conservan semántica de Servicio o Material.
- Gates local y de producción PASS: lint, 249 archivos / 1,152 PASS / 1 omitida, builds estándar y phase4-production.
- Producción `cubitat1` versión `b4593cbf-cb36-49f6-bd69-f3a3223a04c4`; rutas `/servicios`, `/materiales` y activos compartidos HTTP 200.
- Sin DB/migraciones. Pendiente QA visual manual móvil.
- Evidencia: `Cubitat - Fichas compartidas Servicios Materiales Producción 2026-11-23.md` en el vault.
### Estado al 2026-11-23 — reseñas públicas ocultas temporalmente
- La página de Servicios ya no importa/monta el panel de reseñas en la ficha pública; opiniones y administración de reseñas permanecen intactas.
- El verificador `verify-phase4-production-bundle.mjs` comprueba que el texto del panel no se incluya en el bundle público.
- Lint y build phase4-production/verificadores PASS; suite 249 archivos / 1,152 PASS / 1 omitida.
- `cubitat1` versión `4ffec3d4-bc08-452a-9243-c2e31fb57030`; `/servicios`, ficha y chunk HTTP 200; texto del panel ausente del bundle de detalle.
- Sin DB, migraciones ni cambios de datos.
- Evidencia en el vault: `Cubitat - Reseñas ocultas temporalmente en Servicios Producción 2026-11-23.md`.
## Reportes Marketplace + perfiles destacados — implementación local — 2026-11-23

Rama ugfix/detail-page-consistent-width: formulario de reportes de Servicios/Materiales, API Worker POST /api/public/marketplace-report, nueva migración 20261123100000_marketplace_listing_reports.sql, lectura/revisión unificada en Moderación, y bloque final de perfiles con beneficio vigente profile_featured. Gates locales: lint, 250 archivos/1,156 PASS/1 omitida, build estándar. Producción pendiente: el workflow vigente de migraciones productivas exige respaldo <24h y conjunto release F3/F4; no se aplicó DDL ni se desplegó código porque el cambio requiere ambos para funcionar. Sin backup por instrucción del usuario.

## Reportes Marketplace SVC/MAT — producción — 2026-11-23

Aplicada únicamente `20261123100000_marketplace_listing_reports.sql` a `tohjzoncoosvjbjcakdl`, sin respaldo a solicitud expresa. El ledger pasó de 168 a 169 versiones; una versión antigua registrada remotamente (`20261120203809`) no tenía fuente en este checkout y se representó como ya aplicada solo en el manifiesto temporal. `migration list` confirmó que solo la migración nueva estaba pendiente y `migration up` la registró junto con su ejecución. Postcheck confirmó tabla, dos RPC, RLS y grants.

`cubitat1` publicado como `408b4581-fba4-4e0d-b459-e97a9e71dc36`. Lint, 251 archivos/1,156 PASS/1 omitida, build Fase 4 y verificadores PASS. Home, resultados, Servicios, Materiales, Moderación y bundles clave HTTP 200. Prueba autenticada de envío/revisión pendiente; no se crearon reportes de prueba.
