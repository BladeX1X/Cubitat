# Cubitat - Resumen actual de Fase 2

Fecha de corte: 2026-09-28  
Rama de trabajo: `feature/phase2-dev-remote-bootstrap`  
Entorno de pruebas: `cubitat1-phase2-dev`  
Proyecto Supabase DEV: `bknwerqbbysveehcdmzr`

## Alcance y regla operativa

La Fase 2 se mantiene modular y reversible. Las capacidades nuevas se prueban
en DEV; producción permanece aislada y no se despliega automáticamente.

## Lo que ya se hizo

### Plataforma y aislamiento

- Se creó y mantiene un Worker DEV separado para Fase 2.
- El build productivo excluye los módulos y jobs exclusivos de Fase 2.
- El build DEV incluye KYC, agentes, métricas y las capacidades adicionales.
- El sitemap productivo y el sitemap DEV usan sus respectivos orígenes.
- Se mantienen verificadores automáticos para evitar fugas de configuración,
  rutas, módulos o jobs de Fase 2 hacia producción.

### Autenticación y seguridad

- OAuth Google, callback, recuperación de contraseña y expiración de enlaces.
- Mensajes seguros para errores de OAuth, PKCE, CAPTCHA, correo y tokens.
- MFA/AAL2, roles administrativos y barreras de acceso por rol.
- Rate limiter en Durable Object, ahora con almacenamiento tipado y validación
  de registros corruptos.
- Turnstile con contrato tipado para `window.turnstile`.
- Límites de error tipados en `LoginModal`, `AuthCallbackPage`, `CubitatApp`,
  favoritos y detalle de propiedad.
- `CubitatApp` valida el rol recibido desde `profiles` antes de aplicarlo y
  conserva un mensaje seguro cuando falla la carga de propiedades.

### Publicaciones, permutas y moderación

- Preferencias estructuradas para permutas: tipo buscado, provincia,
  municipio, habitaciones, área, notas y ajuste económico.
- Compatibilidad con datos antiguos de permutas y resumen visible en detalle.
- Moderación de propiedades, revaluación IA, revisión manual y estados de
  publicación.
- KYC, verificación documental, Trust Score y panel administrativo modular.
- Reportes, bitácora de auditoría, métricas y contexto del anunciante.

### Notificaciones y PWA

- Bandeja interna de notificaciones con lectura y retiro del pendiente.
- Web Push, persistencia de suscripciones y click seguro hacia rutas internas.
- Aviso de instalación PWA para Android, iOS y escritorio.
- El aviso "Quizás luego" vuelve a mostrarse después de siete días.
- Pruebas del instalador PWA corregidas para esperar correctamente las acciones
  asíncronas.

### Contacto, correo y operación

- Contacto público con Turnstile, RPC confiable y mensajes seguros.
- Dispatcher de alertas por correo con idempotencia, reintentos y aislamiento
  de DEV.
- Reenvío de confirmación con respuesta controlada cuando falta proveedor.
- Documentación técnica y handoff actualizados después de cada bloque.

## Evidencia verificada

- `npm run lint`: correcto.
- `npm run test:run`: **136 archivos y 597 pruebas correctas**.
- `npm run build`: correcto; aislamiento del bundle productivo verificado.
- `npm run build:phase2-dev`: correcto; KYC incluido y sitemap DEV con 446
  URLs.

## Últimos avances comprobados — 2026-09-28

- `usePublicationDraft` dejó de mutar referencias durante el render; el flujo
  de publicación conserva su comportamiento y pasó la prueba focalizada 3/3.
- El endpoint de métricas del Worker comprueba `response.ok` antes de leer la
  respuesta GraphQL y tiene regresión para upstream 503.
- El aviso administrativo ahora expone correctamente el nombre y la
  descripción del `alertdialog`; la prueba focalizada pasó 1/1.
- La auditoría pública contra DEV pasó 1/1; el tramo autenticado quedó
  preparado para ejecutarse cuando se proporcionen credenciales E2E explícitas.
- React Doctor quedó en **175 incidencias**. Desaparecieron los avisos de
  mutación de refs, respuesta HTTP sin comprobar, nombre accesible del aviso y
  estado de carga KYC fuera de `finally`.
  Los 7 errores de seguridad/RLS requieren verificar políticas activas y no se
  han suprimido ni cambiado migraciones a ciegas.
- DEV desplegado en la versión
  `a57e1d1c-1c1f-47b0-9423-1b4eedf7640f`; `/`, `/moderar`, `/mi-cuenta`,
  `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200. Producción sigue
  intacta.
- El CLI se recuperó usando `SUPABASE_HOME` temporal dentro del workspace:
  `supabase db lint --linked --level warning` devolvió `No schema errors found` y
  `supabase migration list` confirmó coincidencia local/remota hasta
  `20260916010000`.
- El volcado SQL completo sigue pendiente porque `supabase db dump --linked`
  requiere el daemon Docker local, que no está disponible. No se modificó el
  esquema remoto.

## Robustez del envío KYC — 2026-09-28

- El formulario KYC conserva el mensaje específico cuando falla la compresión
  local y ahora recupera excepciones inesperadas de almacenamiento o RPC sin
  quedarse bloqueado en estado de carga.
- Se limpian las evidencias ya subidas cuando un paso posterior falla.
- Pruebas focalizadas: **13/13**; suite completa: **136 archivos y 597
  pruebas**.
- `lint`, `build` y `build:phase2-dev` pasaron. El build DEV generó 446 URLs
  de sitemap y verificó el bundle de Fase 2.
- Se desplegó solo DEV como versión
  `2ef50ca4-e1b5-4562-9623-26a17a8344c5`; las rutas `/`, `/mi-cuenta`,
  `/moderar`, `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200.
- Producción continúa intacta.

## Accesibilidad del buscador de moderación — 2026-09-28

- El buscador de propiedades del panel administrativo ahora tiene una etiqueta
  asociada y ya no depende solo del placeholder.
- React Doctor posterior quedó en **175 incidencias** y bajó un aviso de
  accesibilidad.
- DEV desplegado como versión
  `bb95caed-a36f-46f5-9819-df6dc96ae6ce`; `/`, `/moderar`,
  `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200.
- Producción continúa intacta.

## Auditoría pública DEV posterior — 2026-09-28

- `comprehensive-audit.spec.ts` pasó **1/1** contra
  `https://cubitat1-phase2-dev.pochiprats18.workers.dev` en Chromium.
- La auditoría cubre Inicio y Resultados sin credenciales ni escrituras
  persistentes; el tramo autenticado continúa condicionado a credenciales E2E
  explícitas.
- `supabase migration list`: migraciones locales y remotas coinciden hasta
  `20260916010000`.
- `supabase db push --linked --dry-run`: `Remote database is up to date` en
  DEV; no se aplicaron migraciones. El wrapper npm local no tiene binario para
  `win32-x64`, por lo que se usó el CLI Supabase instalado en el sistema.
- Se añadió una regresión del Worker para una respuesta SEO malformada; la
  prueba devuelve una respuesta segura `404` sin propagar datos inválidos.
  Este cambio solo amplía cobertura y no requiere un nuevo despliegue.
- Auditoría de TODOs en los carriles de administración, KYC, agentes, Push y
  autenticación: no quedan tareas técnicas explícitas sin atender; los
  pendientes restantes son proveedores, dispositivos, contenido o revisión
  humana.
- `supabase db lint --linked --level warning`: `No schema errors found`.
- Último despliegue DEV: `c451aa01-9194-4bf1-9bbb-b5336f6117c9`.
- Ese despliegue incluye el endurecimiento de `CubitatApp`, el contrato tipado
  de Turnstile, la eliminación de accesos `any` en filtros, amenidades y
  navegación del detalle, y la validación del JSON remoto usado por SEO. El
  dry-run fue correcto, las rutas principales respondieron HTTP 200 y una
  propiedad DEV real generó `title` y `og:title` dinámicos correctamente.
- Rutas DEV verificadas con HTTP 200:
  - `/`
  - `/auth/callback`
  - `/mi-cuenta`
  - `/moderar`
  - `/manifest.webmanifest`
  - `/sw.js`
- Producción (`https://cubitathome.com`) no fue modificada durante este ciclo.

## Corrección del borrador y despliegue DEV — 2026-09-28

- `usePublicationDraft` actualiza sus refs en efectos comprometidos, evitando
  mutaciones durante el render sin cambiar el contrato de guardado local.
- Prueba focalizada: 3/3; suite completa: 135 archivos y 594 pruebas.
- `npm run audit:react` bajó de 181 a 179 incidencias y dejó de reportar la
  mutación de refs. Los avisos restantes de autorización/RLS siguen sujetos a
  revisión del esquema activo.
- `npm run lint`, `npm run build` y `npm run build:phase2-dev` pasaron.
- Dry-run y despliegue del Worker DEV correctos. Versión:
  `779aad98-9f56-4900-b690-9ca21ec303f1`.
- DEV respondió HTTP 200 en `/`, `/mi-cuenta`, `/publicar`,
  `/manifest.webmanifest` y `/sw.js`. Producción permanece intacta.
- E2E remoto posterior al despliegue: `publish.spec.ts` pasó **1/1** contra
  la nueva versión DEV; la prueba solo usa sesión simulada y borrador local.
- Revalidación remota agrupada posterior al despliegue: búsqueda, seguridad,
  Turnstile y publicación pasaron **7/7**; no hubo escrituras persistentes.
- La auditoría de navegación ahora separa el tramo público del autenticado;
  contra DEV pasó **1/1** para Home y Resultados públicos. El tramo autenticado
  queda anotado como pendiente por falta de credenciales E2E, sin inventarlas.

## Accesibilidad del aviso administrativo — 2026-09-28

- `AdminNoticeDialog` ahora expone correctamente su título y mensaje mediante
  `aria-labelledby` y `aria-describedby`.
- Se añadió una prueba accesible del `alertdialog`; suite completa: 136 archivos
  y 596 pruebas.
- Lint, build productivo y build DEV pasaron. DEV se desplegó como
  `a57e1d1c-1c1f-47b0-9423-1b4eedf7640f`.
- `/`, `/moderar`, `/mi-cuenta`, `/manifest.webmanifest` y `/sw.js` respondieron
  HTTP 200. Producción permanece intacta.

## Estado de la revalidación Supabase — 2026-09-28

- La telemetría del perfil predeterminado sigue presentando `EPERM`, pero el
  CLI funcionó con `SUPABASE_HOME` temporal dentro del workspace.
- `supabase migration list` confirmó alineación hasta `20260916010000` y
  `supabase db lint --linked --level warning` devolvió `No schema errors found`.
- `supabase db push --linked --dry-run` devolvió `Remote database is up to
  date`; no se aplicaron migraciones.
- `supabase db dump --linked --schema public` continúa pendiente únicamente por
  la ausencia de `dockerDesktopLinuxEngine`; no se tocó Docker ni el esquema.

## Robustez del endpoint de métricas — 2026-09-28

- El Worker ahora comprueba `response.ok` antes de interpretar la respuesta de
  Cloudflare GraphQL; los errores upstream se convierten en un estado seguro de
  métricas, sin tratar el cuerpo de error como datos.
- Se añadió una regresión específica; la prueba del Worker pasó 53/53 y la
  suite completa pasó 135/595.
- Lint, build productivo y build DEV pasaron. DEV se desplegó como
  `01798924-988a-43df-8a19-167ee8df626e`.
- E2E remoto de seguridad posterior al despliegue: **4/4**. Producción sigue
  intacta.
- La auditoría React posterior quedó en **178 incidencias** y dejó de reportar
  la respuesta `fetch` sin comprobación de estado. El aviso de
  `createObjectURL` en KYC se conserva como falso positivo contextual: el hook
  revoca sus URLs en cleanup al cambiar y desmontar.

## Revalidación remota de Supabase DEV — 2026-09-28

- `supabase migration list` confirmó que las migraciones locales y remotas están
  alineadas hasta `20260916010000`.
- `supabase db lint --linked --level warning` devolvió `No schema errors found`.
- No se ejecutaron escrituras de esquema ni cambios en producción.

## Inventario de secretos DEV — 2026-09-28

- `wrangler secret list --config wrangler.phase2-dev.jsonc` confirmó la
  presencia nominal de Resend, Supabase service role y VAPID.
- `GROQ_API_KEY` no está configurada en DEV. La moderación conserva el estado
  `pending_review` y deriva a revisión manual; no se imprimieron ni copiaron
  secretos.

## E2E local y dependencia de Supabase — 2026-09-28

- `npm run test:e2e` ejecutó 11 escenarios: el flujo local de publicación pasó
  correctamente.
- Los escenarios restantes que necesitan backend fallaron porque el entorno
  local no tiene Supabase iniciado en `127.0.0.1:54321`; el proxy devolvió
  `502`/`ECONNREFUSED` y el servidor Vite terminó cerrándose.
- La prueba de acceso directo a Supabase también quedó limitada por la red del
  entorno (`EACCES`), no por una respuesta insegura del Worker.
- No se cambió el código para ocultar estos fallos: quedan documentados como
  pruebas E2E condicionadas a Docker/Supabase local o conectividad autorizada.
- La comprobación `docker ps` confirmó que el daemon `docker_engine` no está
  disponible en este equipo; no se intentó reiniciar ni modificar Docker.

## E2E remoto contra DEV — 2026-09-28

- Playwright acepta `CUBITAT_E2E_BASE_URL`; sin esa variable conserva
  `localhost:5173` y levanta Vite local. Con ella usa un entorno externo sin
  iniciar servicios locales.
- Se actualizó el escenario de búsqueda para los selectores estructurados de
  provincia/municipio y las rutas SEO canónicas.
- Prueba remota de solo lectura contra DEV: **1/1 pasada**.
- Los cambios fueron únicamente de pruebas/configuración; no requirieron otro
  despliegue del Worker.

## E2E remoto adicional de seguridad y Turnstile — 2026-09-28

- Turnstile, contacto, reporte, registro y recuperación: **1/1 pasada** contra
  DEV remoto.
- Seguridad del proxy, anon key, moderación sin token y métricas sin admin:
  **4/4 pasadas** contra DEV remoto.
- `security.spec.ts` acepta `CUBITAT_E2E_BASE_URL` y
  `CUBITAT_E2E_SUPABASE_URL`, sin fijar el entorno a localhost.
- Gates posteriores: lint correcto, **135 archivos y 594 pruebas**, build
  productivo aislado y build DEV correcto. No hubo despliegue adicional.

## E2E remoto del asistente de publicación — 2026-09-28

- El escenario `publish.spec.ts` pasó **1/1** contra DEV remoto.
- La prueba usa sesión simulada y verifica el asistente, los pasos de datos y
  el guardado de borrador local; no crea una propiedad persistente.
- Quedan fuera de este escenario las pruebas de publicación real, correo, Push,
  cuentas persistentes y dispositivos físicos.

## Auditoría de calidad y seguridad — 2026-09-28

- `npm run audit:react` terminó correctamente y dejó un inventario para la
  siguiente pasada de endurecimiento. Después de corregir el hook del borrador,
  React Doctor pasó de 181 a 179 incidencias y dejó de reportar la mutación de
  refs durante el render.
- `usePublicationDraft` ahora actualiza `restoreRef` y `latest` en efectos
  comprometidos; la prueba focalizada pasó 3/3 y la suite completa pasó
  135/594.
- Los hallazgos prioritarios que quedan para revisar son tres posibles
  escrituras de autorización desde cliente y tres políticas RLS históricas que
  permiten inserciones públicas.
- Las dos mutaciones de `ref` quedaron resueltas. Los hallazgos restantes no
  se marcaron como vulnerabilidades confirmadas:
  primero hay que contrastarlos con las migraciones posteriores, triggers,
  RPC y políticas activas del proyecto DEV. No se modificaron políticas ni
  roles basándose únicamente en el informe automático.
- La cadena de migraciones confirma que contactos y reportes ya no aceptan
  inserciones directas de clientes y solo entran por RPC protegidas por
  `service_role`; las notificaciones limitan la actualización al propio
  `user_id`; y el trigger DEV impide activar `agent` sin KYC `verified`.
- Por tanto, esos avisos se consideran cubiertos por diseño en el código
  versionado, pero no se elevan a evidencia de esquema activo hasta poder
  ejecutar el volcado remoto con Docker disponible.
- El resto del informe son avisos de accesibilidad, complejidad, estilo y
  pruebas antiguas; quedan fuera del siguiente bloque salvo que aparezca un
  impacto funcional reproducible.

### Verificación del esquema activo

- Se intentó obtener el esquema público remoto con `supabase db dump --linked`
  desde el proyecto DEV vinculado.
- El CLI requiere el daemon local de Docker para ejecutar el contenedor de
  volcado y devolvió `dockerDesktopLinuxEngine` no disponible. No se cambió el
  enlace, no se tocó Docker y no se aplicaron migraciones.
- La revisión queda pendiente de una ejecución con Docker disponible o una
  consulta SQL remota autorizada; hasta entonces se conserva como evidencia la
  cadena de migraciones, `supabase migration list` y `supabase db lint`.

## Aislamiento de verificación documental y despliegue DEV — 2026-09-28

- El verificador del bundle productivo detectó que `MyPropertiesPage` cargaba
  estáticamente `PropertyVerificationPanel`, incorporando la tabla de
  verificación documental en producción aunque el módulo pertenece a Fase 2.
- `PropertyVerificationPanel` ahora se carga de forma diferida solo cuando
  `import.meta.env.DEV` o `VITE_PHASE2_UI_ENABLED` está activo. La UI continúa
  disponible en DEV y queda fuera del bundle productivo.
- Se ampliaron los marcadores de aislamiento para cubrir
  `AccountPhaseTwoSections`, `PropertyVerificationModerationTab`,
  `get_property_trust_score` y `property_verification_requests`.
- `npm run lint`: correcto; `npm run test:run`: **135 archivos y 594 pruebas**;
  `npm run build`: correcto, con verificación de aislamiento productivo;
  `npm run build:phase2-dev`: correcto, con KYC y 446 URLs del sitemap DEV.
- Se desplegó únicamente DEV como
  `c451aa01-9194-4bf1-9bbb-b5336f6117c9`. `/`, `/auth/callback`, `/mi-cuenta`,
  `/moderar`, `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200.
- Producción continúa intacta. Fase 2 sigue abierta por proveedores reales,
  QA físico de Push/PWA y revisión legal/contenido.

## Lo que sigue pendiente

### Requiere configuración o proveedor externo

- Configurar y probar `GROQ_API_KEY` en DEV para una moderación IA remota real.
- Ejecutar una entrega controlada de correo con proveedor real y destinatario
  verificable.
- Confirmar configuración externa de OAuth Google y Turnstile en los entornos
  definitivos.
- Rotar secretos comprometidos o caducados cuando corresponda, sin copiarlos
  al repositorio ni a esta documentación.

### Requiere dispositivos o revisión humana

- QA físico de Push en Android y iOS: recepción con la app cerrada, toque de
  la notificación y navegación al destino correcto.
- Confirmar comportamiento PWA en Safari/iOS con un dispositivo real.
- Revisión legal del contenido, términos, privacidad y criterios de confianza.
- Aprobación del contenido real de Servicios, Productos e imágenes propias de
  provincias antes de activarlo públicamente.

### Deuda técnica no bloqueante

- El runner todavía muestra algunos avisos React `act(...)` en pruebas antiguas
  de detalle y algunos avisos esperados de proveedores simulados. No hay fallos
  de pruebas; se pueden limpiar en un bloque separado.
- Permanecen algunos tipos heredados fuera de los límites corregidos, sobre
  todo en el reescritor SEO del Worker y componentes antiguos no críticos.

## Próximo orden de trabajo

1. Contrastar las políticas activas de `profiles`, `notifications`,
   `properties`, `property_reports` y `contacts` en DEV; corregir solo los
   riesgos confirmados y conservar una migración reversible.
2. Contrastar los 7 hallazgos de autorización/RLS con las políticas activas,
   triggers y RPC de DEV antes de decidir cualquier migración reversible.
3. Mantener los gates completos después de cada cambio:
   `lint`, `test:run`, `build` y `build:phase2-dev`.
4. Desplegar únicamente DEV cuando el cambio afecte al runtime y revalidar
   migraciones, rutas y aislamiento después del despliegue.
5. Configurar `GROQ_API_KEY` y probar una moderación IA real; mientras tanto,
   mantener revisión manual como comportamiento seguro.
6. Cerrar correo real, Push/PWA físico en Android/iOS, OAuth definitivo y
   revisión legal/contenido cuando estén disponibles sus proveedores,
   dispositivos y decisiones.
7. No declarar la Fase 2 completamente cerrada ni pasar cambios a producción
   hasta contar con evidencia de proveedores reales, QA móvil y revisión
   legal/contenido.

## Estado de cierre

La Fase 2 **no está cerrada todavía**. La base funcional y los gates técnicos
están avanzados y separados de producción, pero siguen abiertos los pendientes
de proveedor real, pruebas físicas de Push/PWA y revisión legal/contenido.

## Cobertura RLS ampliada - 2026-09-28

- `web/supabase/tests/phase2_local_security.sql` ahora cubre el bloqueo de
  inserciones directas de contactos y reportes por `anon`.
- También cubre la lectura/escritura de estado de una notificación: el dueño
  puede marcarla como leída y otra cuenta no puede cambiarla.
- Gates posteriores: lint correcto, 136 archivos y 597 pruebas, build
  productivo correcto y build DEV correcto.
- `supabase test db --linked` quedó limitado por la ausencia de
  `dockerDesktopLinuxEngine`, requerido para el contenedor `pg_prove`; no se
  modificó el esquema remoto ni se dejaron datos de prueba.

## Accesibilidad de formularios y despliegue DEV - 2026-09-28

- Se asociaron etiquetas con el selector de avatar de cuenta y los controles
  del formulario de reportes.
- Pruebas focalizadas: 24/24. React Doctor sobre cambios: 13 hallazgos, sin
  avisos de accesibilidad en los controles corregidos.
- Gates: lint, 136/597 pruebas, build productivo y build DEV correctos.
- DEV desplegado como `22c90271-477f-486f-bcb8-f09be083957f`; rutas principales,
  manifest y Service Worker respondieron HTTP 200.
- Auditoría pública E2E posterior al despliegue: 1/1 correcta contra DEV, sin
  credenciales ni escrituras persistentes.
- Producción no fue desplegada ni modificada.

## Clasificación de hallazgos de autorización - 2026-09-28

- Los tres avisos `supabase-client-owned-authz-field` de React Doctor fueron
  revisados contra el código y las migraciones activas versionadas.
- Son falsos positivos contextuales: lectura de rol, cambio limitado
  `buyer/agent` protegido por trigger/KYC y actualización de `is_read` con
  filtro del propietario.
- No se modificaron migraciones ni se desactivó el diagnóstico automático.

## Clasificación de hallazgos de autorización - 2026-09-28

- Los tres avisos `supabase-client-owned-authz-field` de React Doctor fueron
  revisados contra el código y las migraciones activas versionadas.
- Son falsos positivos contextuales: lectura de rol, cambio limitado
  `buyer/agent` protegido por trigger/KYC y actualización de `is_read` con
  filtro del propietario.
- No se modificaron migraciones ni se desactivó el diagnóstico automático.

## Archivos de referencia

- `docs/FASE2_ESTADO.md`
- `docs/MULTI_AGENT_HANDOFF.md`
- `docs/FASE2_PUSH_QA_FISICA.md`
- `docs/DESPLIEGUE_COMPLETO.md`
- `web/README.md`
- `web/supabase/DATABASE_MIGRATIONS.md`

## Corte vigente posterior - 2026-09-28

- Gates actuales: lint correcto, **136 archivos / 600 pruebas correctas**,
  build productivo y build DEV correctos.
- E2E público seleccionado: **6/6 en DEV y 6/6 en producción**; no se usaron
  credenciales QA ni se hicieron mutaciones persistentes.
- DEV mantiene la versión `97259d81-46cd-42e9-a2d0-4784390d458b` al 100%;
  producción continúa sin promoción de Fase 2.
- Supabase DEV está alineado hasta `20260916010000`; `db lint` no encontró
  errores y el dry-run indicó que no hay migraciones pendientes.
- Los bloqueos externos siguen siendo OAuth/CAPTCHA/Resend Auth, `GROQ_API_KEY`,
  cuentas QA, Docker/RLS, Push físico Android/iOS y la decisión de Trust Score.
