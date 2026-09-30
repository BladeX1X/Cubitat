# Cubitat - Seguimiento de Fase 2

Fecha de corte: 2026-09-28  
Rama: `feature/phase2-dev-remote-bootstrap`  
Entorno activo: `https://cubitat1-phase2-dev.pochiprats18.workers.dev`  
Producción: `https://cubitathome.com` (sin cambios en este ciclo)

## Estado general

La Fase 2 está implementada en gran parte y continúa abierta. El trabajo se ha
mantenido modular, reversible y aislado en DEV. Todavía no se debe declarar la
fase cerrada ni pasarla a producción porque quedan verificaciones externas y
pruebas reales de dispositivos/proveedores.

### Lectura rápida

- **Listo y verificado:** aislamiento DEV/producción, gates locales, auditoría
  pública básica de DEV, seguridad SQL preparada, accesibilidad reciente y
  los flujos principales de publicación, moderación, contacto y notificaciones
  internas.
- **Implementado pero pendiente de evidencia física:** Push/PWA en Android e
  iOS con la aplicación cerrada, recepción en la bandeja del sistema y apertura
  del destino al tocar la notificación.
- **Pendiente externo:** clave de moderación IA, entrega controlada de correo,
  credenciales QA persistentes, configuración final de proveedores y ejecución
  de la matriz SQL con Docker disponible.
- **Producción:** no se ha tocado durante este seguimiento.

## Lo que ya se hizo

### Plataforma y aislamiento

- Se creó un Worker DEV separado para Fase 2.
- El build productivo excluye módulos, jobs, rutas y configuración exclusivos
  de Fase 2.
- El build DEV incluye KYC, agentes, métricas y funciones adicionales.
- Se añadieron verificadores para impedir fugas de configuración DEV o Fase 2
  hacia producción.
- El sitemap, `robots.txt`, manifest y Service Worker se generan con el origen
  correcto de cada entorno.

### Autenticación y seguridad

- OAuth Google, callback, PKCE, CAPTCHA y recuperación de contraseña.
- MFA/AAL2, roles administrativos y barreras de acceso por rol.
- Mensajes seguros para errores de OAuth, correo, tokens y enlaces expirados.
- Rate limiter en Durable Object y validación de registros corruptos.
- Endpoints protegidos para seguridad, métricas, contacto, reportes y
  moderación.
- La migración local y remota de DEV están alineadas hasta
  `20260916010000`.

### Publicaciones y moderación

- Flujo de publicación con borrador local y pruebas del asistente.
- Permutas con campos estructurados y compatibilidad con datos antiguos.
- Moderación manual, estados de publicación y revaluación IA.
- KYC, verificación documental, Trust Score, reportes y bitácora de auditoría.
- Reglas de duplicados en DEV con señales privadas, resolución al revisar y
  panel para moderación.
- El envío KYC limpia archivos huérfanos y siempre libera el estado de carga
  ante errores inesperados.

### Notificaciones y PWA

- Bandeja interna con lectura y retiro del pendiente.
- Web Push con suscripciones persistentes y destinos internos seguros.
- El clic de una notificación marca el aviso como leído y navega al destino
  válido cuando la aplicación se restaura.
- Aviso de instalación PWA para Android, iOS y escritorio.
- “Quizás luego” vuelve a mostrarse después de siete días.

### Contacto y correo

- Formulario público de contacto con Turnstile y RPC protegida.
- Dispatcher de alertas de correo con idempotencia, reintentos y aislamiento
  de DEV.
- Reenvío de confirmación con respuesta controlada cuando falta el proveedor.

### Calidad y accesibilidad

- `usePublicationDraft` ya no muta referencias durante el render.
- El endpoint de métricas comprueba respuestas upstream antes de leerlas.
- `AdminNoticeDialog` tiene relaciones accesibles de título y descripción.
- El buscador administrativo de propiedades tiene etiqueta asociada.
- La prueba de respuesta SEO malformada devuelve un `404` seguro.
- El auditor React reporta 175 incidencias en el repositorio completo; en el
  alcance de archivos modificados reportó 13, sin nuevos avisos de
  accesibilidad tras las correcciones recientes. Estas correcciones eliminaron
  avisos de refs, fetch sin comprobar, diálogo sin nombre accesible y reset de
  carga KYC fuera de `finally`.

## Evidencia comprobada

- `npm run lint`: correcto.
- `npm run test:run`: 136 archivos y 597 pruebas correctas.
- `npm run build`: correcto, con aislamiento del bundle productivo.
- `npm run build:phase2-dev`: correcto, con KYC y sitemap DEV de 446 URLs.
- E2E público contra DEV: `comprehensive-audit.spec.ts`, 1/1 correcta.
- E2E remoto adicional de búsqueda, seguridad, Turnstile y publicación: 7/7
  correctas en la revalidación agrupada.
- `supabase db lint --linked --level warning`: `No schema errors found`.
- `supabase db push --linked --dry-run`: `Remote database is up to date`.
- Las rutas DEV principales, manifest y Service Worker respondieron HTTP 200.
- Producción no fue desplegada ni modificada durante este ciclo.

## Pendiente para cerrar la Fase 2

### Proveedores y configuración externa

- Configurar `GROQ_API_KEY` en DEV para probar moderación IA real. Mientras no
  exista, el sistema conserva `pending_review` y revisión manual.
- Ejecutar una entrega controlada de correo con destinatario DEV autorizado.
- Confirmar OAuth Google, Turnstile y Resend en los entornos definitivos.
- Rotar secretos comprometidos o caducados siguiendo el procedimiento seguro;
  no guardar secretos en el repositorio ni en esta nota.

### Pruebas reales

- Push en Android con aplicación cerrada: recepción, toque y navegación.
- Push en iOS/Safari con dispositivo real.
- PWA instalada en iOS y Android, incluyendo reapertura desde la notificación.
- Flujo autenticado E2E con credenciales de prueba explícitas y autorizadas.
- Publicación, contacto, correo y moderación con cuentas persistentes de QA.

### Revisión humana y operación

- Revisar políticas activas de `profiles`, `notifications`, `properties`,
  `property_reports` y `contacts` en DEV.
- Contrastar los 7 hallazgos de autorización/RLS de React Doctor con políticas,
  triggers y RPC activos antes de tocar migraciones.
- Obtener un dump SQL remoto cuando Docker esté disponible; el intento actual
  quedó bloqueado porque falta `dockerDesktopLinuxEngine`.
- Revisión legal de términos, privacidad, confianza y criterios de moderación.
- Aprobar contenido real de servicios, productos e imágenes de provincias.

### Inventario seguro de secretos DEV - 2026-09-28

La inspección se limitó a nombres mediante `wrangler secret list`; no se
leyeron ni se registraron valores:

- **Presentes:** `CONTACT_METRICS_SALT`, `RESEND_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`,
  `VAPID_SUBJECT` y `VITE_SUPABASE_ANON_KEY`.
- **Ausente y necesario para la prueba IA real:** `GROQ_API_KEY`.
- **Opcionales ausentes:** `CF_API_TOKEN`, `CF_ACCOUNT_ID`,
  `SUPABASE_MANAGEMENT_TOKEN`, `SUPABASE_PROJECT_ID`, `GA_SERVICE_ACCOUNT_JSON`
  y `GA_PROPERTY_ID`; las métricas externas permanecen en estado controlado de
  configuración faltante.
- No se modificaron secretos ni se realizó despliegue como parte de esta
  inspección.

### Arranque del Worker DEV - 2026-09-28

- `wrangler check startup --config wrangler.phase2-dev.jsonc` completó el
  análisis sin errores.
- La ventana de perfil local fue de `23.6 ms` y no mostró un problema de
  inicialización que requiera cambiar la arquitectura.
- El perfil `.cpuprofile` temporal generado por Wrangler fue eliminado; no se
  conserva como artefacto del producto.

### OAuth Google DEV - revisión de configuración - 2026-09-28

- `supabase/config.toml` mantiene Google habilitado y el `client_id` configurado.
- El secreto se referencia correctamente como
  `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)` y no se guarda en el repositorio.
- El CLI no expone el valor del secreto; la prueba anterior de OAuth que
  devolvió `missing OAuth secret` confirma un pendiente de configuración externa
  del proyecto DEV, no un fallo del callback ni del código del Worker.
- No se modificó Auth, ningún secreto ni producción durante esta revisión.

En la sesión CLI actual tampoco están presentes las variables
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, `SUPABASE_AUTH_CAPTCHA_SECRET` ni
`RESEND_API_KEY` (se comprobó únicamente su presencia booleana). Por tanto, no
es seguro intentar un `supabase config push` desde esta sesión: primero debe
cargarse la configuración externa en el entorno o en el gestor de secretos de
DEV.

### Revalidación de gates - 2026-09-28

- `npm run lint`: correcto.
- `npm run test:run`: 136 archivos y 597 pruebas correctas.
- `npm run build`: correcto; el bundle productivo excluye módulos exclusivos
  de Fase 2 y generó 446 URLs.
- `npm run build:phase2-dev`: correcto; el bundle DEV conserva KYC y generó
  446 URLs del origen DEV.
- Durante la suite aparecieron solo advertencias conocidas del entorno local
  sobre carga de Turnstile y Supabase en `localhost`; no produjeron fallos de
  pruebas ni cambios remotos.

### Revalidación de Supabase DEV - 2026-09-28

- `supabase db lint --linked --level warning`: `No schema errors found` en
  `extensions` y `public`.
- `supabase db push --linked --dry-run`: `Remote database is up to date`; no se
  aplicaron migraciones ni se escribieron datos.
- El CLI volvió a señalar que faltan `SUPABASE_AUTH_CAPTCHA_SECRET`,
  `RESEND_API_KEY` y `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`; son pendientes de
  configuración externa, no errores del esquema.

### Auditoría E2E pública DEV - 2026-09-28

- `comprehensive-audit.spec.ts` pasó `1/1` contra
  `https://cubitat1-phase2-dev.pochiprats18.workers.dev` en Chromium.
- La prueba fue de navegación pública, sin credenciales y sin escrituras
  persistentes.

### Consistencia documental - 2026-09-28

- Se retiró del handoff una referencia que presentaba una versión DEV antigua
  como vigente; el bloque posterior conserva la versión histórica y registra
  la versión operativa posterior.
- La búsqueda de `37200e83` ya no encuentra referencias en `docs/` ni en
  `web/`.

### Auditoría de dependencias - 2026-09-28

- `npm audit --audit-level=high` contra `https://registry.npmjs.org` terminó
  con `found 0 vulnerabilities`.
- No se modificaron dependencias durante esta comprobación.

### Gate de dependencias en CI - 2026-09-28

- `.github/workflows/phase2-quality.yml` ahora ejecuta
  `npm audit --audit-level=high --registry=https://registry.npmjs.org` después
  de instalar dependencias.
- El cambio no despliega ni requiere secretos; solo hace fallar CI ante
  vulnerabilidades de alta severidad.
- Tras el cambio pasaron lint, 136 archivos/597 pruebas, build productivo
  aislado y build `phase2-dev` con KYC y 446 URLs DEV.

### Aislamiento runtime producción/DEV - 2026-09-28

- La portada productiva respondió HTTP `200`.
- Su HTML no contiene el origen `cubitat1-phase2-dev.pochiprats18.workers.dev`
  ni el marcador `worker-phase2-dev`.
- La comprobación fue de solo lectura; producción no fue desplegada ni
  modificada.

### Versión DEV publicada - verificación 2026-09-28

- `wrangler versions list --config wrangler.phase2-dev.jsonc` confirmó como
  versión más reciente `22c90271-477f-486f-bcb8-f09be083957f`.
- La consulta fue de solo lectura; no se creó, promovió ni revirtió ninguna
  versión.

### Despliegue DEV activo - verificación 2026-09-28

- `wrangler deployments list --config wrangler.phase2-dev.jsonc` confirmó que
  `22c90271-477f-486f-bcb8-f09be083957f` recibe el `100%` del tráfico DEV.
- No se modificó el reparto de tráfico ni se ejecutó rollback.

### Reconciliación con roadmap histórico - 2026-09-28

- El roadmap del vault, fechado el `2026-07-27`, todavía describe Web Push como
  diferido. El estado técnico posterior del repositorio ya incluye Push/PWA,
  dispatcher, Service Worker y lectura; el pendiente actual es QA físico en
  Android/iOS, no implementación.
- Trust Score se mantiene interno en DEV y su exposición pública permanece
  diferida por decisión de producto.

### Historial de migraciones DEV - verificación 2026-09-28

- `supabase migration list` confirmó coincidencia local/remota en todas las
  migraciones administradas por Supabase hasta `20260916010000`.
- No hay divergencias ni migraciones estándar pendientes.
- Las rutas `web/supabase/dev-migrations` son un carril separado y no se
  presentan como parte del historial estándar sin una aplicación explícita.

## Qué sigue

El siguiente orden de trabajo queda preparado para continuar sin cambiar de
fase ni esperar aprobaciones intermedias:

1. Revisar y cerrar la configuración externa de DEV que todavía falte, sin
   copiar secretos a código, documentación ni repositorio.
2. Ejecutar una prueba controlada con cuentas QA autorizadas para contacto,
   correo, moderación y autenticación.
3. Completar la matriz física de Push/PWA en Android y después iOS; anotar cada
   resultado por dispositivo y mantener como pendiente cualquier caso que no
   pueda probarse físicamente.
4. Ejecutar la matriz SQL cuando Docker esté disponible y contrastar sus
   resultados con las políticas RLS activas.
5. Repetir lint, pruebas, build, build DEV y auditoría pública de DEV después
   de cada cambio funcional.
6. Solo con toda la evidencia anterior, preparar una promoción gradual a
   producción con rollback.

## Orden recomendado para continuar

1. Resolver o documentar la configuración de proveedores externos en DEV.
2. Ejecutar las pruebas autenticadas y de correo con cuentas QA autorizadas.
3. Completar QA físico de Push/PWA en Android y después iOS.
4. Revisar políticas RLS activas y obtener el dump remoto cuando Docker esté
   disponible.
5. Cerrar revisión legal y de contenido.
6. Repetir los cuatro gates y la auditoría pública DEV.
7. Solo después decidir el despliegue gradual a producción con rollback
   preparado.

## Bloqueos actuales

- No hay bloqueo de código local conocido para continuar en DEV.
- La moderación IA real espera `GROQ_API_KEY`.
- El dump remoto de Supabase espera Docker disponible.
- Push/PWA en iOS necesita un dispositivo real.
- El tramo autenticado E2E necesita credenciales de prueba explícitas.

## Regla de cierre

La Fase 2 se considerará cerrada únicamente cuando los pendientes anteriores
tengan evidencia verificable, los cuatro gates vuelvan a pasar y exista una
decisión explícita sobre el despliegue gradual a producción. Hasta entonces,
los cambios deben continuar únicamente en DEV y conservar rollback.

## Verificación adicional - 2026-09-28

- Se amplió `web/supabase/tests/phase2_local_security.sql` para comprobar que
  `anon` no pueda insertar contactos ni reportes directamente después del
  endurecimiento server-side.
- La misma matriz comprueba que el propietario puede marcar su notificación
  como leída y que otra cuenta no puede modificarla.
- `npm run lint`: correcto; `npm run test:run`: 136 archivos y 597 pruebas;
  `npm run build`: correcto; `npm run build:phase2-dev`: correcto.
- `supabase test db --linked` no pudo ejecutar la matriz porque el CLI necesita
  el contenedor `pg_prove` y el equipo no tiene disponible
  `dockerDesktopLinuxEngine`. La prueba quedó preparada, pero no se marca como
  verificada remotamente hasta poder ejecutarla con Docker o una conexión SQL
  autorizada que no dependa del contenedor.

## Accesibilidad de formularios - 2026-09-28

- Se asociaron etiquetas visibles y controles en el selector de avatar de
  cuenta y en los campos del formulario de reportes.
- Pruebas focalizadas de cuenta y detalle: 24/24.
- React Doctor sobre los cambios quedó en 13 hallazgos, sin avisos de
  accesibilidad para estos controles.
- Gates completos: lint correcto, 136 archivos y 597 pruebas, build productivo
  correcto y build DEV correcto.
- DEV desplegado como `22c90271-477f-486f-bcb8-f09be083957f`; `/`, `/mi-cuenta`,
  `/moderar`, `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200.
- Auditoría pública E2E contra esa versión: `comprehensive-audit.spec.ts`, 1/1
  correcta; no usó credenciales ni creó datos persistentes.
- Producción continúa intacta.

## Revisión de hallazgos de autorización - 2026-09-28

- React Doctor sigue reportando tres advertencias de escritura de campos de
  autorización, pero la lectura del código y de las migraciones las clasifica
  como falsos positivos contextuales:
  - `notificationRead.ts` solo actualiza `is_read` y filtra por `id` y
    `user_id`; la política activa limita la fila a su propietario.
  - `AccountPhaseTwoSections.tsx` solo permite `buyer`/`agent`; el trigger
    impide escaladas administrativas y exige KYC verificado para `agent`.
  - `AccountPage.tsx` lee el rol para resolver la interfaz y no lo escribe.
- No se cambió el modelo de autorización ni se suprimió el diagnóstico; la
  matriz SQL y las migraciones siguen siendo la evidencia de seguridad.

## Cobertura PWA y Push - 2026-09-28

- Revalidación focalizada: `PWAInstallPrompt.test.tsx` y
  `pushService.test.ts`, 2 archivos y 24 pruebas correctas.
- Comprobación HTTP read-only posterior: `/`, `/mi-cuenta`, `/moderar`,
  `/manifest.webmanifest` y `/sw.js` respondieron `200` en DEV.
- Las pruebas unitarias existentes cubren la detección de iOS, las instrucciones
  de instalación, el caso de aplicación ya instalada, el aviso de “Quizás
  luego” a siete días y la disponibilidad Push que exige instalación en iOS.
- La auditoría pública E2E de DEV quedó correcta, pero no sustituye una prueba
  física de notificaciones del sistema con la aplicación cerrada.
- El cierre de este bloque requiere evidencia observable en Android e iOS:
  recepción en el sistema, toque de la notificación, navegación al destino y
  retiro de la notificación interna una vez leída.

## E2E público y seguridad DEV - 2026-09-28

- Se ejecutaron contra `https://cubitat1-phase2-dev.pochiprats18.workers.dev`
  los escenarios públicos, búsqueda, Turnstile y seguridad con red autorizada.
- Resultado: **7/7 correctos** en Chromium.
- La ejecución anterior de la suite completa falló antes de recibir respuestas
  del Worker por `ERR_NETWORK_ACCESS_DENIED`/`EACCES` del entorno local; al
  repetirla con conectividad autorizada, las pruebas públicas y de seguridad
  pasaron. Esto clasifica el primer resultado como bloqueo del entorno, no como
  regresión de DEV.
- No se ejecutaron los escenarios de publicación real, alertas autenticadas ni
  correo en esta revalidación; siguen requiriendo cuentas QA autorizadas y
  limpieza observable.

## Preparación E2E autenticada - 2026-09-28

- `web/e2e/test-flow-real.spec.ts` ya usa `CUBITAT_E2E_BASE_URL` en lugar de
  fijar `localhost`, por lo que puede apuntar a DEV cuando existan credenciales
  QA autorizadas.
- Sus capturas se guardan en los artefactos de Playwright mediante
  `testInfo.outputPath`, sin rutas personales de otro entorno.
- El escenario conserva sus barreras: no corre sin `CUBITAT_E2E_EMAIL`,
  `CUBITAT_E2E_PASSWORD` y `CUBITAT_E2E_ALLOW_MUTATIONS=true`.
- Después del cambio pasaron lint, 136 archivos/597 pruebas, build productivo
  aislado y build `phase2-dev` con 446 URLs DEV.

## Revalidación remota posterior - 2026-09-28

- DEV mantiene la versión operativa `22c90271-477f-486f-bcb8-f09be083957f`
  con el 100% del tráfico.
- `/`, `/mi-cuenta`, `/moderar`, `/manifest.webmanifest` y `/sw.js` respondieron
  `200` mediante comprobaciones read-only.
- Producción respondió `200`; su HTML sigue sin contener el origen DEV ni
  `worker-phase2-dev`.
- El último cambio fue exclusivamente de pruebas E2E, por lo que no se hizo un
  despliegue adicional al Worker.

## Revisión de secretos DEV posterior - 2026-09-28

- `wrangler secret list --config wrangler.phase2-dev.jsonc` volvió a confirmar
  que están presentes los secretos de Supabase, Resend, Push y métricas ya
  documentados.
- `GROQ_API_KEY` continúa ausente; tampoco aparecen secretos de CAPTCHA, Resend
  Auth u OAuth Google Auth en este Worker. La consulta mostró solo nombres y no
  expuso valores.
- No se modificaron secretos ni se intentó inferir valores desde el historial.

## Inventario nominal de integraciones DEV actualizado - 2026-09-28

- La lista nominal del Worker confirma `CONTACT_METRICS_SALT`, `RESEND_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, las tres claves VAPID y
  `VITE_SUPABASE_ANON_KEY`.
- `GROQ_API_KEY` sigue ausente; por eso la moderación real de imágenes no se
  puede cerrar todavía.
- `supabase secrets list --project-ref bknwerqbbysveehcdmzr` devolvió cero
  secretos de Edge Functions. Ese comando no representa los secretos internos
  de Auth, así que OAuth, CAPTCHA y SMTP de Auth conservan su verificación
  independiente.
- No se leyeron valores secretos ni se modificó ningún entorno.

## Revalidación de puertas completas - 2026-09-28

- `npm run lint`: correcto.
- `npm run test:run`: **137 archivos y 608 pruebas correctas**.
- `npm run build`: correcto; aislamiento productivo y guard de secretos
  correctos.
- `npm run build:phase2-dev`: correcto; KYC incluido, origen DEV validado,
  sitemap de 446 URLs y guard de secretos correcto.
- No hubo cambios de código ni despliegue durante esta revalidación.

## Verificación HTTP y aislamiento remoto - 2026-09-28

- DEV respondió `200` en portada, cuenta, moderación, manifest y Service
  Worker.
- Producción respondió `200` en portada, manifest y Service Worker.
- Solo el Service Worker DEV contiene `AccountPhaseTwoSections` y
  `KycModerationTab`; producción no contiene esos módulos exclusivos de Fase 2.
- La comprobación fue de solo lectura, sin escrituras ni cambios remotos.

## Versión DEV activa - 2026-09-28

- El historial de despliegues confirmó que
  `e8686ea6-137a-4d29-ad86-5039579eb8e3` permanece al **100% del tráfico DEV**.
- No hay una publicación posterior accidental en el Worker DEV.

## Dry-run de despliegue DEV - 2026-09-28

- El dry-run de Wrangler pasó con 64 assets, `PHASE2_ENABLED=true`,
  `RATE_LIMITER`, Turnstile y el origen DEV correctos.
- No publicó cambios ni modificó producción.

## Runbook de cierres externos - 2026-09-28

- Se creó `docs/FASE2_CIERRE_EXTERNO_RUNBOOK.md` con procedimientos
  reproducibles para Groq, KYC persistente y Push físico.
- Cada procedimiento incluye precondiciones DEV, criterio de éxito, evidencia,
  limpieza y rollback; ninguno autoriza cambios en producción.

## Deuda de complejidad separada - 2026-09-28

- El grafo confirma que la complejidad restante se concentra en los shells
  históricos `worker.ts` y `CubitatApp.tsx`.
- No corresponde a un entregable faltante de la propuesta; se conserva como
  refactorización posterior, modular y reversible, sin mezclarla con el cierre
  funcional de Fase 2.

## Auditoría React Doctor posterior - 2026-09-28

- La ejecución con conectividad autorizada escaneó 349 archivos y reportó 171
  incidencias: 7 de seguridad, 26 de mantenibilidad, 43 de rendimiento, 31 de
  bugs y 64 de accesibilidad.
- Tres avisos de escritura de campos de autorización siguen siendo
  contextuales: `notificationRead.ts` limita la fila por propietario,
  `AccountPhaseTwoSections.tsx` solo permite `buyer`/`agent` y el trigger evita
  elevaciones administrativas; `AccountPage.tsx` solo lee el rol.
- Tres avisos de RLS apuntan a las migraciones históricas de creación de
  `properties`, `property_reports` y `contacts`. La cadena posterior las
  reemplaza: `20260705000000_secure_properties_policies.sql`,
  `20260706003000_harden_properties_and_reports_policies.sql` y
  `20260711002000_harden_profiles_contacts_reports.sql` eliminan las políticas
  iniciales y aplican restricciones por usuario, publicación y administrador.
- Estos avisos no se suprimen todavía: la confirmación final requiere el dump
  o la matriz SQL contra el esquema DEV remoto. El hallazgo queda como
  pendiente de verificación, no como fallo confirmado del runtime actual.

## Corrección de previews KYC - 2026-09-28

- `useKycSubmission` ahora revoca inmediatamente la URL anterior al sustituir
  una evidencia y libera ambas URLs activas al desmontar el hook o limpiar el
  archivo.
- Se añadieron pruebas para reemplazo y desmontaje; la suite pasó de 597 a
  **599 pruebas** correctas.
- React Doctor conserva su aviso estático sobre `createObjectURL` porque no
  reconoce el cleanup gestionado mediante refs; el comportamiento está cubierto
  directamente por las pruebas y no se suprimió la regla.
- Los cuatro gates posteriores pasaron: lint, tests, build productivo aislado y
  build `phase2-dev` con 446 URLs DEV.

## Verificación de Docker y dump SQL - 2026-09-28

- El daemon Docker continúa ausente (`docker_engine` no está disponible), por
  lo que `supabase db dump --linked` y `supabase test db --linked` no pueden
  ejecutarse en este equipo.
- `supabase db dump --linked --schema public --dry-run` solo imprimió el script
  de `pg_dump`; no creó archivos, no escribió en Supabase y no se conservó
  ninguna credencial.
- La matriz SQL y la confirmación efectiva de RLS siguen pendientes hasta
  disponer de Docker o de una conexión SQL autorizada independiente.

## Reutilización de formateadores - 2026-09-28

- `audit-log/formatters.ts` reutiliza un `Intl.DateTimeFormat` por módulo.
- `exchangePreferences.ts` reutiliza un `Intl.NumberFormat` por módulo.
- La salida funcional no cambia; las pruebas focalizadas pasaron 12/12.
- Gates posteriores: lint, 136 archivos/599 pruebas, build productivo aislado y
  build `phase2-dev` correctos.
- No se desplegó porque es una optimización de cliente sin cambio de contrato
  remoto.

## Corte consolidado para retomar - 2026-09-28

Este bloque es la referencia más reciente cuando una sección anterior de esta
nota muestre una cifra histórica distinta:

- **Código local:** cambios modulares y reversibles en la rama
  `feature/phase2-dev-remote-bootstrap`; no se tocó producción.
- **Calidad actual:** lint correcto, **136 archivos y 600 pruebas correctas**,
  build productivo correcto y build `phase2-dev` correcto.
- **DEV publicado:** la versión `97259d81-46cd-42e9-a2d0-4784390d458b` recibe
  el 100% del tráfico del Worker DEV; las rutas públicas principales responden
  `200`.
- **Pruebas remotas públicas:** la revalidación más reciente de búsqueda,
  seguridad, Turnstile y navegación pasó **6/6**; una revalidación agrupada
  anterior pasó 7/7. La suite autenticada con mutaciones sigue sin ejecutarse
  por falta de credenciales QA autorizadas.
- **Pendiente prioritario:** configurar proveedores externos faltantes en DEV,
  empezando por `GROQ_API_KEY` si se quiere comprobar moderación IA real, y
  ejecutar pruebas autenticadas de contacto, correo y moderación.
- **Pendiente físico:** probar Push/PWA con Android e iOS, con la aplicación
  cerrada, verificando recepción, toque, navegación y lectura.
- **Pendiente de infraestructura:** ejecutar la matriz SQL/RLS cuando Docker o
  una conexión SQL autorizada estén disponibles.
- **Criterio de cierre:** no declarar Fase 2 terminada ni promover a producción
  hasta reunir esas evidencias y repetir los gates.

### Próximo bloque de trabajo

1. Mantener DEV como único entorno de cambios.
2. Resolver o documentar las variables externas sin registrar sus valores.
3. Ejecutar el flujo autenticado con cuentas QA y registrar resultados
   observables.
4. Completar la matriz Push/PWA en Android y dejar iOS explícitamente pendiente
   si no hay dispositivo disponible.
5. Repetir gates y auditoría pública antes de preparar cualquier promoción.

## Archivos de referencia

- [`RESUMEN_FASE2_ESTADO_ACTUAL.md`](RESUMEN_FASE2_ESTADO_ACTUAL.md): historial
  técnico detallado y evidencias acumuladas.
- [`FASE2_ESTADO.md`](FASE2_ESTADO.md): estado operativo y próximos bloques.
- [`MULTI_AGENT_HANDOFF.md`](MULTI_AGENT_HANDOFF.md): coordinación y handoff.
- `web/supabase/DATABASE_MIGRATIONS.md`: procedimiento de migraciones.
- `docs/DESPLIEGUE_COMPLETO.md`: despliegue, rollback y proveedores.

## Optimización del limpiador de rate limit - 2026-09-28

- `web/src/rate-limiter.ts` ya reúne las claves expiradas y las elimina con
  `Promise.all`, evitando esperas secuenciales durante el `alarm()` del Durable
  Object.
- Se conserva el mismo criterio de expiración, el manejo de entradas inválidas
  y el contrato de almacenamiento; la prueba existente de limpieza continúa
  cubriendo el comportamiento observable.
- Verificación posterior: lint correcto, **136 archivos y 599 pruebas
  correctas**, build productivo correcto y build `phase2-dev` correcto.
- Inicialmente no se desplegó porque era una optimización interna sin cambio de
  contrato remoto; después de completar los gates se publicó en DEV, como se
  registra en el bloque siguiente.

## Despliegue DEV posterior - 2026-09-28

- Se publicó la optimización del rate limiter únicamente en DEV mediante
  `npx wrangler deploy --config wrangler.phase2-dev.jsonc`.
- Versión desplegada: `efa97864-c8fe-4f3b-9bc3-51fd01ef6308`, con el 100% del
  tráfico DEV.
- Verificación read-only posterior: `/`, `/manifest.webmanifest` y `/sw.js`
  respondieron HTTP `200`.
- Producción no se desplegó ni se modificó.

## Auditoría estática posterior al rate limiter - 2026-09-28

- React Doctor sobre los archivos cambiados pasó de 15 a **14 incidencias**;
  desapareció el aviso de espera secuencial en el limpiador del rate limiter.
- Permanecen los avisos de complejidad de componentes existentes, el aviso de
  `setState` después de `await` en `CubitatApp`, el puntaje de supply chain y
  dos avisos estáticos sobre `createObjectURL` en KYC.
- Los avisos de KYC no se suprimen: la implementación revoca las URLs al
  reemplazar, limpiar o desmontar y las pruebas específicas cubren esos tres
  recorridos. Cambiar la forma del cleanup solo para satisfacer el analizador
  tendría más riesgo que beneficio en este bloque.

## Validación de parámetros del rate limiter - 2026-09-28

- `web/src/rate-limiter.ts` ahora normaliza `limit` como entero no negativo y
  `windowMs` como entero positivo; valores inválidos recuperan sus valores
  predeterminados sin crear ventanas `NaN`, cero o negativas.
- Se añadió una prueba específica para parámetros inválidos.
- Gates posteriores: lint correcto, **136 archivos y 600 pruebas correctas**,
  build productivo correcto y build `phase2-dev` correcto.
- DEV desplegado como `1b7173f2-e599-4ef8-8286-fea7ca46c5b2` con 100% del
  tráfico; `/`, `/manifest.webmanifest` y `/sw.js` respondieron HTTP `200`.
- Producción no fue desplegada ni modificada.

## Auditoría pública posterior al despliegue - 2026-09-28

- La suite E2E pública contra `https://cubitat1-phase2-dev.pochiprats18.workers.dev`
  pasó **6/6** en Chromium.
- Quedaron correctos los recorridos de navegación pública, búsqueda y filtros,
  proxy legítimo de Supabase, bloqueo de acceso directo con clave dummy,
  protección de moderación IA y protección de métricas internas.
- No se usaron credenciales ni se hicieron escrituras persistentes; esta
  evidencia confirma ausencia de regresión pública, pero no sustituye las
  pruebas autenticadas ni la prueba física de Push/PWA.

## Protección del efecto de carga inicial - 2026-09-28

- En `web/src/app/CubitatApp.tsx`, las actualizaciones de `loading` y `error`
  que ocurren después de leer la caché local ahora comprueban que el efecto
  siga activo; se evita actualizar estado después de un desmontaje.
- Gates posteriores: lint correcto, **136 archivos y 600 pruebas correctas**,
  build productivo correcto y build `phase2-dev` correcto.
- DEV desplegado como `97259d81-46cd-42e9-a2d0-4784390d458b` con 100% del
  tráfico.
- La auditoría E2E pública posterior pasó **6/6** en Chromium; producción no
  fue desplegada ni modificada.

## Revisión estática posterior - 2026-09-28

- React Doctor continúa reportando **14 incidencias** en el alcance cambiado.
- El aviso de `CubitatApp` sobre estado después de `await` permanece como
  diagnóstico estático: el flujo usa el flag `active` y ahora protege las
  actualizaciones posteriores a la lectura de caché; los gates y la auditoría
  E2E no muestran regresión.
- No se suprime el diagnóstico ni se hace una refactorización amplia del shell
  de la aplicación por este aviso; queda anotado para una revisión específica
  posterior si se necesita reducir la complejidad del componente.

## Revalidación de bloqueos externos - 2026-09-28

- `supabase test db --linked` volvió a quedar bloqueado antes de ejecutar la
  matriz porque Docker Desktop no expone
  `dockerDesktopLinuxEngine`; no se escribieron datos ni se modificó el
  esquema remoto.
- `npx wrangler secret list --config wrangler.phase2-dev.jsonc` confirmó por
  nombre que continúan presentes los secretos de Supabase, Resend, Push y
  métricas; `GROQ_API_KEY` sigue ausente.
- No se leyeron valores de secretos ni se hizo ninguna rotación. El trabajo
  continúa en DEV mientras se saltan estos bloqueos externos.

## Revalidación de esquema DEV - 2026-09-28

- `supabase db lint --linked --level warning`: **sin errores de esquema** en
  `extensions` y `public`.
- `supabase db push --linked --dry-run`: **Remote database is up to date**;
  no se aplicaron migraciones ni se escribieron datos.
- El CLI volvió a advertir únicamente sobre variables externas no cargadas
  (`SUPABASE_AUTH_CAPTCHA_SECRET`, `RESEND_API_KEY` y
  `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`).

## Checklist Push/PWA actualizada - 2026-09-28

- `docs/FASE2_PUSH_QA_FISICA.md` ahora referencia la versión DEV vigente
  `97259d81-46cd-42e9-a2d0-4784390d458b`.
- Se añadió una tabla de registro por dispositivo para Android e iOS con
  criterios observables de permiso, recepción con la app cerrada, navegación
  al tocar y retiro del aviso interno.
- El bloque permanece pendiente de verificación física; no se marcó como
  completado con pruebas de navegador de escritorio.

## Disponibilidad de QA autenticado - 2026-09-28

- El entorno actual no contiene `CUBITAT_E2E_EMAIL`,
  `CUBITAT_E2E_PASSWORD` ni `CUBITAT_E2E_ALLOW_MUTATIONS`.
- No se ejecutó el flujo autenticado con escrituras simuladas ni se inventaron
  cuentas de prueba; el escenario mantiene sus barreras de seguridad.
- El E2E público read-only continúa siendo la evidencia disponible, mientras
  publicación real, contacto, correo, alertas y moderación autenticada quedan
  pendientes de cuentas QA autorizadas y limpieza verificable.

## Revisión del workflow de calidad - 2026-09-28

- `.github/workflows/phase2-quality.yml` ya ejecuta en CI `npm ci`, auditoría
  de dependencias contra el registro oficial, lint, suite completa, build
  productivo con aislamiento y build `phase2-dev`.
- No se añadieron E2E remotos ni mutaciones al workflow: dependerían de
  proveedores, cuentas o datos externos y no son adecuados para este gate
  automático.

## Escaneo de patrones de secretos - 2026-09-28

- Se revisaron código y documentación buscando patrones de OAuth, JWT y
  service-role sin imprimir valores.
- No se encontraron credenciales runtime reales en el árbol operativo
  principal. Las coincidencias restantes son un ejemplo de variable en
  `docs/OPERACION.md` y un fallback JWT de desarrollo dentro de un worktree
  separado; no participan en el despliegue DEV ni en producción.
- No se modificaron credenciales, archivos de entorno ni secretos remotos.

## Distribución DEV revalidada - 2026-09-28

- `npx wrangler deployments list --config wrangler.phase2-dev.jsonc` confirmó
  que la versión `97259d81-46cd-42e9-a2d0-4784390d458b` continúa activa con
  **100% del tráfico DEV**.
- No se cambió el rollout ni se desplegó producción durante esta revisión.
- La Fase 2 queda en estado de avance continuo: código y gates locales están
  comprobados; las pruebas que dependen de Docker, proveedores externos,
  cuentas QA autenticadas y dispositivos físicos siguen pendientes.

## Gates obligatorios revalidados - 2026-09-28

- `npm run lint`: **correcto**.
- `npm run test:run`: **136 archivos y 600 pruebas correctas**.
- `npm run build`: **correcto**; el bundle productivo excluye los módulos
  exclusivos de Fase 2 y generó 446 URLs del sitemap productivo.
- `npm run build:phase2-dev`: **correcto**; la configuración DEV conserva sus
  orígenes y redirecciones, generó 446 URLs del sitemap DEV y el verificador
  confirmó la inclusión del módulo KYC.
- El primer intento del build DEV no pudo consultar el sitemap por el
  aislamiento de red del sandbox; se repitió con acceso de red autorizado y
  terminó correctamente. No se modificaron datos ni secretos.

## Reintento de matriz SQL/RLS - 2026-09-28

- `docker version` confirmó que el cliente está instalado, pero el daemon no
  está disponible: falta la tubería `docker_engine`.
- `supabase test db --linked` no pudo iniciar la matriz; además el CLI encontró
  un archivo local de telemetría sin permisos de escritura. No se aplicaron
  migraciones, no se escribieron datos y no se modificó la configuración del
  proyecto.
- El cierre de SQL/RLS permanece pendiente hasta que Docker esté operativo o
  exista una conexión SQL autorizada independiente.

## Auditoría de dependencias revalidada - 2026-09-28

- `npm audit --audit-level=high --registry=https://registry.npmjs.org` terminó
  con **0 vulnerabilidades**.
- El primer intento falló únicamente por la red y la caché restringidas del
  sandbox; la consulta repetida con acceso de red autorizado fue la evidencia
  usada para este estado.

## E2E público revalidado en DEV - 2026-09-28

- Se ejecutó contra `https://cubitat1-phase2-dev.pochiprats18.workers.dev`
  la suite pública y de seguridad con Chromium, un worker y sin mutaciones.
- Resultado: **6/6 pruebas correctas**.
- La evidencia cubre páginas principales, búsqueda y filtros, aislamiento del
  proxy frente a acceso directo, rechazo de moderación sin autorización y
  protección de métricas internas.
- No se crearon cuentas, publicaciones, contactos ni filas de prueba.

## Backend DEV revalidado - 2026-09-28

- `supabase migration list`: todas las migraciones locales y remotas están
  alineadas hasta `20260916010000`.
- `supabase db lint --linked --level warning`: **No schema errors found**.
- `supabase db push --linked --dry-run`: **Remote database is up to date**;
  no se aplicaron migraciones.
- El CLI solo volvió a advertir sobre variables externas no cargadas para
  CAPTCHA, Resend Auth y OAuth Google; no son diferencias del esquema DEV.

## Aislamiento de producción revalidado - 2026-09-28

- Se ejecutó la misma suite pública y de seguridad contra
  `https://cubitathome.com`, sin credenciales ni mutaciones.
- Resultado: **6/6 pruebas correctas**.
- Producción conserva sus rutas públicas, búsqueda y controles de seguridad;
  no se observaron superficies ni configuración exclusivas de Fase 2.
- La versión DEV se mantiene separada y no se hizo ningún despliegue a
  producción durante esta verificación.

## Distribución DEV confirmada nuevamente - 2026-09-28

- `npx wrangler deployments list --config wrangler.phase2-dev.jsonc` mostró
  como versión más reciente y activa `97259d81-46cd-42e9-a2d0-4784390d458b`,
  con **100% del tráfico**.
- La auditoría E2E de DEV y la lista de despliegues corresponden, por tanto,
  al mismo Worker activo; no se hizo rollback ni cambio de tráfico.

## Proveedores externos reconsultados - 2026-09-28

- `wrangler secret list --config wrangler.phase2-dev.jsonc` confirma que DEV
  conserva Supabase, Resend, Push y métricas; `GROQ_API_KEY` sigue ausente.
- `supabase secrets list` devuelve una lista vacía para el proyecto enlazado;
  no hay secretos de funciones disponibles para cerrar ese bloque por CLI.
- Solo se consultaron nombres y presencia. No se leyeron, copiaron ni
  modificaron valores sensibles.

## Guía OAuth DEV corregida - 2026-09-28

- `docs/OAuth-Google-Supabase.md` ahora separa explícitamente el callback
  histórico de producción del proyecto Supabase y Worker de Fase 2 DEV.
- La guía incluye las URLs vigentes de DEV y deja indicado que el secreto
  OAuth debe configurarse externamente, sin guardarlo en git.

## Smoke HTTP de PWA y aislamiento - 2026-09-28

- DEV respondió `200` en portada, `/mi-cuenta`, `/moderar`,
  `/manifest.webmanifest` y `/sw.js`.
- Producción respondió `200` en portada, `/manifest.webmanifest` y `/sw.js`.
- Las respuestas HTML revisadas no expusieron marcadores del Worker DEV en
  producción.
- La comprobación fue pública y de solo lectura; no creó sesiones, filas ni
  suscripciones Push.

## Arranque del Worker DEV revalidado - 2026-09-28

- `npx wrangler check startup --config wrangler.phase2-dev.jsonc` terminó sin
  errores.
- El bundle analizado fue de 87.69 KiB (20.71 KiB gzip) y el perfil local de
  arranque registró 22.1 ms.
- El perfil `.cpuprofile` temporal fue eliminado; no se conservan artefactos
  de diagnóstico en el repositorio.

## Endpoint Push revalidado - 2026-09-28

- DEV y producción respondieron `200` al `GET` de
  `/api/push/vapid-public-key` y devolvieron una clave pública.
- Ambos entornos respondieron `405` al `POST` inválido, confirmando el control
  de método del endpoint.
- Esta comprobación no creó suscripciones ni envió notificaciones; la prueba
  de recepción con la aplicación cerrada sigue reservada para Android/iOS.

## Pruebas focalizadas de Push - 2026-09-28

- Se ejecutaron `pushService`, `PushNotificationSettings`, el Service Worker
  Push y el enrutamiento del Service Worker.
- Resultado: **4 archivos y 27 pruebas correctas**.
- Quedan cubiertos por código el ciclo de suscripción, desuscripción, estado
  por dispositivo, recepción y navegación interna; falta únicamente la
  confirmación física de entrega con la aplicación cerrada.

## Checklist física de Push sincronizada - 2026-09-28

- `docs/FASE2_PUSH_QA_FISICA.md` ahora incluye la evidencia de 4 archivos y 27
  pruebas focalizadas, además de la comprobación HTTP del endpoint VAPID.
- Las filas Android e iOS permanecen pendientes y no se marcaron como
  aprobadas sin capturas de un dispositivo real.

## Verificación documental y anti-fraude focalizada - 2026-09-28

- Se ejecutaron las pruebas de verificación documental de propietario, panel
  administrativo, migración, reglas anti-duplicado, reportes y envíos públicos.
- Resultado: **9 archivos y 30 pruebas correctas**.
- La evidencia cubre el comportamiento modular de rechazo/reenvío, reportes y
  reglas server-side con datos sintéticos; no sustituye la prueba E2E con
  cuentas QA ni la revisión legal/manual.

## Autenticación focalizada revalidada - 2026-09-28

- Se ejecutaron las pruebas de configuración Auth, CAPTCHA, MFA, callback OAuth,
  recuperación de contraseña, parámetros de redirección y notificaciones de
  cuenta.
- Resultado: **7 archivos y 36 pruebas correctas**.
- El código mantiene cubiertos esos flujos; la validación con proveedores
  reales sigue pendiente de cargar OAuth/CAPTCHA/Resend Auth en DEV.

## Administración, KYC y agentes revalidados - 2026-09-28

- Se ejecutaron las pruebas focalizadas del panel administrativo, KYC,
  métricas, contexto del anunciante, agentes, avisos y tarjeta de moderación.
- Resultado: **15 archivos y 58 pruebas correctas**.
- Los avisos de `502` pertenecen a llamadas esperadas al backend simulado de
  la suite; no produjeron fallos de prueba ni escrituras remotas.

## Superficie pública y PWA revalidadas - 2026-09-28

- Se ejecutaron las pruebas de detalle, publicación, búsqueda, alertas,
  mapas, inicio, resultados y aviso de instalación PWA.
- Resultado: **22 archivos y 106 pruebas correctas**.
- Este carril no realizó mutaciones remotas; la prueba física de instalación y
  Push continúa separada para Android/iOS.

## Frontera de contacto y reportes revalidada - 2026-09-28

- En DEV y producción, `GET /api/public/contact` y
  `GET /api/public/report` respondieron `405`.
- En ambos entornos, un `POST` con JSON inválido respondió `400`.
- No se enviaron datos válidos ni se crearon contactos, reportes o filas
  remotas durante la comprobación.

## Revisión estructural del grafo - 2026-09-28

- El grafo identifica complejidad alta en los shells centrales `worker` y
  `CubitatApp`, además de la función de moderación de fondo.
- No se hizo una extracción amplia en este ciclo: cambiar esos contratos
  centrales no es necesario para cerrar los gates actuales y aumentaría el
  riesgo de regresión.
- Queda como deuda técnica independiente, separada de los pendientes
  operativos de proveedores, QA y dispositivos físicos.

## Credenciales QA reconsultadas - 2026-09-28

- `CUBITAT_E2E_EMAIL`, `CUBITAT_E2E_PASSWORD` y
  `CUBITAT_E2E_ALLOW_MUTATIONS` siguen ausentes en el entorno.
- No se ejecutaron publicaciones, contactos, moderación ni otras mutaciones
  persistentes con cuentas inventadas; las barreras de seguridad permanecen
  activas.

## Revalidación completa posterior - 2026-09-28

- Se repitieron los gates obligatorios: `npm run lint`, `npm run test:run`,
  `npm run build` y `npm run build:phase2-dev`.
- Resultado actual: lint correcto; **136 archivos / 600 pruebas correctas**;
  build productivo correcto con verificación de exclusión de Fase 2; build DEV
  correcto con configuración DEV, 446 URLs y verificación de inclusión de KYC.
- No se modificó código ni se desplegó producción durante esta revalidación.

## Revalidación remota posterior - 2026-09-28

- `supabase db lint --linked --level warning`: `No schema errors found` en
  `extensions` y `public`.
- `supabase db push --linked --dry-run`: `Remote database is up to date`; no
  se aplicaron migraciones ni escrituras.
- La consulta de despliegues DEV confirma la versión
  `97259d81-46cd-42e9-a2d0-4784390d458b` con **100%** del tráfico.
- Supabase mantiene advertencias por `SUPABASE_AUTH_CAPTCHA_SECRET`,
  `RESEND_API_KEY` y `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` ausentes; no se
  leyeron ni modificaron valores.

## Arranque del Worker DEV revalidado - 2026-09-28

- `npx wrangler check startup --config wrangler.phase2-dev.jsonc` terminó
  correctamente.
- Bundle analizado: 87.69 KiB (20.71 KiB gzip); perfil local de arranque:
  20.6 ms.
- El perfil temporal se eliminó después de la comprobación; no quedó artefacto
  generado en el repositorio.

## Auditoría de secretos en artefactos - 2026-09-28

- Se revisaron las referencias a `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`,
  `VAPID_PRIVATE_KEY`, `RESEND_API_KEY` y valores de prueba dentro de `web/src`,
  scripts, documentación y artefactos compilados.
- Las referencias privadas quedaron limitadas al Worker, pruebas o scripts de
  operación; `web/dist` no contiene esos identificadores ni valores de prueba.
- No se leyeron, imprimieron ni modificaron valores secretos.

## Guard automatizado de secretos en build - 2026-09-28

- Se añadió `scripts/verify-private-secret-bundle.mjs` y se incorporó a
  `build` y `build:phase2-dev`.
- El guard inspecciona todos los archivos compilados y falla si encuentra
  marcadores de `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`,
  `VAPID_PRIVATE_KEY`, `RESEND_API_KEY` o valores de prueba privados.
- Producción y DEV pasaron el nuevo guard en esta revalidación.

## Modularización de moderación IA - 2026-09-28

- Se extrajo la moderación en segundo plano a
  `web/src/worker/ai-moderation.ts`, dejando el `worker.ts` como orquestador de
  autenticación, límites y respuesta `202`.
- Se conservaron los contratos de fallback manual, imágenes multimodales,
  respuesta JSON y RPC con service role; el carril pasó 53/53 pruebas.
- Suite completa: **136 archivos / 600 pruebas correctas**. Builds productivo y
  DEV correctos con aislamiento y guard de secretos.
- El cambio permanece en la rama de trabajo; no se desplegó a producción.

## ADR de fronteras modulares - 2026-09-28

- Se creó `docs/ADR-002-Fase2-fronteras-modulares.md` para fijar los límites
  entre el router del Worker, moderación IA, Push, KYC, envíos, métricas y
  verificación.
- El ADR deja explícito el contrato reversible DEV/producción y los criterios
  que aún impiden promoción.

## Verificador de Auth DEV endurecido - 2026-09-28

- El build DEV valida ahora las referencias seguras de Turnstile, Resend SMTP
  y Google OAuth, además de las URLs y expiración ya cubiertas.
- Esto detecta regresiones de configuración sin leer secretos ni simular que
  los proveedores externos están habilitados.
- Lint, suite completa y ambos builds pasaron tras el cambio.

## Trust Score auditado - 2026-09-28

- El Trust Score permanece limitado a la migración DEV y no se expone en la
  UI pública ni en resultados.
- La decisión pendiente es de producto: definir semántica, audiencia y
  criterios antes de habilitarlo.

## Aislamiento del workflow CI - 2026-09-28

- `.github/workflows/phase2-quality.yml` solo ejecuta instalación, auditoría,
  lint, pruebas y builds productivo/DEV.
- No invoca `wrangler deploy` ni `supabase db push`; ningún push o PR puede
  promover Fase 2 a producción desde ese workflow.
- Los comandos de despliegue permanecen como operaciones manuales separadas.

## Revalidación de gates posterior - 2026-09-28

- `npm run lint`: correcto.
- `npm run test:run`: **136 archivos y 600 pruebas correctas**. Los avisos de
  Turnstile y respuestas `502` pertenecen a escenarios simulados y no cambiaron
  el resultado terminal de la suite.
- `npm run build`: correcto. El verificador confirmó que el bundle productivo
  excluye los módulos exclusivos de Fase 2, el Worker productivo aislado y los
  marcadores de secretos privados.
- `npm run build:phase2-dev`: correcto. El verificador confirmó el origen,
  redirects y referencias de secretos por entorno; el bundle DEV incluye KYC y
  generó 446 URLs del sitemap DEV sin marcadores privados.
- Esta revalidación fue local y no constituye un despliegue ni una promoción a
  producción. Producción permanece intacta.

## Corrección de clave estable en tarjetas - 2026-09-28

- `PropertyCard` usa ahora la URL de imagen deduplicada como clave del
  carrusel, eliminando el uso del índice del array sin cambiar la interacción
  ni el orden de las fotos.
- Prueba focalizada de resultados: **9/9**.
- Suite completa: **136 archivos y 600 pruebas correctas**; lint y ambos builds
  correctos.
- React Doctor dejó de reportar el aviso `no-array-index-as-key` para
  `PropertyCard`. La ejecución completa conserva 168 avisos; el alcance de
  cambios muestra 14 avisos ya conocidos, incluido el hallazgo de dependencia
  externa y deuda técnica no bloqueante.
- El cambio permanece local en la rama DEV; no se desplegó ni modificó
  producción.

## Verificación remota de estructuras DEV - 2026-09-28

- Consulta SQL remota de solo lectura mediante Supabase CLI confirmó en DEV las
  tablas `kyc_requests`, `property_verification_requests` y
  `property_duplicate_flags`.
- Confirmó también `get_property_trust_score`, `submit_property_verification`
  y `review_property_verification`, además de los triggers de señales de
  duplicados en `properties`.
- `pg_policies` devolvió políticas para propietarios y administradores AAL2 en
  las tablas de verificación y duplicados. No se leyeron filas de usuarios ni
  se ejecutaron escrituras.
- Una segunda consulta confirmó `relrowsecurity = true` en las tres tablas;
  `relforcerowsecurity` permanece en `false`, coherente con el diseño de
  políticas por rol y funciones protegidas.
- Este bloque mejora la evidencia del esquema DEV; no implica promoción a
  producción. La consulta completa de pruebas transaccionales RLS sigue
  condicionada a Docker o a una conexión SQL autorizada para `pg_prove`.

## Prueba remota de duplicados - 2026-09-28

- `supabase/tests/property_duplicate_rules.sql` pasó contra DEV mediante
  Supabase CLI dentro de `BEGIN`/`ROLLBACK`.
- Se verificó la creación de la señal, su resolución al aprobar y su reapertura
  al devolver la propiedad a revisión.
- Una consulta posterior confirmó `0` propiedades QA y `0` flags QA con los
  identificadores de la prueba; no quedaron datos persistentes.
- El bloque de reglas de duplicados queda técnicamente verificado en DEV. No se
  promovió a producción.

## Matriz de seguridad DEV: corrección y alcance - 2026-09-28

- La prueba SQL detectó y corrigió una aserción de notificaciones: la cuenta
  secundaria debe salir del rol autenticado antes de comprobar el valor, porque
  RLS oculta correctamente la fila ajena.
- La matriz completa no puede ejecutarse mediante el endpoint remoto tal como
  está escrita porque su helper PL/pgSQL `assert_raises` no conserva el
  contexto de rol del wrapper SQL para algunos errores esperados.
- La comprobación directa remota confirmó que las funciones server-only
  `claim_pending_alert_emails`, `increment_contact_clicks`,
  `claim_kyc_evidence_for_purge` y `complete_kyc_evidence_purge` tienen
  `authenticated_execute = false` y `service_role_execute = true`.
- La llamada directa a `claim_pending_alert_emails` como `authenticated`
  devolvió `permission denied`. El cierre de la matriz completa queda pendiente
  de `supabase test db` con Docker/local pgTAP, sin cambiar políticas a ciegas.

## Clasificación de aviso KYC - 2026-09-28

- React Doctor mantiene dos avisos `no-create-object-url-without-revoke` en
  `useKycSubmission`.
- La revisión del código confirmó revocación al reemplazar cada archivo,
  limpieza explícita al quitarlo y revocación adicional al desmontar el hook.
- Se clasifica como falso positivo contextual; no se suprimió la regla ni se
  modificó el flujo de evidencias.

## Modularización del estado de notificaciones Push - 2026-09-28

- Se extrajeron `PushNotificationStatus` y `getPushNotificationStatusMessage`
  a `web/src/modules/notifications/push/pushNotificationStatus.ts`.
- `PushNotificationSettings` conserva el comportamiento y queda con una
  presentación más simple; el mapeo de estados se prueba de forma aislada.
- Prueba focalizada: **2 archivos y 14 pruebas correctas**.
- Gates posteriores: lint correcto; suite completa **137 archivos y 608 pruebas
  correctas**; build productivo correcto; build `phase2-dev` correcto,
  incluyendo verificación de configuración, bundle KYC, sitemap de 446 URLs y
  ausencia de marcadores de secretos privados.
- El cambio permanece en la rama DEV; no se desplegó ni modificó producción.

## Publicación DEV y comprobación HTTP - 2026-09-28

- El Worker aislado `cubitat1-phase2-dev` se publicó con la versión
  `46d27ca2-9d43-4ebc-b955-3b800f273f8e`.
- El `dry-run` confirmó 64 archivos, el Durable Object `RATE_LIMITER` y el
  binding de Turnstile antes de publicar.
- Las comprobaciones HTTP externas devolvieron `200` para `/`,
  `/manifest.webmanifest` y `/sw.js`. No se modificó producción.

## Revisión React Doctor posterior - 2026-09-28

- El alcance de cambios quedó en **12 incidencias**: una alerta de cadena de
  suministro de Socket, ocho advertencias de complejidad, un estado después
  de `await` en un efecto y dos avisos de URLs temporales KYC.
- No apareció ninguna incidencia nueva en el módulo de Push. Los avisos KYC
  siguen clasificados como falsos positivos contextuales por sus revocaciones
  explícitas; la complejidad de los shells centrales queda como deuda técnica
  separada para no mezclar refactors de mayor riesgo con el despliegue DEV.

## Modularización del aviso PWA - 2026-09-28

- La vista de instalación se separó en
  `web/src/components/layout/PWAInstallToast.tsx`; el controlador conserva los
  eventos `beforeinstallprompt`, iOS, instalación previa y recordatorio de
  siete días.
- La prueba focalizada PWA pasó **10/10** y la suite completa volvió a pasar
  **137 archivos y 608 pruebas**.
- Lint, build productivo y build DEV correctos. El Worker DEV se actualizó a
  `4d7bc661-7203-4ad1-85ac-e91680c1dc62`; `/`, el manifest y `/sw.js`
  respondieron `200` después del despliegue.
- Producción sigue intacta.

## Revalidación de backend DEV - 2026-09-28

- `supabase migration list --linked` confirmó las migraciones local/remoto
  alineadas hasta `20260916010000`.
- `supabase db lint --linked --level warning` devolvió `No schema errors found`.
- La comprobación fue de solo lectura y no ejecutó escrituras. La matriz
  transaccional pgTAP continúa pendiente únicamente por el bloqueo de Docker.

## Protección de ciclo de vida en notificaciones - 2026-09-28

- `useNotifications` ahora ignora respuestas tardías de sesión y eventos de
  autenticación después de desmontar el hook, evitando actualizaciones de
  estado fuera de su ciclo de vida.
- Prueba enfocada: **3/3**; suite completa: **137 archivos y 608 pruebas**.
- Lint, build productivo y build DEV correctos.
- DEV actualizado a `d45c21a7-2ac9-465d-935c-7637820c50a0`; los recursos `/`,
  `/manifest.webmanifest` y `/sw.js` respondieron `200`. Producción intacta.

## E2E público DEV posterior al despliegue - 2026-09-28

- Auditoría remota sin credenciales ni escrituras persistentes: **7/7**.
- Pasaron navegación pública, resultados, búsqueda/filtros, Turnstile,
  seguridad del proxy, métricas sin sesión admin y moderación IA con token
  inválido.
- La evidencia confirma el comportamiento público del Worker DEV actual; no
  implica validación de flujos autenticados ni promoción a producción.

## E2E público de producción - 2026-09-28

- La misma auditoría pública sin credenciales ni escrituras pasó **7/7** en
  `https://cubitathome.com`.
- Producción conserva navegación, resultados, búsqueda/filtros, Turnstile y
  fronteras de seguridad operativas. No se desplegó ni modificó producción.

## Modularización de proveedores OAuth - 2026-09-28

- Los botones Google/Facebook y sus iconos se separaron en
  `web/src/modules/auth/components/OAuthProviderButtons.tsx`; `LoginModal`
  conserva toda la lógica de OAuth, captcha y mensajes de error.
- Pruebas enfocadas del carril Auth: **10/10**; lint y ambos builds correctos.
- React Doctor mantiene 12 incidencias y no reportó una nueva por esta
  extracción; la complejidad restante pertenece al formulario completo.
- DEV actualizado a `e8686ea6-137a-4d29-ad86-5039579eb8e3`; `/`, el manifest y
  `/sw.js` respondieron `200`. Producción intacta.

## E2E OAuth público - 2026-09-28

- Se añadió una aserción remota para que Google sea visible y Facebook permanezca
  deshabilitado en el modal.
- El flujo E2E de Turnstile/Auth pasó **1/1 en DEV** y **1/1 en producción**.
- La suite Vitest quedó en **137 archivos y 608 pruebas**; lint y ambos builds
  pasaron después del cambio.
## Revalidación real de Groq en DEV - 2026-09-28

- `GROQ_API_KEY` quedó registrado en el Worker Phase 2 DEV; el valor no se
  incorporó al repositorio ni a la documentación.
- La reevaluación se probó desde el panel administrativo con el anuncio QA
  `Departamento en venta en Playa` (`07a82ef2-3723-45f9-8950-4cb8ec765a46`).
- La tarjeta cambió en vivo de pendiente a `Rechazada por IA`, mostró el motivo
  generado por Groq y el aviso de finalización sin recargar la página.
- El anuncio fue aprobado después para restaurar el estado previo. DEV quedó
  con 9 publicaciones y sin pendientes/rechazos; producción no se tocó.
- Groq queda cerrado como pendiente de DEV. Siguen abiertos KYC persistente,
  Push físico Android/iOS, SQL/RLS con Docker y las configuraciones externas
  restantes.

## Revisión inicial de fixture KYC - 2026-09-28 (antes de la prueba)

- DEV tiene perfiles con estados `unverified` y `verified`, pero no tiene
  evidencias KYC almacenadas en los buckets previstos.
- En ese punto inicial no se habían fabricado documentos ni forzado un estado;
  el cierre quedó pendiente hasta disponer de fixtures QA autorizados.

## Prueba KYC sintética DEV - 2026-09-28

- Fixtures creados en `tmp/kyc-qa/qa-document.png` y
  `tmp/kyc-qa/qa-selfie.png`; ambos llevan la marca visible `QA - NO VALIDO`.
- La cuenta DEV de prueba envió la solicitud y el panel KYC mostró las dos
  evidencias pendientes.
- La moderación rechazó la solicitud con un motivo de QA. El panel quedó sin
  pendientes y la cuenta reflejó `Solicitud Rechazada` sin recargar.
- KYC queda cerrado para el flujo sintético de DEV. No se aprobó una identidad
  y no hubo cambios en producción.
