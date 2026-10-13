# Estado de Fase 2

Fecha de corte: 2026-10-13

Este documento resume la evidencia funcional de Fase 2 en DEV y producción. Los addenda fechados actualizan los estados anteriores sin convertir pruebas locales en evidencia productiva. El corte vigente incluye la promoción integral y la cobertura pHash comparable verificada el 2026-10-13.

| Entregable | Estado | Evidencia actual | Pendiente |
| --- | --- | --- | --- |
| Panel administrativo maestro | Implementado y verificado | Módulos de propiedades, reportes, métricas, auditoría y contexto del anunciante; guards AAL2 y pruebas existentes | QA visual móvil no bloqueante |
| Aprobación y rechazo de publicaciones | Implementado y verificado | Moderación manual/IA, reevaluación y actualización asíncrona del panel | Fixture adicional de contenido real aprobado |
| KYC de identidad (documento + selfie) | Implementado y QA funcional completado | Aprobación local con AAL2/TOTP y limpieza completa (2026-07-24); envío y rechazo con evidencia sintética en DEV (2026-09-28); el usuario confirma que el QA de KYC ya está hecho (2026-10-08) | Sin bloqueo funcional de QA KYC en DEV; separar cualquier verificación de despliegue productivo |
| Vendedor/agente verificado | Implementado y validado visualmente en DEV | Proyección canónica, insignia y guard de rol/KYC; fixture QA sintético verificado visualmente y eliminado (2026-10-10) | El filtro público DEV devolvió 0 resultados elegibles; no hay cuenta real elegible disponible para completar esa comprobación autenticada |
| Verificación documental de propiedad | Base + UI DEV implementadas; flujo E2E y RLS verificados en DEV | Carga sintética, aprobación/rechazo; propietario ve su solicitud/archivo; UID autenticado ajeno y `anon` no los ven; revalidación remota: 0 solicitudes y 0 documentos con contenido, 8 eventos de bitácora preservados | Validación legal manual sigue fuera de alcance |
| Trust Score | Indicador interno DEV implementado | RPC `get_property_trust_score` con cuatro factores explicables, limitado a propietario/admin y sin acceso `anon` | No exponer públicamente por decisión de producto; el indicador interno cubre la decisión vigente y no es certificación legal |
| Reglas anti-fraude y reportes | Implementadas en producción; pHash comparable verificado | Turnstile, reportes y revisión humana; pHash de 64 bits con límite `<= 8/64`. Moderación AAL2 muestra 3/3 publicaciones con fotos propias procesables indexadas y 0 señales abiertas entre ellas | Las otras 303 filas amplias (301 Unsplash y 2 sin imagen) no son comparables; no inferir que las fotos externas estén libres de coincidencias. Calibración con imágenes reales etiquetadas sigue diferida |
| Alertas y Push | Implementado técnicamente | Suscripción, preferencias, lectura, Service Worker, dispatcher y cron DEV; pruebas focalizadas; checklist física preparada en `docs/FASE2_PUSH_QA_FISICA.md` | Recepción/clic en Android e iOS con PWA instalada y permisos concedidos |
| Autenticación y recuperación | Implementado y verificado en código/DEV | OAuth, CAPTCHA, recuperación, política de contraseñas, Pwned Password y sesión MFA | QA física de proveedores y rotación de secretos pendiente |
| Perfil integral de producción | Desplegado y verificado | `/moderar` carga tras el gate AAL2; Supabase registra migraciones hasta `20261013110000`; Worker `cubitat1` `34f435c3-589f-46cc-90b9-673ccda03d82` al 100% | QA físico de Push sigue pendiente de un dispositivo PWA; no bloquea el alcance comercial de Fase 2 |

## Criterio para cerrar Fase 2 según la propuesta — 2026-10-08

La propuesta comercial de junio de 2026 define Fase 2 como “Control, confianza
y KYC”: panel administrador maestro, aprobación/rechazo, KYC con carnet y
selfie, verificación documental de propiedad, vendedor verificado, Trust Score
inicial y reglas antifraude. La aceptación debe medirse contra esos entregables,
no contra todo lo que se haya explorado en el roadmap interno.

- Agentes como red de captación (registro, enlaces, dashboard y comisiones) son
  Fase 3. Push, digest/alertas por correo y exposición pública del Trust Score
  no figuran como entregables obligatorios de la propuesta de Fase 2; quedan
  como extensiones independientes. Un Trust Score inicial interno cumple el
  alcance descrito, sujeto a validación del flujo.
- La propuesta excluye la validación legal manual de documentos. Esto no elimina
  la revisión operativa de QA con documentos sintéticos/no válidos.
- El QA de KYC de identidad está completado: la bitácora registra aprobación
  local con AAL2/TOTP y limpieza el 2026-07-24, envío/rechazo de evidencia
  sintética en DEV el 2026-09-28, y el usuario confirma su cierre el
  2026-10-08. No contarlo como pendiente.
- La verificación documental de propiedad ya tiene recorrido persistente
  autenticado de UI en DEV: se subió evidencia sintética, administración la
  abrió y se verificaron aprobación y rechazo con estado/motivo visible al
  propietario (2026-10-10). RLS entre cuentas quedó comprobado y los datos QA
  se limpiaron: 0 solicitudes/archivos; se conservaron 8 eventos de bitácora y
  3 propiedades. La validación legal manual sigue fuera del alcance.
- El entregable “vendedor verificado” requiere separar identidad KYC de agente:
  el distintivo público «Vendedor verificado» se implementó en la rama de Fase 2
  DEV con RPC limitada a propietarios no agentes verificados y publicados.
  Desplegado y validado visualmente el 2026-10-10 con fixture QA temporal;
  aparece en la tarjeta y los agentes conservan su etiqueta independiente.
  El Worker ahora permite explícitamente la RPC pública de IDs.
- El usuario confirma el 2026-10-10 que el antifraude actual funciona bien; se conserva el umbral pHash y no se amplía esta ronda de QA. La matriz con fotografías reales queda diferida y no bloquea la aceptación actual en DEV. El diseño mantiene la decisión humana y no rechaza automáticamente por similitud.
- Producción contiene una promoción selectiva de KYC; la verificación de
  propiedad y el resto de capacidades aún descritas como DEV no deben marcarse
  como producción. Cualquier promoción final se planifica por separado y no se
  presume autorizada por esta definición de alcance.

## Auditoría de dependencias — 2026-09-28

- `npm audit --audit-level=high` contra el espejo npm configurado no pudo
  ejecutarse porque el espejo devuelve `404 NOT_IMPLEMENTED` para su endpoint
  de auditoría.
- El mismo comando contra `https://registry.npmjs.org` terminó con
  `found 0 vulnerabilities`. No se modificaron dependencias.

## Alertas de búsqueda por correo — 2026-09-28

- Se corrigió la documentación operativa: el dispatcher de correo ya existe en
  `web/src/worker/alert-email-dispatcher.ts` y el Cron del Worker DEV lo ejecuta
  junto con Push y la retención KYC.
- Reclama lotes mediante `claim_pending_alert_emails`, usa idempotencia de
  Resend, escapa HTML, confirma `sent` solo tras respuesta exitosa y reintenta
  hasta tres veces.
- Está verificado en código y pruebas unitarias. `RESEND_API_KEY` existe en DEV
  (solo se comprobó el nombre); la entrega real sigue pendiente de una prueba
  controlada con un destinatario DEV. Producción no ejecuta este dispatcher.

## Aislamiento de enlaces de correo DEV — 2026-09-28

- El Worker DEV fija `PUBLIC_SITE_URL` a
  `https://cubitat1-phase2-dev.pochiprats18.workers.dev`, evitando que un correo
  de prueba use por defecto enlaces productivos.
- `verify-phase2-dev-config.mjs` ahora bloquea el build si falta esa variable o
  apunta a `cubitathome.com`.
- Gates completos: lint, 135 archivos/582 pruebas y builds productivo/DEV
  correctos. DEV desplegado como `6329a5cc-cd09-4557-a10a-1d0217cd84ec`;
  `/`, `/moderar` y producción respondieron HTTP 200.

## Moderación de imágenes almacenadas — 2026-09-28

- La reevaluación IA ya tenía soporte para imágenes inline y URLs públicas de
  Supabase; se añadió una regresión específica para el camino almacenado real.
- La prueba comprueba descarga, conversión a `data:image/...;base64` y envío al
  payload multimodal de Groq, con aprobación persistida por el proveedor.
- La suite quedó en 135 archivos y 582 pruebas; lint, build productivo aislado
  y build DEV pasaron.
- DEV desplegado como `14420ae5-9dfa-4ba2-a481-64b2f2766c29`. La configuración
  de Groq sigue pendiente para ejecutar una prueba remota con proveedor real.

## Auditoría contra la propuesta — 2026-09-28

- La propuesta de Fase 2 exige panel maestro, aprobación/rechazo, KYC,
  verificación documental, vendedor verificado, Trust Score inicial y reglas
  anti-fraude.
- Los primeros seis entregables tienen implementación y evidencia DEV
  documentadas en la tabla principal.
- La regla anti-duplicado server-side está aplicada en DEV mediante
  `dev-migrations/20260928010000_property_duplicate_rules.sql`. La prueba SQL
  transaccional pasó con datos sintéticos y `ROLLBACK`; queda revisar falsos
  positivos antes de considerar el comportamiento apto para producción.
- Tampoco se puede declarar revisión IA de imágenes verificada mientras
  `GROQ_API_KEY` no esté configurada en DEV. Ambos pendientes permanecen
  separados para no interferir con KYC, Trust Score, Push o autenticación.

## Inventario nominal de integraciones DEV — 2026-09-28

- La consulta de nombres del Worker `cubitat1-phase2-dev` confirmó la presencia
  de `CONTACT_METRICS_SALT`, `RESEND_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`,
  `VAPID_SUBJECT` y `VITE_SUPABASE_ANON_KEY`.
- `GROQ_API_KEY` no aparece declarada en DEV; la prueba real de moderación de
  imágenes sigue pendiente hasta agregarla mediante el gestor de secretos.
- El procedimiento seguro quedó documentado con
  `wrangler secret put GROQ_API_KEY --config wrangler.phase2-dev.jsonc`; no se
  debe usar la configuración productiva durante esta fase.
- `supabase secrets list --project-ref bknwerqbbysveehcdmzr` devolvió una lista
  vacía de secretos de Edge Functions. Esta salida no representa los secretos
  internos de Auth, por lo que OAuth, CAPTCHA y SMTP de Auth conservan su
  verificación propia y no se consideran cerrados por este comando.
- No se leyeron valores secretos ni se modificó ningún entorno.

## Revalidación de puertas completas — 2026-09-28

- `npm run lint`: correcto.
- `npm run test:run`: **137 archivos y 608 pruebas correctas**. Los avisos de
  Turnstile externo y respuestas simuladas `502` permanecen controlados por el
  entorno de pruebas y no causaron fallos.
- `npm run build`: correcto; el bundle productivo excluye Fase 2 y no contiene
  marcadores de secretos privados.
- `npm run build:phase2-dev`: correcto; verificó origen/redirecciones DEV,
  inclusión de KYC, sitemap de 446 URLs y ausencia de secretos privados.
- No hubo cambios de código ni despliegue en esta revalidación.

## Verificación HTTP y aislamiento remoto — 2026-09-28

- DEV devolvió `200` en `/`, `/mi-cuenta`, `/moderar`,
  `/manifest.webmanifest` y `/sw.js`.
- Producción devolvió `200` en `/`, `/manifest.webmanifest` y `/sw.js`.
- El Service Worker DEV contiene `AccountPhaseTwoSections` y
  `KycModerationTab`; el Service Worker productivo no contiene ninguno de esos
  módulos exclusivos de Fase 2.
- La comprobación fue de solo lectura y no creó datos ni cambió configuración.

## Versión DEV activa — 2026-09-28

- `wrangler deployments list --config wrangler.phase2-dev.jsonc` confirmó que
  `e8686ea6-137a-4d29-ad86-5039579eb8e3` recibe el **100% del tráfico DEV**.
- No existe una versión posterior publicada en el Worker DEV durante esta
  revisión; producción no fue consultada para despliegue ni modificada.

## Preparación de despliegue DEV — 2026-09-28

- `npx wrangler deploy --config wrangler.phase2-dev.jsonc --dry-run` pasó sin
  publicar cambios.
- El artefacto leyó 64 assets y conservó `PHASE2_ENABLED=true`, el Durable
  Object `RATE_LIMITER`, el binding `TURNSTILE_VERIFY` y el origen DEV
  `cubitat1-phase2-dev.pochiprats18.workers.dev`.
- No se desplegó ni se modificó ningún entorno.

## Deuda de complejidad separada — 2026-09-28

- El grafo actualizado concentra la complejidad cognitiva más alta en
  `web/src/worker.ts` y `web/src/app/CubitatApp.tsx`, ambos shells históricos
  que coordinan varios carriles.
- Esta deuda no introduce un requisito faltante de la propuesta de Fase 2 ni
  justifica una refactorización amplia durante el cierre actual.
- Se mantiene como trabajo posterior, con extracción por módulos independientes,
  pruebas focalizadas y despliegues DEV separados para conservar reversibilidad.

## Revalidación de correcciones recientes — 2026-09-28

- La activación de Push reintenta la preparación y la suscripción dentro del
  mismo gesto del usuario cuando la primera preparación falla; la regresión
  está cubierta y no cambia el contrato del Service Worker.
- La verificación documental de propiedad permite volver a enviar una
  solicitud después de un rechazo, pero mantiene bloqueados los estados
  `pending` y `approved` para evitar solicitudes duplicadas.
- Gates posteriores a ambas correcciones: lint correcto, 134 archivos y 575
  pruebas correctas, build productivo y build DEV correctos. El build DEV
  generó 446 URLs y mantuvo el aislamiento del proyecto Supabase DEV.
- DEV desplegado como `396ff43c-ebce-4958-be23-93e5c5a8df22`; `/`,
  `/mi-cuenta`, `/mis-propiedades` y `/sw.js` respondieron HTTP 200. El chunk
  remoto de propiedades conserva el formulario de reenvío documental.
- Producción no fue modificada. Siguen pendientes únicamente las pruebas
  persistentes con cuentas/dispositivos reales y la decisión de exposición
  pública del Trust Score descritas en la tabla principal.

## Revisión de frontera de agentes verificados — 2026-09-28

- `get_verified_agent_ids()` solo proyecta perfiles con rol `agent`, KYC
  `verified` y al menos una propiedad publicada.
- `get_public_agent_profile(uuid)` repite la misma condición antes de devolver
  datos públicos, por lo que un perfil no verificado no obtiene insignia ni
  ficha pública mediante esa RPC.
- El panel de agente mantiene una segunda frontera en el cliente y el acceso
  de datos se conserva separado por repositorios; no se detectó una escalada
  reproducible ni se modificó código en este carril.

## Revisión de anti-fraude y contactos públicos — 2026-09-28

- `/api/public/contact` y `/api/public/report` limitan por IP y tipo de
  operación antes de procesar el cuerpo: cinco contactos o tres reportes por
  ventana de cinco minutos.
- Turnstile se valida con timeout, acción esperada y hostname de la solicitud;
  una verificación inválida devuelve `400` y una indisponible devuelve `503`,
  sin registrar el contacto ni el reporte.
- El cuerpo JSON tiene límite de 16 KiB y los campos se normalizan y validan
  antes de llamar a las RPC confiables. Los métodos distintos de `POST` se
  rechazan explícitamente.
- Las RPC se invocan exclusivamente desde el Worker con el secreto de
  servicio y las respuestas de error no exponen detalles internos.
- No se detectó una ruta fail-open en la inspección estática; la prueba real
  del proveedor Turnstile continúa siendo un pendiente operativo separado.

## Auditoría de aislamiento de secretos — 2026-09-28

- La búsqueda en el bundle productivo no encontró `SUPABASE_SERVICE_ROLE_KEY`,
  valores de service role ni marcadores de credenciales privilegiadas.
- El verificador de aislamiento mantiene fuera de producción los chunks y RPC
  exclusivos de Fase 2.
- El único JWT encontrado en el bundle es el fallback público de Supabase
  local/demo usado para desarrollo seguro; no corresponde a una clave real de
  ningún proyecto remoto.
- Las credenciales privilegiadas permanecen limitadas al runtime del Worker y
  a los secretos del entorno; no se modificó configuración remota en este
  carril.

## QA de estado Push en escritorio — 2026-09-28

- En una sesión autenticada real del navegador DEV, `/mi-cuenta` muestra
  `Las notificaciones están activas en este dispositivo` y presenta la acción
  `Desactivar en este dispositivo`.
- Esta comprobación valida la lectura del estado de suscripción y la UI de
  preferencias sin enviar una notificación ni cambiar la suscripción.
- Continúa pendiente la recepción y apertura desde una PWA instalada en
  Android/iOS, que requiere dispositivos físicos y permisos del sistema.

## Revisión de instalación PWA — 2026-09-28

- Android muestra instrucciones específicas para Chrome cuando no existe un
  evento de instalación nativo disponible.
- iOS muestra el flujo de Safari: Compartir, Añadir a pantalla de inicio y
  confirmación visible, incluyendo iPad en modo escritorio.
- `getInstalledRelatedApps()` solo reconoce instalaciones cuyo `id` y
  manifest pertenecen a Cubitat; una aplicación de otro origen no suprime el
  aviso.
- La opción `Quizás luego` guarda la fecha y vuelve a mostrar el aviso después
  de siete días; el evento manual puede abrir las instrucciones aunque el
  aviso automático esté diferido.
- Pruebas focalizadas: 9/9 correctas. La comprobación de instalación real en
  Android/iOS continúa como QA físico separado.

## Actualización PWA y despliegue DEV — 2026-09-28

- Se reconectó `PWAInstallPrompt` con `registerSW` de `vite-plugin-pwa`.
  El aviso `Actualización disponible` vuelve a activarse mediante
  `onNeedRefresh` y su acción `Actualizar` ejecuta el update con recarga.
- Se añadió una regresión para mostrar el aviso y aplicar el callback del
  Service Worker; la suite focalizada quedó en 10/10.
- Gates: lint correcto, suite completa de 134 archivos y 576 pruebas correctas,
  build productivo aislado correcto y build `phase2-dev` correcto con sitemap
  de 446 URLs.
- Despliegue únicamente al Worker `cubitat1-phase2-dev`, versión
  `0d1170a4-5eb9-481c-a65d-1216f7c709a0`. `/`, `/mi-cuenta`,
  `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200; el asset remoto
  conserva el texto y la lógica del aviso de actualización.
- La prueba de actualización entre dos versiones y la recepción/clic Push en
  dispositivos físicos siguen siendo QA externo pendiente. Producción no fue
  modificada.

## Frontera de proveedores IA — 2026-09-28

- El Worker DEV usa exclusivamente `GROQ_API_KEY` y el modelo `qwen/qwen3.8-27b`
  por defecto; el inventario remoto confirmó que ese secreto todavía no está
  configurado.
- Ante esa ausencia, el Worker no llama a ningún proveedor y conserva la
  publicación en `pending_review` para moderación manual. No es un fallo
  silencioso ni una aprobación automática.
- La ruta de Vite local usa `GEMINI_API_KEY` como integración de desarrollo
  separada; no se mezcla con el runtime del Worker ni prueba la moderación IA
  remota.
- Cierre de este carril: nombres de secretos y degradación segura verificados;
  queda pendiente configurar `GROQ_API_KEY` mediante el gestor de secretos y
  repetir una prueba autenticada controlada en DEV. No se modificaron secretos.
- `wrangler check startup --config wrangler.phase2-dev.jsonc` completó el
  análisis del Worker con una ventana local de 30,6 ms; no se detectó un
  problema de arranque que justifique cambiar la arquitectura.

## Revalidación de esquema DEV — 2026-09-28

- `supabase db lint --linked --level warning` terminó con `No schema errors
  found` en los esquemas `extensions` y `public`.
- `supabase db push --linked --dry-run` confirmó `Remote database is up to
  date`; no se aplicaron migraciones ni escrituras.
- El CLI mostró advertencias operativas porque no están disponibles en el
  entorno local `SUPABASE_AUTH_CAPTCHA_SECRET`, `RESEND_API_KEY` y
  `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`. Deben resolverse en el gestor de
  secretos/configuración de DEV antes de cerrar los flujos CAPTCHA, correo y
  OAuth Google.
- `supabase migration list --linked`, ejecutado con `SUPABASE_HOME` temporal,
  confirmó coincidencia local/remota hasta `20260916010000`.
- `supabase db push --linked --dry-run` devolvió `Remote database is up to
  date`; no hubo escrituras.
- El volcado SQL sigue pendiente porque `supabase db dump --linked` requiere
  Docker local; no se modificó el esquema remoto.

## Error seguro de OAuth Google — 2026-09-28

- Cuando Supabase devuelve `Unsupported provider`, `missing OAuth secret` o
  `provider is not enabled`, el modal ya no muestra el detalle técnico en
  inglés. Presenta una indicación segura para usar correo y contraseña mientras
  se configura el proveedor.
- Regresión focalizada: 5/5 pruebas del modal; suite completa posterior:
  134 archivos y 577 pruebas correctas. Lint, build productivo aislado y build
  DEV correctos.
- Despliegue únicamente al Worker `cubitat1-phase2-dev`, versión
  `1580c8c4-9826-443a-9dd6-5ddd772d4ea9`. Las rutas principales, el manifest y
  `sw.js` respondieron HTTP 200; el asset remoto conserva el mensaje seguro y
  no contiene `Unsupported provider`.
- El proveedor sigue pendiente de configuración externa; este cambio evita
  filtrar el fallo y mantiene el acceso por correo disponible. Producción no
  fue modificada.

## Frontera de proveedores IA — 2026-09-28

- El Worker DEV usa exclusivamente `GROQ_API_KEY` y el modelo `qwen/qwen3.8-27b`
  por defecto; el inventario remoto confirmó que ese secreto todavía no está
  configurado.
- Ante esa ausencia, el Worker no llama a ningún proveedor y conserva la
  publicación en `pending_review` para moderación manual. No es un fallo
  silencioso ni una aprobación automática.
- La ruta de Vite local usa `GEMINI_API_KEY` como integración de desarrollo
  separada; no se mezcla con el runtime del Worker ni prueba la moderación IA
  remota.
- Cierre de este carril: nombres de secretos y degradación segura verificados;
  queda pendiente configurar `GROQ_API_KEY` mediante el gestor de secretos y
  repetir una prueba autenticada controlada en DEV. No se modificaron secretos.

## Última revalidación técnica

- `npm run lint`: correcto.
- `npm run test:run`: 134 archivos y 573 pruebas correctas.
- `npm run build`: correcto; aislamiento de bundles verificado y sitemap de
  446 URLs generado.
- `npm run build:phase2-dev`: correcto; módulo KYC presente y manifest DEV
  relacionado con el origen DEV.
- PWA/Worker DEV: versión `ba85b107-4b08-4606-a302-b7c217dc993e` desplegada;
  `/`, `/recuperar-contrasena` y `/sw.js` respondieron HTTP 200. Producción no
  modificada.
- Aislamiento de cliente Supabase endurecido: el cliente SSR ya no contiene un
  fallback a un proyecto real; una configuración ausente usa únicamente
  `https://dev-supabase.invalid` para fallar de forma segura. Gates completos
  posteriores: lint correcto, 134 archivos y 570 pruebas correctas, builds
  productivo/DEV correctos. DEV desplegado como `c1198d5c-2b55-43fd-a33c-1cc1853eb4c8`;
  `/`, `/mi-cuenta` y `/sw.js` respondieron HTTP 200. Producción permaneció sin cambios.
- El verificador `verify-phase2-dev-bundle.mjs` ahora bloquea automáticamente
  referencias al proyecto Supabase productivo en el HTML y assets DEV.
- El routing del clic de notificaciones Push rechaza ahora barras invertidas en
  destinos externos disfrazados; se añadió una regresión para evitar que una
  ruta manipulada pueda normalizarse a otro dominio. Gates posteriores:
  lint correcto, 134 archivos/570 pruebas y builds productivo/DEV correctos.
- Verificación remota posterior al despliegue: `/`, `/mi-cuenta`, `/moderar` y
  `/sw.js` respondieron HTTP 200; el Service Worker contiene el marcador de
  notificación y ninguna de las respuestas revisadas contiene la referencia
  del proyecto Supabase productivo. Producción no fue modificada.
- `/api/ai-moderate` ahora limita a 5 solicitudes por usuario cada 10 minutos
  antes de consultar la propiedad o el proveedor Groq; el exceso devuelve 429
  con `Retry-After`. Regresión cubierta y gates completos: lint, 134 archivos/
  571 pruebas y ambos builds correctos. DEV desplegado como
  `f40ef974-36dc-45d4-9146-ce4aa1db98c2`; producción permaneció sin cambios.
- El manifest PWA DEV remoto fue verificado en lectura: `display: standalone`,
  `scope` y `start_url` en `/`, y `related_applications` apuntando al mismo
  origen DEV. La detección de una instalación previa sigue dependiendo de las
  APIs del navegador y de QA físico Android/iOS.
- La recuperación de contraseña ya no muestra errores técnicos de PKCE,
  tokens u OTP; presenta instrucciones para solicitar un enlace nuevo. Se añadió
  una regresión, lint y builds correctos con 134 archivos/572 pruebas. DEV quedó
  desplegado como `562121b5-d335-4627-9f6c-e9bdb6b1a8bf`; el chunk remoto de
  recuperación respondió HTTP 200 y no contiene el texto técnico de PKCE.
- Inventario DEV sin exponer valores: están configurados Push (`VAPID_*`),
  Resend, `CONTACT_METRICS_SALT`, `SUPABASE_SERVICE_ROLE_KEY` y
  `VITE_SUPABASE_ANON_KEY`. No aparecen `GROQ_API_KEY` ni las credenciales
  opcionales de métricas externas; la moderación degrada a revisión manual y
  las tarjetas de métricas muestran ausencia de datos sin bloquear el producto.
- El endpoint de métricas administrativas limita a 30 solicitudes por
  administrador AAL2 cada minuto antes de consultar proveedores externos;
  devuelve 429 con `Retry-After` al superar el límite. Regresión cubierta y
  gates completos con 134 archivos/573 pruebas. DEV desplegado como
  `ba85b107-4b08-4606-a302-b7c217dc993e`; producción sin cambios.
- Auditoría de dependencias 2026-09-28: `npm audit --audit-level=high`
  contra el registro oficial terminó con `0 vulnerabilities` después de
  actualizar MapLibre a `6.11.2`, PostCSS a `8.5.28`, sharp a `0.35.5`,
  Vitest a `4.1.11` y Wrangler a `4.142.0`; se corrigió la importación de
  namespace requerida por MapLibre 6. Producción no fue modificada.
- Verificación remota posterior al despliegue DEV `ba85b107-4b08-4606-a302-b7c217dc993e`:
  `/`, `/mi-cuenta`, `/moderar` y `/sw.js` respondieron HTTP 200; el bundle
  remoto contiene MapLibre actualizado y el Service Worker conserva el
  marcador de Push. Producción sigue sin cambios.
- Revalidación remota posterior: `supabase migration list --linked` mostró
  coincidencia local/remota completa y `supabase db lint --linked --level warning`
  terminó con `No schema errors found`. No hubo escrituras remotas.
- Revalidación remota adicional del 2026-09-28: las migraciones locales y
  remotas de DEV siguen alineadas y `supabase db lint --linked --level warning`
  volvió a terminar con `No schema errors found`; no se aplicaron escrituras.
- QA visual remoto inicial del mapa 2026-09-28: el mapa base y los controles
  OpenFreeMap cargaban en DEV, pero la fuente GeoJSON de propiedades no dibujaba
  marcadores con MapLibre 6.11.2; desactivar clusters no cambiaba el resultado.
  Se rechazó volver a MapLibre 5 porque `npm audit` reportaba una vulnerabilidad
  crítica. El bloqueo quedó resuelto en la sección de corrección de mapa que
  aparece al final de este documento; producción no fue modificada.
- La reevaluación de moderación IA ahora restaura el estado anterior si la
  solicitud falla antes de ser aceptada; si ya fue aceptada, conserva el estado
  pendiente y mantiene el aviso de espera. Regresión aislada cubierta y
  desplegada únicamente en DEV; `/`, `/moderar` y `/sw.js` respondieron HTTP 200.
- Las tarjetas administrativas de Cloudflare y Analytics ya no presentan datos
  ausentes como `0`; distinguen `0` real de proveedor sin datos y conservan las
  métricas locales de Supabase. Se añadieron dos regresiones y se desplegó solo
  DEV.
- La ruta `/api/ai-moderate` ahora tipa estrictamente el payload del anuncio y
  la respuesta externa de Groq; solo acepta `ai_approved`, `ai_rejected` o
  `pending_review`, y cualquier respuesta malformada degrada a revisión manual.
  Revalidación: lint correcto, 134 archivos/570 pruebas, build productivo y
  build `phase2-dev` correctos. Se desplegó únicamente a DEV como
  `c1198d5c-2b55-43fd-a33c-1cc1853eb4c8`; `/`, `/moderar`, `/mi-cuenta` y
  `/sw.js` respondieron HTTP 200 y no contienen la referencia antigua del
  proyecto Supabase productivo.
- El verificador `verify-phase2-dev-bundle.mjs` ahora bloquea automáticamente
  referencias al proyecto Supabase productivo en el HTML y assets DEV.
- Revalidación remota posterior: `supabase migration list --linked` mostró
  coincidencia local/remota completa y `supabase db lint --linked --level warning`
  terminó con `No schema errors found`. No hubo escrituras remotas.
- Producción: no modificada en esta revalidación.

## Notificaciones: lectura y persistencia — 2026-09-27

- Se añadió cobertura al hook `useNotifications` para validar la bandeja de
  no leídas, la eliminación inmediata al abrir/marcar una notificación y la
  restauración ante error de persistencia.
- Resultado: lint correcto, 119 archivos/502 pruebas correctas, build productivo
  correcto y build DEV correcto; sitemap de 446 URLs.
- La suite del despachador Push también cubre que un `503` del proveedor deje
  la entrega en `pending` para reintento; la revalidación completa quedó en
  119 archivos/503 pruebas.
- La bandeja cierra el menú incluso cuando un aviso sin destino válido se
  marca como leído; la regresión cubre ese caso y evita dejar una interacción
  abierta sin navegación posible. La suite posterior queda en 119 archivos y
  504 pruebas correctas.
- Worker DEV desplegado como `d87af246-bb75-4b62-ac45-7f095ab56b40` y raíz
  verificada con HTTP 200.
- La corrección de la bandeja se desplegó únicamente en el Worker DEV como
  `a00f6d86-e8a8-4cab-bfe5-0dbde30daadf`; `/`, `/mi-cuenta`, el manifest y
  `sw.js` respondieron HTTP 200, y el manifest conserva el origen DEV.
- En una sesión autenticada DEV abierta en Chrome, `/mi-cuenta` mostró
  `Las notificaciones estan activas en este dispositivo` y la acción
  `Desactivar en este dispositivo`.
- Producción no modificada; queda pendiente únicamente la comprobación manual
  con una notificación real en un dispositivo cerrado.

## Revalidación remota Supabase DEV — 2026-09-27

- `supabase migration list --linked` mostró todas las migraciones registradas
  local y remotamente alineadas.
- `supabase db lint --linked --level warning` terminó con `No schema errors
  found`.
- No se ejecutaron inserciones, cambios de roles ni acciones sobre producción.

## Gates CI — 2026-09-27

- Se añadió `.github/workflows/phase2-quality.yml` para ejecutar en pushes,
  pull requests y lanzamientos manuales: `npm ci`, lint, suite completa, build
  productivo con verificador de aislamiento y build `phase2-dev`.
- Los builds de CI usan `SITEMAP_MODE=static`, que evita credenciales y
  consultas remotas únicamente en CI; los builds normales siguen generando el
  sitemap desde las propiedades publicadas reales.
- Revalidación local del workflow: lint correcto, 119 archivos/503 pruebas y
  ambos builds correctos con `SITEMAP_MODE=static`.

## Superficie HTTP DEV — 2026-09-27

- `/`, `/mi-cuenta` y `/moderar` respondieron HTTP 200.
- `/manifest.webmanifest` respondió HTTP 200 con `start_url`, `scope` e `id`
  en `/`, y `related_applications` apuntando al origen DEV.
- `/sw.js` respondió HTTP 200 como JavaScript. No se modificó producción.

## Verificación documental DEV — 2026-09-27

- Se aplicó únicamente al proyecto Supabase DEV la migración
  `20260810000000_property_verification_and_trust_score.sql`.
- Verificación remota sin fixtures: tabla, bucket privado `property_documents`,
  políticas y las tres RPC de envío, revisión e indicador existen; no se
  insertaron documentos ni solicitudes de prueba.
- `supabase db lint --linked --level warning` detectó y permitió corregir una
  referencia ambigua del RPC de Trust Score; la segunda ejecución terminó con
  `No schema errors found`.
- Las políticas de Storage del bucket documental ahora exigen una ruta
  `user/property-<uuid>/...` perteneciente a la propiedad del usuario, no solo
  la carpeta raíz del usuario.
- La UI de propietario y la pestaña administrativa se incluyen en el bundle
  `phase2-dev`; el bundle productivo las excluye.
- La pestaña administrativa muestra el indicador interno y sus cuatro factores
  cuando el RPC responde; un fallo del indicador no bloquea la revisión.
- Gates: lint correcto, 118 archivos/499 pruebas, build productivo y build DEV
  correctos. Worker DEV desplegado como `42afda30-2b43-4ab5-b5f3-9d50581c9557`;
  queda QA E2E persistente.

## Revalidación de verificación documental — 2026-09-27

- El repositorio administrativo conserva la revisión aunque falle la firma del
  documento privado o el RPC del indicador interno.
- Se añadieron regresiones para respuestas de Trust Score con forma de objeto y
  para errores de Storage; la prueba focalizada pasó 5/5.
- La pestaña administrativa ahora tiene cobertura directa para el indicador
  interno y para el estado sin documento firmado, manteniendo disponible el
  rechazo y bloqueando únicamente la aprobación.
- El hook de moderación documental también cubre aprobar, conservar la
  solicitud ante error remoto y exigir motivo antes de rechazar.
- El diálogo de rechazo documental cubre estado vacío, motivo obligatorio,
  cancelación, confirmación y bloqueo durante procesamiento.
- Suite completa posterior: 122 archivos y 514 pruebas correctas; lint y build
  normal correctos, aislamiento productivo verificado y sitemap real de 446 URLs.
- No se modificó el esquema ni se desplegó un cambio de runtime en este bloque.

## Revalidación remota posterior — 2026-09-27

- `supabase migration list --linked` confirmó coincidencia completa entre las
  migraciones locales y remotas de DEV.
- El primer intento de `supabase db lint` tuvo un fallo transitorio de conexión
  (`LegacyDbConnectError`); el reintento completó `No schema errors found`.
- No se hicieron escrituras, cambios de roles ni acciones sobre producción.

## Revalidación del panel de agentes — 2026-09-27

- El hook `useAgentDashboard` quedó cubierto en sus estados de carga correcta,
  métricas derivadas, cambio de visibilidad exitoso, error seguro de RPC y
  error seguro de carga.
- La cobertura es modular y no modifica la lógica de publicación, moderación ni
  el esquema remoto.
- Suite completa: 123 archivos y 518 pruebas correctas; lint correcto.
- `npm run build` correcto; aislamiento del bundle productivo y del Worker
  productivo verificado, con sitemap real de 446 URLs.
- No se desplegó runtime ni se modificó producción; permanece pendiente el QA
  físico autenticado del panel de agente.

## Seguridad de errores administrativos — 2026-09-27

- `getErrorMessage` dejó de propagar mensajes crudos de backend a las vistas de
  administración y ahora siempre usa el fallback contextual seguro.
- Se añadieron regresiones para errores `Error` y objetos desconocidos.
- Suite completa posterior: 125 archivos y 523 pruebas correctas; lint y build
  correctos, con aislamiento productivo y sitemap real de 446 URLs verificados.

## Cobertura del flujo KYC — 2026-09-27

- Se añadió cobertura directa de `useKycSubmission` para validación de archivos,
  limpieza compensatoria si falla la segunda subida y finalización exitosa.
- Suite completa posterior: 126 archivos y 527 pruebas correctas; lint y build
  correctos, con aislamiento productivo y sitemap real de 446 URLs verificados.
- No se modificaron datos remotos ni se desplegó runtime; el E2E persistente
  con una cuenta DEV sigue pendiente.

## Cobertura de alertas de búsqueda — 2026-09-27

- Se añadió cobertura directa de `useSearchAlerts` para carga, error seguro,
  creación autenticada, rechazo sin sesión y eliminación local.
- Suite completa posterior: 127 archivos y 532 pruebas correctas; lint y build
  correctos, con aislamiento productivo y sitemap real de 446 URLs verificados.
- No se modificaron datos remotos ni se desplegó runtime; la entrega física de
  alertas Push y correo sigue pendiente de dispositivos/proveedores reales.

## Robustez de alertas de búsqueda — 2026-09-27

- `useSearchAlerts` ahora limpia siempre `loading`/`creating` ante excepciones
  inesperadas y resetea el estado cuando no existe sesión de usuario.
- Se añadieron regresiones para excepciones de carga y creación.
- Suite completa posterior: 127 archivos y 534 pruebas correctas; lint y build
  correctos, con aislamiento productivo y sitemap real de 446 URLs verificados.

## Despliegue DEV de alertas robustas — 2026-09-27

- Build `phase2-dev` correcto; el bundle DEV conserva el módulo KYC y generó
  el sitemap real de 446 URLs.
- Dry-run de Wrangler correcto y despliegue únicamente al Worker
  `cubitat1-phase2-dev`, versión `9d6d3097-fe9c-49d2-b8cf-961e33f8e244`.
- `/`, `/mi-cuenta`, `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200.
- El manifest remoto conserva `start_url=/` y `related_applications` del origen
  DEV. Producción no fue modificada.

## Cobertura aislada del contacto público — 2026-09-27

- Se añadió `web/src/worker/public-submissions.test.ts` con seis casos para
  payload inválido, Turnstile inválido/no disponible, normalización telefónica,
  fallo del RPC y reporte público.
- La suite completa posterior terminó con 127 archivos y 535 pruebas correctas;
  lint y build productivo correctos, con aislamiento y sitemap real de 446 URLs.
- No se necesitó un nuevo despliegue: el runtime ya estaba en DEV y este bloque
  solo amplía cobertura. Producción no fue modificada.

## MFA: cobertura del servicio — 2026-09-27

- Se añadió `web/src/modules/auth/mfa/mfaService.test.ts` con ocho casos
  aislados para lectura de AAL/factores, cierre seguro ante fallos, limpieza de
  factores pendientes, bloqueo de enrollment si la limpieza falla y
  clasificación de errores de sesión, código inválido, HTTP 422 y servicio no
  disponible.
- Suite completa posterior: 132 archivos y 562 pruebas correctas; lint y build correctos,
  con aislamiento productivo y sitemap real de 446 URLs verificados.
- No se crearon factores MFA, sesiones ni escrituras remotas en Supabase. El
  E2E persistente con una cuenta DEV continúa pendiente.
## Revalidación remota DEV — 2026-09-27

- El Worker `cubitat1-phase2-dev` respondió HTTP 200 en `/`, `/mi-cuenta`,
  `/manifest.webmanifest` y `/sw.js`.
- El manifest remoto conserva `start_url=/`, una aplicación relacionada y la
  URL relacionada del mismo origen DEV.
- Esta comprobación no modificó datos ni configuración y no implicó producción.
## Revalidación de disponibilidad de producción — 2026-09-27

- `https://cubitathome.com/`, `/manifest.webmanifest` y `/sw.js` respondieron
  HTTP 200.
- Fue una comprobación de solo lectura; no se desplegó Phase 2 ni se modificó
  la configuración productiva.
## Routing de clics Push y despliegue DEV — 2026-09-27

- Se aisló el routing seguro de notificaciones en `web/src/swRouting.ts` y se
  añadieron pruebas para destinos internos, URLs externas y UUIDs inválidos.
- Suite completa posterior: 133 archivos y 564 pruebas correctas; lint y build correctos,
  con aislamiento productivo y sitemap real de 446 URLs.
- Se desplegó únicamente `cubitat1-phase2-dev`, versión
  `ffba90f5-4ded-4f1d-9845-72ea02258d2e`.
- DEV respondió HTTP 200 en `/`, `/mi-cuenta`, `/manifest.webmanifest` y
  `/sw.js`; el Service Worker remoto contiene `notificationclick` y
  `clients.openWindow`.
- Producción no fue modificada. La recepción física y el clic desde Android/iOS
  siguen requiriendo validación con dispositivos reales.
## Eliminación de fallback Supabase incrustado — 2026-09-27

- Se retiraron del Worker la URL y la clave `anon` antiguas usadas como
  fallback en el proxy Supabase y en el render SSR de detalles.
- El runtime usa ahora exclusivamente `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY` proporcionadas por el entorno.
- Suite completa: 133 archivos y 564 pruebas correctas; lint y build correctos,
  con aislamiento productivo y sitemap real de 446 URLs.
- Despliegue únicamente a `cubitat1-phase2-dev`, versión
  `bf52157f-62d8-49d2-86d5-c0bf07cb142f`; raíz DEV y `/sw.js` respondieron 200
  y la respuesta no contiene la referencia al proyecto antiguo.
- Producción no fue modificada. La rotación de secretos externos sigue siendo
  una tarea operativa separada.

## Inventario operativo de secretos DEV — 2026-09-27

- Consulta no destructiva de Wrangler, solo nombres y nunca valores. Están
  configurados Push (`VAPID_*`), Resend, `CONTACT_METRICS_SALT`,
  `SUPABASE_SERVICE_ROLE_KEY` y `VITE_SUPABASE_ANON_KEY`.
- `GROQ_API_KEY` no aparece configurada en DEV. La moderación IA degrada de
  forma segura a `pending_review` y revisión manual; no se marca como activa.
- Faltan también las credenciales de métricas externas de Cloudflare,
  Supabase Management y Google Analytics. Esas ausencias quedan aisladas y
  no bloquean publicaciones, contactos, autenticación ni Push.
- No se escribieron, rotaron ni expusieron secretos. Configurar estos valores
  desde el gestor de secretos y repetir la prueba autenticada de DEV queda
  pendiente para cerrar esos submódulos.

## Métricas administrativas sin credenciales — 2026-09-28

- Se añadió una regresión del endpoint `/api/metrics` para comprobar que un
  administrador AAL2 recibe estados parciales explícitos cuando faltan las
  credenciales de Cloudflare, Supabase Management y Google Analytics.
- Revalidación: lint correcto, 133 archivos y 565 pruebas correctas, build
  productivo aislado correcto y sitemap real de 446 URLs.
- No hubo despliegue ni cambios remotos; el panel mantiene esas métricas como
  pendientes sin bloquear las funciones de publicación, contactos o Push.

## Auditoría de especificación administrativa — 2026-09-28

- Se contrastó `web/openspec/specs/administration/spec.md` con el árbol actual
  de pruebas y módulos. Acceso AAL2, publicaciones, reportes, usuarios,
  KYC/retención, bitácora, métricas, moderación IA, arquitectura modular y
  contexto del anunciante tienen implementación y cobertura dedicada.
- No se encontró un requisito funcional administrativo huérfano en el código
  local. La Fase 2 sigue abierta únicamente por validaciones externas: secretos
  opcionales de proveedores y QA físico persistente.

## Regresión de fallback Groq — 2026-09-28

- Se añadió una prueba del Worker para el caso real de DEV sin `GROQ_API_KEY`:
  no intenta llamar al proveedor, persiste `pending_review` con proveedor nulo
  y conserva la revisión manual.
- Revalidación: lint correcto, 133 archivos y 565 pruebas correctas, build
  productivo correcto, aislamiento de Fase 2 y sitemap real de 446 URLs.
- No requiere despliegue porque el cambio es únicamente de cobertura; el
  Worker DEV remoto permanece sin cambios.

## Endurecimiento de recuperación de contraseña — 2026-09-28

- La detección del flujo de recuperación ahora exige credenciales reales del
  enlace (`token_hash`, código PKCE o tokens de sesión), además de `type=recovery`
  o del evento de recuperación.
- Un parámetro aislado `type=recovery` ya no puede habilitar el formulario en
  una sesión existente. La regresión quedó cubierta en `authUrlParams.test.ts`.
- Revalidación: lint correcto, 133 archivos y 565 pruebas correctas, build
  productivo aislado correcto y sitemap real de 446 URLs.
- El cambio es modular y reversible; tras los gates se promovió únicamente a
  DEV para validación autenticada.

## Despliegue DEV del endurecimiento de recuperación — 2026-09-28

- Build `phase2-dev` y dry-run de Wrangler correctos.
- Se desplegó únicamente `cubitat1-phase2-dev` como versión
  `e74048af-9c74-4f8e-926b-f195cc902c36`.
- `/`, `/recuperar-contrasena` y `/sw.js` respondieron HTTP 200; producción no
  fue modificada.

## Regresión de componente en recuperación — 2026-09-28

- Se añadió una prueba de `ResetPasswordPage` para una sesión existente con
  `type=recovery` pero sin credenciales: muestra el error, mantiene el botón
  deshabilitado y no llama a `updateUser`.
- Revalidación final: lint correcto, 133 archivos y 566 pruebas correctas,
  build productivo aislado correcto y sitemap real de 446 URLs.
- No requiere un nuevo despliegue porque solo amplía cobertura del runtime ya
  desplegado en DEV.

## Verificación de bundle de recuperación DEV/producción — 2026-09-28

- El chunk DEV `ResetPasswordPage-CPSTOB2H.js` y el helper
  `authUrlParams-CnCX-cwo.js` respondieron HTTP 200 y contienen la protección
  de credenciales del flujo de recuperación.
- Los chunks consultados en producción respondieron HTTP 200 pero no contienen
  ese marcador de Fase 2, confirmando que el arreglo permanece aislado en DEV.

## Separación de guía de secretos DEV — 2026-09-28

- `docs/ROTACION_SECRETOS.md` ahora distingue explícitamente el proyecto
  Supabase `bknwerqbbysveehcdmzr` y `cubitat1-phase2-dev` de las instrucciones
  productivas históricas.
- Los comandos de Fase 2 usan siempre `--config wrangler.phase2-dev.jsonc`;
  no se modificaron secretos ni se incluyeron valores en la documentación.
## Corrección de mapa MapLibre en DEV — 2026-09-28

- Se corrigió la inicialización del mapa para tolerar estilos remotos que no
  emiten `load`/`idle` a tiempo: `styledata`, `render` y un timeout reversible
  habilitan las capas sin cambiar el contrato de producción.
- Se añadió un fallback aislado de marcadores DOM para MapLibre 6.11.2 cuando
  la fuente GeoJSON no aparece en el canvas; conserva los clics de propiedad y
  deja el clustering del canvas como camino principal.
- QA visual remoto en DEV: `/resultados?operacion=venta` mostró el mapa base y
  7 marcadores de precios correspondientes a las 7 propiedades visibles.
- Gates: lint correcto, 134 archivos/573 pruebas correctas, build productivo
  aislado correcto y `npm run build:phase2-dev` correcto. El mapa se desplegó
  únicamente en `cubitat1-phase2-dev`, versión
  `1b6c96d9-bb6f-45d9-bdae-211c4595ced1`.
- Producción no fue modificada. La caché PWA de sesiones antiguas puede
  conservar assets anteriores hasta que el Service Worker se actualice.

## Reconciliación de documentación de navegación y notificaciones — 2026-09-28

- `ResultsPage.md` ya no marca como decisión abierta la apertura del detalle:
  el flujo vigente usa `/propiedad/:slug`, conserva el contexto de resultados y
  restaura el modo lista/mapa al volver.
- `CubitatApp.md` ya no lista la campanita como tarea pendiente; la lectura,
  navegación interna y persistencia de notificaciones están implementadas y
  cubiertas por pruebas.
- La comprobación que permanece abierta es externa: recibir y pulsar una Push
  real con la PWA instalada en Android/iOS. No se hicieron escrituras remotas.

## Recuperación de activación Push — 2026-09-28

- Se corrigió `PushNotificationSettings`: cuando la preparación de VAPID o del
  Service Worker falla, el siguiente botón de reintento ahora continúa hasta
  activar la suscripción en el mismo gesto, en lugar de preparar y quedar
  aparentemente inerte.
- Regresión específica añadida: 6 pruebas del componente Push; suite completa
  en 134 archivos y 574 pruebas correctas.
- `npm run lint`, `npm run build`, `npm run build:phase2-dev` y el verificador
  de aislamiento pasaron. DEV se desplegó como `a372e3ab-5785-4393-a8e2-
  8302c2ba5c9d`; `/`, `/mi-cuenta` y `/sw.js` respondieron HTTP 200.
- Producción no fue modificada. La recepción y el toque de una Push real en
  Android/iOS continúan pendientes de QA físico.

## Reenvío de verificación documental — 2026-09-28

- El panel del propietario ahora permite enviar una nueva evidencia después de
  un rechazo; mantiene visible el motivo anterior y sigue bloqueando solo cuando
  existe una solicitud `pending`.
- Regresión añadida: el panel conserva el formulario disponible tras un rechazo.
  Suite completa: 134 archivos y 575 pruebas correctas.
- `npm run lint`, `npm run build`, `npm run build:phase2-dev` y los verificadores
  de aislamiento pasaron. DEV se desplegó como `396ff43c-ebce-4958-be23-
  93e5c5a8df22`; `/`, `/mi-cuenta`, `/mis-propiedades` y `/sw.js` respondieron
  HTTP 200 y el chunk remoto incluyó el panel y el formulario de reenvío.
- Producción no fue modificada. El E2E persistente con archivo real y revisión
  AAL2 queda pendiente por requerir una cuenta/fixture de QA y limpieza posterior.

## Mensajes seguros de CAPTCHA y correo — 2026-09-28

- `LoginModal` centraliza la traducción de errores de Supabase para OAuth,
  CAPTCHA/Turnstile, credenciales, confirmación y límites de correo; los
  detalles técnicos de proveedor ya no se muestran al usuario.
- `/api/auth/resend-confirmation` ahora responde indisponibilidad controlada
  cuando falta `RESEND_API_KEY`, la configuración pública de Supabase o el
  proveedor de correo devuelve un error. Ya no afirma que el mensaje fue
  enviado si no hubo entrega.
- Regresión focalizada: 6 pruebas; suite completa: 134 archivos y 578 pruebas.
  Lint, build productivo aislado y build Phase 2 DEV correctos.
- El helper quedó en módulo separado para conservar Fast Refresh limpio.
- DEV desplegado como `d4e3347a-a61e-4032-b420-256382a1e496`; raíz, cuenta,
  manifest y `sw.js` respondieron HTTP 200. El asset remoto confirmó los
  mensajes seguros y no contiene el texto técnico del secreto OAuth.
- Producción no fue modificada. Pendiente operativo: configurar y probar los
  secretos reales de Turnstile, correo y OAuth en DEV; no se incluyen valores
  en el repositorio ni en esta nota.

## Reenvío de correo con mensaje seguro — 2026-09-28

- El modal de autenticación conserva el mensaje seguro que devuelve
  `/api/auth/resend-confirmation` cuando el proveedor de correo no está
  disponible; si la respuesta no es JSON, mantiene un fallback genérico.
- Suite completa: 134 archivos y 578 pruebas; lint y builds productivo/DEV
  correctos.
- DEV desplegado como `b4314b14-2ff9-43b8-a070-6983806c04eb`; raíz, cuenta,
  manifest, `sw.js` y el chunk de autenticación respondieron HTTP 200.
- Producción permanece intacta.

## Clasificación de autorización - 2026-09-28

- Los tres avisos de React Doctor sobre campos de autorización fueron revisados
  contra código, RLS y triggers.
- Se clasifican como falsos positivos contextuales: no hay escritura de rol
  administrativo, el cambio `buyer/agent` exige KYC y `is_read` se actualiza
  únicamente con el `user_id` de la sesión.
- Se conserva el diagnóstico y no se tocaron migraciones.

## Cierre técnico incremental y despliegue DEV — 2026-09-28

- Se endurecieron los límites de error de autenticación y favoritos: los
  `catch` reciben `unknown` y los mensajes/códigos se leen con comprobaciones
  seguras, sin cambiar el contrato público ni mezclar módulos.
- Se añadió regresión directa para las preferencias estructuradas de permuta:
  construcción, validación, tolerancia a datos antiguos y resumen visible.
- Evidencia actual: `npm run lint`, `npm run test:run` con 135 archivos y 592
  pruebas, `npm run build` y `npm run build:phase2-dev` correctos.
- DEV desplegado como `0d11e5e1-cc70-4088-ad6a-856f9d3d4d41`; `/`,
  `/mi-cuenta`, `/moderar`, `manifest.webmanifest` y `sw.js` respondieron
  HTTP 200. Producción permanece sin cambios.
- Siguen abiertos únicamente validaciones externas o manuales ya identificadas:
  secretos reales de proveedores, entrega de correo controlada, moderación IA
  con `GROQ_API_KEY`, QA Push físico Android/iOS y revisión legal/contenido.

## Revalidación de gates y rutas DEV — 2026-09-28

- Repetición sobre el árbol actual: `npm run lint` correcto; `npm run test:run`
  correcto con 135 archivos y 592 pruebas; `npm run build` correcto con los
  dos verificadores de aislamiento de producción.
- `npm run build:phase2-dev` correcto con configuración Auth/Worker DEV,
  precache PWA de 51 entradas, sitemap DEV de 446 URLs y verificador KYC.
- Comprobación HTTP de solo lectura sobre el despliegue vigente
  `0d11e5e1-cc70-4088-ad6a-856f9d3d4d41`: `/`, `/mi-cuenta`, `/moderar`,
  `/manifest.webmanifest` y `/sw.js` devolvieron 200.
- No se desplegó una versión nueva porque no hubo cambios de código desde esa
  versión; producción permanece intacta.

## Revalidación remota de Supabase DEV — 2026-09-28

- `supabase migration list` confirmó coincidencia uno a uno entre las
  migraciones locales y remotas hasta `20260916010000`; no hay migraciones
  pendientes ni deriva.
- `supabase db lint --linked --level warning` terminó con `No schema errors
  found` en `extensions` y `public`.
- Ambas comprobaciones fueron de solo lectura; no se aplicaron cambios al
  esquema ni a producción.

## Limpieza de regresiones PWA — 2026-09-28

- Las pruebas de `PWAInstallPrompt` ahora envuelven en `act` las acciones
  asíncronas de instalación y "Quizás luego", eliminando avisos de React que
  podían ocultar regresiones del flujo de instalación.
- Prueba focalizada: 10/10; suite completa: 135/592; lint, build productivo y
  build Phase 2 DEV correctos.
- El cambio solo afecta pruebas; no requirió nuevo despliegue. Producción y el
  Worker DEV permanecen sin cambios de runtime.

## Manejo seguro de cancelación en detalle — 2026-09-28

- `DetailPage` ya trata el error de `navigator.share()` como `unknown` y solo
  activa el fallback cuando no es una cancelación `AbortError`; se eliminó un
  límite `any` sin cambiar el comportamiento visible.
- Prueba focalizada: 15/15; suite completa: 135/592; lint y builds
  productivo/DEV correctos.
- Se publicó únicamente DEV como `02d589ac-1c10-4369-9b0d-ba461260ab42`;
  `/`, `/mi-cuenta`, `/moderar`, `manifest.webmanifest` y `sw.js` respondieron
  HTTP 200. Producción permanece intacta.

## Callback OAuth con errores tipados — 2026-09-28

- `AuthCallbackPage` ya trata los errores del intercambio OAuth/email como
  `unknown` y solo usa el mensaje de una instancia real de `Error`; el mensaje
  seguro para PKCE, expiración y tokens se conserva.
- Prueba focalizada: 5/5; suite completa: 135/592; lint y builds
  productivo/DEV correctos.
- Se publicó únicamente DEV como `bbaed447-5590-49c6-9f0e-ac4a21ba7af1`;
  `/`, `/auth/callback`, `/mi-cuenta`, `/moderar`, `manifest.webmanifest` y
  `sw.js` respondieron HTTP 200. Producción permanece intacta.

## Rate limiter con almacenamiento tipado — 2026-09-28

- El Durable Object `RateLimiter` ya no usa `any`: su almacenamiento tiene un
  contrato explícito y valida registros recuperados antes de reutilizarlos.
  Datos corruptos o incompletos comienzan una ventana nueva y no alteran la
  cuota válida.
- Se añadió regresión para datos almacenados con `NaN`; suite completa: 135
  archivos y 593 pruebas correctas. Lint y builds productivo/DEV correctos.
- DEV desplegado como `e534c947-45fe-4126-82b2-d9d1efd931f2`; las rutas base,
  callback, cuenta, moderación, manifest y service worker respondieron 200.
  Producción permanece intacta.

## API Turnstile tipada — 2026-09-28

- `TurnstileWidget` define una interfaz local para `window.turnstile` y elimina
  los accesos `window as any`, manteniendo render, remove, getResponse y los
  callbacks de expiración/error.
- Prueba focalizada: 2/2; suite completa validada con 135 archivos y 593
  pruebas; lint, build productivo y build Phase 2 DEV correctos.
- El cambio es de tipos y no altera el JavaScript servido; no requirió nuevo
  despliegue. DEV permanece en `e534c947-45fe-4126-82b2-d9d1efd931f2` y
  producción permanece intacta.

## CubitatApp con límites de datos seguros — 2026-09-28

- La carga de rol desde `profiles` valida que el resultado sea un objeto con
  `role` string antes de actualizar el estado.
- La carga SWR de propiedades trata los errores como `unknown` y solo usa
  `Error.message` cuando corresponde; el fallback genérico se conserva.
- Prueba focalizada: 4/4; suite completa: 135/593; lint y builds
  productivo/DEV correctos.
- DEV desplegado como `364df13f-f3c9-45c8-ada8-0bd345b802cf`; `/`,
  `/auth/callback`, `/mi-cuenta`, `/moderar`, `manifest.webmanifest` y `sw.js`
  respondieron HTTP 200. Producción permanece intacta.

## Guard completo del dispatcher de alertas DEV — 2026-09-28

- El dispatcher ahora exige también `ALERT_EMAIL_FROM` además de
  `PHASE2_ENABLED`, `PUBLIC_SITE_URL`, `RESEND_API_KEY` y la clave de servicio;
  si falta el remitente, no reclama ni intenta enviar ninguna alerta.
- La regresión correspondiente quedó cubierta en la suite: 135 archivos y
  587 pruebas correctas. Lint, build productivo aislado y
  `build:phase2-dev` terminaron correctamente.
- DEV desplegado como
  `4617a3d5-5d5e-4cfb-9fd3-b252f326f272`; `/` y `/moderar` respondieron HTTP
  200. Producción permanece sin cambios.

## Guard de callback y remitente de autenticación DEV — 2026-09-28

- El reenvío de confirmación ya no cae al callback ni al remitente productivos
  cuando `PHASE2_ENABLED=true` y falta `PUBLIC_SITE_URL` o `ALERT_EMAIL_FROM`.
  En ese caso responde de forma segura sin iniciar el envío.
- Se añadieron dos regresiones de aislamiento; la suite quedó en 135 archivos y
  589 pruebas correctas. Lint, build productivo aislado y
  `build:phase2-dev` terminaron correctamente.
- DEV desplegado como
  `83dac546-0cda-4fe3-b87a-0dd9ce6f60a7`; `/` respondió HTTP 200 y producción
  también respondió HTTP 200 en una comprobación de solo lectura. Producción
  no fue desplegada ni modificada.

## Inventario operativo de secretos DEV — 2026-09-28

- Consulta de solo lectura con Wrangler: `cubitat1-phase2-dev` tiene
  `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, las tres claves VAPID y el
  salt de métricas; el Worker no tiene `GROQ_API_KEY`.
- El Worker verificador `turnstile-siteverify-cubitat` sí tiene
  `TURNSTILE_SECRET_KEY`.
- `supabase secrets list --project-ref bknwerqbbysveehcdmzr` devolvió una lista
  vacía; esto no expone ni modifica la configuración de proveedores Auth.
- La ausencia de Groq queda como bloqueo externo específico; no se cambia el
  comportamiento seguro de degradación a revisión manual.

## Parsers tipados de métricas y autenticación — 2026-09-28

- Las respuestas JSON de Cloudflare Metrics y los cuerpos de solicitudes de
  autenticación se validan como `unknown`; se eliminaron dos fronteras `any`
  sin cambiar el contrato de respuesta.
- Suite: 135 archivos y 590 pruebas; lint, build productivo aislado y
  `build:phase2-dev` correctos.
- DEV desplegado como `91fe9f21-063a-482e-86ba-03e901aec5c0`; `/` y `/moderar`
  respondieron HTTP 200. Producción también respondió HTTP 200 en lectura y
  no fue modificada.

## Manejo seguro de fallos de correo Auth DEV — 2026-09-28

- `sendAlreadyConfirmedEmail` ahora captura fallos de red del proveedor Resend
  y devuelve la respuesta segura de indisponibilidad, en lugar de propagar un
  error no controlado.
- Regresión añadida: la suite quedó en 135 archivos y 590 pruebas correctas.
  Lint, build productivo aislado y `build:phase2-dev` terminaron correctamente.
- DEV desplegado como
  `04b59b38-b4f6-4bb6-9572-7ece5bfeec86`; `/` y `/moderar` respondieron HTTP
  200. Producción también respondió HTTP 200 en lectura y no fue modificada.

## Validación de esquema remoto DEV — 2026-09-28

- `supabase db lint --linked --level warning` terminó con `No schema errors
  found` después de un primer fallo transitorio de conexión.
- `supabase db push --linked --dry-run` confirmó `Remote database is up to
  date`; no se aplicaron migraciones ni se crearon datos.

## Inventario final de migraciones DEV — 2026-09-28

- `supabase migration list --linked` mostró coincidencia completa entre las
  migraciones locales y remotas, incluida la última `20260916010000`.
- No hay deriva de migraciones ni migraciones pendientes; esta comprobación fue
  de solo lectura y no modificó la base de datos.

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

## Guard de callback y remitente de autenticación DEV — 2026-09-28

- El reenvío de confirmación ya no cae al callback ni al remitente productivos
  cuando `PHASE2_ENABLED=true` y falta `PUBLIC_SITE_URL` o `ALERT_EMAIL_FROM`.
  En ese caso responde de forma segura sin iniciar el envío.
- Se añadieron dos regresiones de aislamiento; la suite quedó en 135 archivos y
  589 pruebas correctas. Lint, build productivo aislado y
  `build:phase2-dev` terminaron correctamente.
- DEV desplegado como
  `83dac546-0cda-4fe3-b87a-0dd9ce6f60a7`; `/` respondió HTTP 200 y producción
  también respondió HTTP 200 en una comprobación de solo lectura. Producción
  no fue desplegada ni modificada.

## Guard de ejecución del dispatcher DEV — 2026-09-28

### Parser seguro de confirmación de correo

- `getEmailConfirmedAt` ya trata las respuestas de Supabase como `unknown` y
  valida usuarios, filas y fechas antes de usarlas; se eliminó el `any` de esa
  frontera de autenticación.
- Gates: lint, 135 archivos y 586 pruebas, build productivo aislado y
  `build:phase2-dev` correctos.
- DEV desplegado como `6b8e21d9-a84d-4565-b4e1-9e0fccfeda76`; producción sin
  cambios.

### Cobertura final de correo por entorno

- Se añadieron regresiones para el callback DEV y para el remitente DEV del
  flujo de cuentas ya confirmadas. La suite quedó en 135 archivos y 586
  pruebas correctas.
- El runtime correspondiente ya está desplegado en DEV como
  `17c1519e-ab2e-41a8-8ce3-49c680c1bf96`; producción permanece sin cambios.

### Reenvío de confirmación aislado por entorno

- El callback de `/api/auth/resend-confirmation` usa `PUBLIC_SITE_URL` y el
  correo de cuenta ya confirmada usa `ALERT_EMAIL_FROM`; DEV ya no reutiliza
  callback ni remitente productivos.
- La regresión quedó cubierta con 585 pruebas; lint y ambos builds pasaron.
- DEV desplegado como `17c1519e-ab2e-41a8-8ce3-49c680c1bf96`. Producción no fue
  desplegada ni modificada.

### Remitente DEV aislado

- El Worker DEV define `ALERT_EMAIL_FROM` como `Cubitat DEV
  <onboarding@resend.dev>` y el verificador rechaza configuraciones sin ese
  remitente no productivo. Última versión desplegada:
  `f7704d95-8ef0-4600-8dd6-31cf7712cbe0`.

### Revalidación final del guard

- Tras exigir también `PUBLIC_SITE_URL`, la suite quedó en 135 archivos y 584
  pruebas correctas; lint y los builds productivo/DEV volvieron a pasar.
- DEV quedó actualizado a `2786d548-e33b-4c2e-a328-f5748ae5def7`.
- Sin `PHASE2_ENABLED` o sin `PUBLIC_SITE_URL`, el dispatcher termina sin
  consultar red ni reclamar notificaciones.

- El dispatcher de alertas por correo exige `PHASE2_ENABLED=true` antes de
  consultar Supabase o Resend. En cualquier otro entorno termina sin llamadas
  de red y registra `phase2_disabled`, reforzando el aislamiento de Fase 2.
- La regresión específica quedó cubierta y la suite pasó con 135 archivos y
  583 pruebas; también pasaron lint, build productivo aislado y
  `build:phase2-dev`.
- Se desplegó únicamente DEV como `3f0e9602-0a0d-4ad6-aa0e-17859dd7b33c`.
  DEV respondió HTTP 200 en `/` y `/moderar`; producción respondió HTTP 200 en
  una comprobación de solo lectura y no fue desplegada.
- Sigue pendiente una entrega real controlada de correo con un destinatario
  DEV autorizado. No se enviaron mensajes durante esta validación.

## Revalidación de gates — 2026-09-28

- `npm run lint` pasó sin errores.
- `npm run test:run` pasó con 134 archivos y 579 pruebas.
- `npm run build` pasó con aislamiento productivo y sitemap de 446 URLs.
- `npm run build:phase2-dev` pasó con el verificador de Auth DEV, sitemap DEV
  de 446 URLs y verificador del bundle Phase 2.
- Un primer intento del build DEV no pudo consultar Supabase por la restricción
  de red del entorno de ejecución (`EACCES`); el reintento con acceso de red
  autorizado pasó. No es un fallo del producto ni se modificó producción.

## Regla anti-duplicado DEV — 2026-09-28

- Se aplicó únicamente al proyecto Supabase DEV la migración
  `20260928010000_property_duplicate_rules.sql`.
- La prueba `supabase/tests/property_duplicate_rules.sql` pasó en una
  transacción: detectó una coincidencia activa, creó un flag privado y añadió
  el aviso de revisión; `ROLLBACK` confirmó que no quedaron datos QA.
- El comportamiento es una señal para moderación, no un rechazo automático.
  Queda pendiente revisar falsos positivos antes de considerar un eventual
  traslado fuera de DEV.

## Ciclo de revisión de duplicados en DEV — 2026-09-28

- Se aplicó únicamente en DEV la migración incremental
  `20260928020000_resolve_duplicate_flags_on_review.sql`.
- Una decisión final (`published`, `ai_rejected`, `paused` u `owner_hidden`)
  marca la señal como resuelta; si la publicación vuelve a `pending_review` o
  `ai_approved`, la señal se abre de nuevo para el moderador.
- El panel consulta solo señales no resueltas, evitando que un aviso histórico
  siga apareciendo después de una decisión final.
- La prueba remota transaccional pasó en DEV y terminó con `ROLLBACK`.

## Panel de duplicados en DEV — 2026-09-28

- Moderación carga los flags privados solo cuando `PHASE_TWO_ENABLED` está
  activo; producción no consulta la tabla DEV-only.
- La tarjeta administrativa muestra el título del anuncio relacionado y pide
  revisar ambos antes de aprobar.
- Regresiones focalizadas y suite: 135 archivos, 581 pruebas correctas.
- Build productivo aislado y build DEV correctos. DEV desplegado como
  `7febd479-a185-4958-9fc9-7ef21f69bcab`; `/` y `/moderar` respondieron HTTP
  200. Producción no fue modificada.

## Revisión autónoma de cierre técnico — 2026-09-28

- Se contrastaron las especificaciones de notificaciones, autenticación y
  administración con sus implementaciones y pruebas. No quedó un requisito
  técnico local huérfano en esos carriles.
- El clic de una Push conserva únicamente destinos internos, enfoca o abre la
  PWA y marca el aviso como leído al restaurar la sesión; la bandeja lo retira
  mediante actualización local y Realtime.
- OAuth, CAPTCHA, recuperación y MFA mantienen mensajes seguros y controles
  AAL2; administración conserva la separación por módulos y las barreras de
  rol.
- Se corrigió la especificación de cuenta para reflejar el alcance vigente de
  alertas: la bandeja es interna y no muestra el aviso técnico de DEV ni el
  formulario de correo mientras la entrega por email no esté activa.
- Verificación repetida: `npm run lint`, 134 archivos y 578 pruebas correctas,
  `npm run build` correcto con aislamiento productivo y
  `npm run build:phase2-dev` correcto con el módulo KYC y 446 URLs.
- No se desplegó ni modificó producción en esta revisión. Permanecen como
  pendientes externos la configuración de secretos de proveedores, las
  pruebas persistentes con cuentas/dispositivos reales y la decisión pública
  del Trust Score.
- Comprobación remota de solo lectura posterior: DEV respondió HTTP 200 en
  `/`, `/mi-cuenta`, `/manifest.webmanifest` y `/sw.js`.
- Revalidación de Supabase DEV: `supabase db lint --linked --level warning`
  terminó con `No schema errors found` y `supabase db push --linked --dry-run`
  confirmó `Remote database is up to date`; no se aplicaron migraciones.
- El CLI volvió a advertir que CAPTCHA, Resend y OAuth Google requieren
  configuración externa disponible en DEV; no se copiaron valores ni se
  alteraron secretos.

## Expiración de recuperación y sincronización Auth DEV — 2026-09-28

- La especificación exige enlaces de recuperación de 15 minutos. Se ajustó
  `web/supabase/config.toml` a `otp_expiry = 900` y se añadió una regresión
  dedicada; la suite quedó en 134 archivos y 579 pruebas correctas.
- Los gates posteriores pasaron: lint, build productivo aislado y build
  `phase2-dev` con KYC incluido y 446 URLs.
- `supabase config push` sincronizó únicamente el proyecto DEV
  `bknwerqbbysveehcdmzr`; una segunda ejecución confirmó `Remote Auth config is
  up to date`. La configuración conserva `site_url` DEV y los redirects DEV,
  productivos y locales.
- Durante la primera sincronización se detectó que la configuración local
  tenía `site_url` productivo; se restauró de inmediato el origen DEV antes de
  continuar. Producción no fue modificada ni se expusieron secretos.
- `build:phase2-dev` incorpora ahora `verify-phase2-dev-config.mjs`, que bloquea
  automáticamente un `site_url` productivo, redirects DEV ausentes o una
  expiración de recuperación distinta de 15 minutos.

## Aislamiento SEO del build DEV — 2026-09-28

- Se corrigió el generador de sitemap para aceptar `--phase2-dev`: el sitemap
  y `robots.txt` DEV usan el origen `cubitat1-phase2-dev` y se escriben solo en
  `dist/`, sin contaminar los archivos fuente productivos.
- El verificador DEV rechaza URLs productivas en esos artefactos. Evidencia del
  último build: `public/sitemap.xml` conserva producción; `dist/sitemap.xml`
  contiene solo el origen DEV.
- El build combinado pasó lint, 134 archivos/579 pruebas, build productivo
  aislado y build Phase 2 DEV con 446 URLs. Producción no fue modificada.
- Se desplegó únicamente DEV como `c1cda044-5e53-47de-a4b3-4ba2f954b112`;
  `sitemap.xml` y `robots.txt` respondieron HTTP 200 sin referencias
  productivas. El manifest y `sw.js` también respondieron HTTP 200.

## Auditoría de dependencias — 2026-09-28

- El espejo npm configurado (`registry.npmmirror.com`) no implementa el
  endpoint de auditoría y devolvió `404 NOT_IMPLEMENTED`.
- La misma comprobación contra `https://registry.npmjs.org` terminó con
  `found 0 vulnerabilities` usando `npm audit --audit-level=high`.
- No se modificaron dependencias.

## Validación tipada del endpoint de reenvío — 2026-09-28

- El cuerpo de `/api/auth/resend-confirmation` ahora se trata como `unknown` y
  solo se lee `email` después de comprobar que existe como propiedad; se
  eliminó el `any` de ese límite de entrada.
- Pruebas del Worker: 46/46; suite completa: 134 archivos y 578 pruebas.
  Lint, build productivo aislado y build DEV correctos.
- DEV desplegado como `acaf392b-46c5-4447-9f1d-d97c9a8a5226`; raíz, cuenta,
  manifest y `sw.js` respondieron HTTP 200.
- Producción permanece intacta.

## Reenvío de correo con mensaje seguro — 2026-09-28

- El modal de autenticación conserva el mensaje seguro que devuelve
  `/api/auth/resend-confirmation` cuando el proveedor de correo no está
  disponible; si la respuesta no es JSON, mantiene un fallback genérico.
- Suite completa: 134 archivos y 578 pruebas; lint y builds productivo/DEV
  correctos.
- DEV desplegado como `b4314b14-2ff9-43b8-a070-6983806c04eb`; raíz, cuenta,
  manifest, `sw.js` y el chunk de autenticación respondieron HTTP 200.
- Producción permanece intacta.
## Endurecimiento de tipos y despliegue DEV — 2026-09-28

- `CubitatApp` filtra las operaciones de la URL contra `OPERATION_VALUES` y el
  formulario de publicación usa claves de amenidades restringidas al modelo,
  eliminando dos accesos `any` del flujo de usuario.
- `npm run lint`, `npm run build` y `npm run build:phase2-dev` pasaron; el
  bundle DEV confirmó la inclusión de KYC y generó 446 URLs.
- Se desplegó únicamente `cubitat1-phase2-dev` como
  `e393db88-cda4-4986-94c6-c2e36e4af6d8`. `/`, `/auth/callback`, `/mi-cuenta`,
  `/moderar`, `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200.
- Producción continúa intacta. Los avisos del runner de pruebas (`happy-dom`,
  `act(...)` y proveedores simulados) no constituyen fallos de tests.

## Tipado del retorno al listado y despliegue DEV — 2026-09-28

- `DetailPage` conserva `property.operation` como `OperationType` al volver a
  la búsqueda, eliminando un cast `any` sin cambiar el comportamiento del
  filtro.
- Lint y las 15 pruebas focalizadas de detalle pasaron; también pasaron los
  builds productivo y DEV, con el verificador de aislamiento de producción y
  el bundle DEV de KYC.
- Se desplegó únicamente DEV como
  `dfd07087-881f-43b5-a5ab-f2a0c50c5b75`. Las rutas de aplicación, manifest y
  Service Worker respondieron HTTP 200; una ruta de propiedad inexistente
  devolvió 404, como corresponde. Producción continúa intacta.

## Validación segura de SEO dinámico y despliegue DEV — 2026-09-28

- La consulta de SEO del Worker trata como `unknown` la respuesta JSON de
  Supabase y solo usa título, descripción, imagen y precio cuando tienen el
  tipo esperado. Se conserva la generación dinámica de metadatos.
- El lint, las 51 pruebas del Worker, el build productivo y el build DEV
  pasaron; el bundle productivo continúa sin módulos exclusivos de Fase 2.
- Se desplegó solo DEV como
  `783d47fc-e2f2-4e28-a478-aedea68f0ba1`. Las rutas principales respondieron
  HTTP 200 y una propiedad DEV existente generó correctamente `title` y
  `og:title` dinámicos. Producción continúa intacta.

## Regresión de respuesta SEO malformada — 2026-09-28

- `worker.test.ts` cubre una respuesta de Supabase con filas que no son
  objetos; el Worker no intenta leer propiedades inexistentes y devuelve la
  respuesta segura de propiedad no encontrada.
- La suite focalizada del Worker pasó 52/52. Es una ampliación de pruebas sin
  cambio de runtime, por lo que no requiere nuevo despliegue.

## Auditoría de TODOs técnicos — 2026-09-28

- La revisión de los carriles de administración, KYC, agentes, Push y
  autenticación no encontró TODOs técnicos explícitos pendientes.
- Los pendientes abiertos de Fase 2 son externos o manuales: proveedores,
  dispositivos físicos, contenido/legal y decisiones de producto.
- `npm run lint` volvió a pasar sin errores.

## Aislamiento de verificación documental y despliegue DEV — 2026-09-28

- El build productivo detectó que `MyPropertiesPage` incluía de forma estática
  `PropertyVerificationPanel`, un módulo exclusivo de Fase 2.
- El panel ahora usa carga diferida condicionada a DEV/Fase 2; los verificadores
  de producción también cubren sus nombres y marcadores de base de datos.
- Gates comprobados: lint correcto, suite completa **135/594**, build
  productivo aislado y build DEV con KYC y sitemap de 446 URLs.
- DEV desplegado como `c451aa01-9194-4bf1-9bbb-b5336f6117c9`; rutas principales,
  manifest y Service Worker respondieron HTTP 200. Producción intacta.

## Revalidación remota de Supabase DEV — 2026-09-28

- `supabase migration list` confirmó alineación local/remota hasta
  `20260916010000`.
- `supabase db lint --linked --level warning` devolvió `No schema errors found`.
- No se aplicaron migraciones nuevas ni se escribió en producción.

## Inventario de secretos DEV — 2026-09-28

- El listado nominal del Worker DEV confirma Resend, Supabase service role y
  VAPID configurados.
- `GROQ_API_KEY` no está configurada. La moderación degrada a
  `pending_review`/revisión manual de forma segura; no se expusieron valores.

## E2E local — 2026-09-28

- El escenario local de publicación pasó.
- Los escenarios que consultan backend no pudieron completar porque Supabase
  local no está disponible en `127.0.0.1:54321`; se observaron `502` y
  `ECONNREFUSED`. La prueba externa de clave dummy además quedó limitada por
  `EACCES` de red.
- El resultado no se interpreta como aprobación de E2E backend; requiere
  Docker/Supabase local o una ejecución con conectividad autorizada.
- `docker ps` confirmó que el daemon `docker_engine` no está disponible; no se
  hicieron cambios del sistema para forzarlo.

## E2E remoto contra DEV — 2026-09-28

- Playwright admite `CUBITAT_E2E_BASE_URL` y mantiene `localhost` como valor por
  defecto; las mutaciones QA siguen requiriendo autorización explícita.
- El escenario de búsqueda se alineó con provincia/municipio y rutas SEO.
- Prueba de búsqueda remota de solo lectura: **1/1 pasada** contra DEV.
- No se desplegó porque el cambio quedó limitado a pruebas/configuración.

## E2E remoto de seguridad y Turnstile — 2026-09-28

- Turnstile y formularios de contacto/reporte/registro/recuperación: **1/1**.
- Seguridad del proxy y endpoints protegidos: **4/4**.
- Las URLs del escenario de seguridad son configurables para DEV remoto.
- Gates posteriores correctos: lint, 135/594, build productivo aislado y build
  DEV. No se desplegó runtime.

## E2E remoto de publicación — 2026-09-28

- El asistente de publicación pasó **1/1** contra DEV usando sesión simulada y
  borrador local; no se creó ninguna publicación persistente.
- Publicación real, correo, Push, cuentas persistentes y dispositivos siguen
  requiriendo sus pruebas específicas.

## Robustez del envío KYC — 2026-09-28

- `useKycSubmission` conserva el error específico de compresión, limpia
  evidencias huérfanas y siempre libera el estado de carga ante excepciones.
- Pruebas focalizadas 13/13; suite completa 136/597; lint y ambos builds
  correctos. El build DEV se repitió con red y verificó 446 URLs.
- DEV desplegado como `2ef50ca4-e1b5-4562-9623-26a17a8344c5` y rutas base,
  cuenta, moderación, manifest y Service Worker respondieron HTTP 200.
- React Doctor posterior quedó en 176 incidencias; desapareció el aviso de
  reinicio de carga fuera de `finally` para el flujo KYC.
- Producción intacta.

## Accesibilidad del buscador de moderación — 2026-09-28

- `PropertiesTab` ahora asocia una etiqueta para lectores de pantalla al
  buscador administrativo.
- React Doctor posterior quedó en 175 incidencias.
- DEV desplegado como `bb95caed-a36f-46f5-9819-df6dc96ae6ce`; rutas públicas,
  moderación, manifest y Service Worker respondieron HTTP 200.
- Producción intacta.

## Auditoría pública DEV posterior — 2026-09-28

- `comprehensive-audit.spec.ts` pasó 1/1 contra el Worker DEV en Chromium.
- Se verificaron Inicio y Resultados sin credenciales ni escrituras
  persistentes; las pruebas autenticadas siguen separadas.

## Corrección del borrador y auditoría React — 2026-09-28

- `usePublicationDraft` dejó de mutar refs durante el render; las referencias
  se actualizan en efectos comprometidos.
- Prueba focalizada: 3/3; suite completa: 135 archivos y 594 pruebas.
- `npm run audit:react` pasó de 181 a 179 incidencias y ya no reporta la regla
  de mutación de refs. Permanecen avisos de autorización/RLS que requieren
  contraste con políticas activas, triggers y RPC antes de editar migraciones.
- `npm run lint`, `npm run build` y `npm run build:phase2-dev` pasaron; no se
  modificó producción.
- Después se desplegó el runtime DEV para validar el comportamiento servido:
  versión `779aad98-9f56-4900-b690-9ca21ec303f1`. Las rutas `/`, `/mi-cuenta`,
  `/publicar`, `/manifest.webmanifest` y `/sw.js` respondieron HTTP 200.
- El E2E remoto `publish.spec.ts` pasó **1/1** contra esa versión; no creó una
  publicación persistente.
- La revalidación agrupada de búsqueda, seguridad, Turnstile y publicación
  pasó **7/7** contra DEV; no hubo escrituras persistentes.
- `comprehensive-audit.spec.ts` ya valida Home y Resultados sin credenciales;
  DEV pasó 1/1. El tramo autenticado solo se ejecuta cuando existen variables
  E2E explícitas.

## Accesibilidad del aviso administrativo — 2026-09-28

- `AdminNoticeDialog` enlaza ahora título y mensaje con el `alertdialog`.
- Prueba focalizada 1/1; suite completa 136/596; lint y ambos builds correctos.
- DEV desplegado como `a57e1d1c-1c1f-47b0-9423-1b4eedf7640f`; rutas principales,
  moderación, manifest y Service Worker respondieron HTTP 200.
- Producción continúa intacta.
- Un intento posterior de `supabase migration list`/`db lint` quedó bloqueado
  por `EPERM` al escribir la telemetría local del CLI. No se tocaron Docker,
  el enlace ni el esquema remoto.

## Robustez del endpoint de métricas — 2026-09-28

- El Worker comprueba `response.ok` antes de interpretar la respuesta de
  Cloudflare GraphQL y conserva el fallback seguro ante errores upstream.
- Regresión focalizada 53/53; suite completa 135/595; lint y ambos builds
  correctos.
- DEV desplegado como `01798924-988a-43df-8a19-167ee8df626e`.
- E2E remoto de seguridad posterior al despliegue: 4/4. Producción intacta.
- React Doctor quedó en 178 incidencias y ya no reporta el `fetch` sin
  comprobación de estado. El aviso de `createObjectURL` en KYC queda como
  falso positivo contextual porque el hook revoca las URLs en cleanup.

## Cobertura RLS ampliada - 2026-09-28

- La matriz `supabase/tests/phase2_local_security.sql` comprueba ahora que el
  cliente no inserte contactos ni reportes directamente.
- Comprueba además que solo el propietario pueda marcar su notificación como
  leída.
- Gates: lint correcto, 136 archivos y 597 pruebas, build productivo correcto
  y build DEV correcto.
- La ejecución remota de la matriz queda pendiente porque Supabase CLI intenta
  usar `pg_prove` mediante Docker y `dockerDesktopLinuxEngine` no está activo.

## Accesibilidad de formularios y despliegue DEV - 2026-09-28

- Se asociaron etiquetas al selector de avatar y al formulario de reportes.
- Focalizadas 24/24; React Doctor sobre cambios sin avisos de accesibilidad en
  los controles corregidos.
- Gates completos: lint, 136/597 pruebas, build productivo y build DEV.
- DEV desplegado como `22c90271-477f-486f-bcb8-f09be083957f`; las rutas base,
  moderación, manifest y Service Worker respondieron HTTP 200.
- Auditoría pública E2E posterior: `comprehensive-audit.spec.ts`, 1/1 correcta
  contra DEV sin escrituras persistentes.
- Producción permanece intacta.

## Revalidación autónoma posterior - 2026-09-28

- Gates actuales: lint correcto, 136 archivos/597 pruebas, build productivo
  aislado correcto y build `phase2-dev` correcto con KYC y 446 URLs DEV.
- Supabase DEV: `db lint` sin errores y `db push --dry-run` actualizado; no se
  aplicaron migraciones ni se escribieron datos.
- Auditoría pública E2E: `comprehensive-audit.spec.ts` pasó 1/1 en Chromium,
  sin credenciales ni escrituras persistentes.
- `wrangler check startup` terminó correctamente con una ventana local de
  23.6 ms. No se detectó un problema de arranque.
- El inventario nominal de secretos DEV confirma Push, Resend, Supabase
  service role y sal de métricas. Faltan `GROQ_API_KEY`, CAPTCHA, Resend Auth y
  OAuth Google Auth como configuración externa disponible para completar sus
  pruebas reales.
- Push/PWA físico en Android/iOS, QA persistente autenticada y decisión pública
  de Trust Score siguen pendientes. Producción permanece intacta.

## Protección de dependencias en CI - 2026-09-28

- `.github/workflows/phase2-quality.yml` ejecuta ahora `npm audit
  --audit-level=high` contra el registro oficial después de instalar
  dependencias.
- La auditoría actual terminó con `found 0 vulnerabilities`; no se
  modificaron dependencias ni se desplegó producción.

## Aislamiento runtime producción/DEV - 2026-09-28

- La portada productiva respondió HTTP `200` en lectura.
- El HTML servido no contiene el origen DEV ni el marcador
  `worker-phase2-dev`.
- Producción no fue desplegada ni modificada.

## Versión DEV publicada - 2026-09-28

- `wrangler versions list --config wrangler.phase2-dev.jsonc` confirmó como
  última versión publicada `22c90271-477f-486f-bcb8-f09be083957f`.
- La consulta fue de solo lectura; no se creó, promovió ni revirtió ninguna
  versión.

## Despliegue DEV activo - 2026-09-28

- `wrangler deployments list --config wrangler.phase2-dev.jsonc` confirmó que
  la versión `22c90271-477f-486f-bcb8-f09be083957f` recibe el 100% del tráfico
  DEV.
- No se modificó el reparto de tráfico ni se ejecutó rollback.

## Reconciliación con el roadmap histórico - 2026-09-28

- El roadmap del vault está fechado el `2026-07-27` y conserva como histórico
  que Web Push estaba diferido. El repositorio actual incorpora posteriormente
  suscripción, preferencias, dispatcher, Service Worker y lectura de Push; por
  eso la matriz vigente lo clasifica como implementado técnicamente y pendiente
  solo de QA físico Android/iOS.
- Trust Score permanece como indicador interno DEV y no se expone como
  certificación pública; la decisión pública sigue diferida.
- La fecha y el contexto del roadmap histórico se conservan; no se marca como
  evidencia actual de cierre.

## Historial de migraciones DEV - 2026-09-28

- `supabase migration list` confirmó coincidencia local/remota hasta
  `20260916010000`, sin migraciones estándar pendientes.
- `web/supabase/dev-migrations` permanece como carril separado; sus archivos no
  se cuentan como aplicados por el historial estándar sin evidencia explícita.

## E2E público y seguridad DEV - 2026-09-28

- La ejecución con red local restringida produjo `ERR_NETWORK_ACCESS_DENIED` y
  `EACCES` antes de recibir respuestas; no se tomó como fallo del producto.
- La repetición con conectividad autorizada pasó **7/7** en Chromium:
  auditoría pública, búsqueda, Turnstile y cuatro escenarios de seguridad
  (proxy Supabase, clave dummy, moderación IA y métricas sin sesión admin).
- No se ejecutaron publicaciones reales, alertas autenticadas ni envíos de
  correo durante este bloque; permanecen pendientes por requerir cuentas QA,
  datos de prueba y limpieza verificable.

## Portabilidad del E2E autenticado - 2026-09-28

- `web/e2e/test-flow-real.spec.ts` dejó de fijar `localhost` y ahora respeta
  `CUBITAT_E2E_BASE_URL`, incluido el endpoint proxy usado para consultar la
  propiedad creada durante la prueba.
- Las capturas usan los artefactos de Playwright mediante `testInfo.outputPath`;
  se eliminó la dependencia de una ruta personal externa al repositorio.
- El escenario mantiene el consentimiento explícito para mutaciones mediante
  `CUBITAT_E2E_ALLOW_MUTATIONS=true` y exige credenciales QA.
- Gates posteriores: lint correcto, 136/597 pruebas correctas, build
  productivo aislado correcto y build `phase2-dev` correcto con 446 URLs.

## Revalidación remota posterior - 2026-09-28

- `wrangler deployments list` confirmó la versión DEV
  `22c90271-477f-486f-bcb8-f09be083957f` al 100% del tráfico.
- Las cinco rutas críticas DEV (`/`, `/mi-cuenta`, `/moderar`, manifest y
  Service Worker) respondieron `200` en lectura.
- Producción respondió `200` y permaneció sin referencias al origen DEV ni al
  Worker de Fase 2.
- No se desplegó el cambio de esta tanda porque solo afecta pruebas E2E.

## Revisión de secretos DEV posterior - 2026-09-28

- La lista nominal del Worker sigue sin `GROQ_API_KEY`; permanecen también
  fuera del Worker los secretos externos de CAPTCHA, Resend Auth y OAuth Google
  Auth.
- La consulta mostró únicamente nombres (`secret list`), nunca valores.
- No se modificó ningún secreto; la moderación IA real y las pruebas de
  proveedores continúan pendientes de configuración autorizada.

## Auditoría React Doctor posterior - 2026-09-28

- React Doctor escaneó 349 archivos y reportó 171 incidencias: 7 de seguridad,
  26 de mantenibilidad, 43 de rendimiento, 31 de bugs y 64 de accesibilidad.
- Los tres avisos de campos de autorización se mantienen como hallazgos
  contextuales revisados contra código, triggers y matriz SQL.
- Los tres avisos RLS señalan políticas de migraciones iniciales, no una prueba
  directa del esquema vigente. Las migraciones posteriores
  `20260705000000_secure_properties_policies.sql`,
  `20260706003000_harden_properties_and_reports_policies.sql` y
  `20260711002000_harden_profiles_contacts_reports.sql` las reemplazan con
  políticas restringidas.
- No se suprimieron avisos ni se afirmó cierre: falta confirmar el estado
  efectivo remoto mediante dump o matriz SQL con Docker disponible.

## Liberación de previews KYC - 2026-09-28

- `useKycSubmission` revoca la URL previa antes de reemplazarla y libera las
  URLs activas al limpiar el archivo o desmontar el hook.
- La cobertura focalizada añadió los casos de reemplazo y desmontaje; la suite
  completa quedó en **136 archivos y 599 pruebas correctas**.
- React Doctor mantiene el aviso estático de `createObjectURL`; se conserva
  como advertencia informativa porque el cleanup por refs está probado y no se
  desactivó la regla.
- Lint, build productivo aislado y build `phase2-dev` pasaron posteriormente.

## Docker y dump SQL - 2026-09-28

- `docker_engine` sigue sin estar disponible en el equipo.
- `supabase db dump --linked --schema public --dry-run` solo mostró el script
  previsto y no produjo dump ni cambios remotos.
- La matriz `supabase test db --linked` y la validación efectiva de las
  políticas RLS permanecen pendientes de Docker o de una conexión SQL
  autorizada; no se guardó ninguna credencial.

## Formateadores Intl compartidos - 2026-09-28

- Se hoistaron los formateadores de fecha de auditoría y moneda de permutas
  para evitar recrearlos por llamada.
- Pruebas focalizadas: 12/12 correctas; suite completa: 136/599 correctas.
- Lint y ambos builds pasaron; no se hizo despliegue porque no cambia runtime
  remoto ni contratos de datos.

## Corte autónomo posterior - 2026-09-28

- El rate limiter del Durable Object elimina entradas expiradas en paralelo y
  normaliza parámetros inválidos: `limit` queda como entero no negativo y
  `windowMs` como entero positivo con valores predeterminados seguros.
- `CubitatApp` protege las actualizaciones de `loading` y `error` que ocurren
  después de leer la caché cuando el efecto ya se desmontó.
- Validación actual: lint correcto, 136 archivos y 600 pruebas correctas,
  build productivo aislado y build `phase2-dev` correctos.
- DEV quedó desplegado y verificado en las versiones
  `1b7173f2-e599-4ef8-8286-fea7ca46c5b2` y posteriormente
  `97259d81-46cd-42e9-a2d0-4784390d458b`; la auditoría pública posterior pasó
  6/6 en Chromium y las rutas críticas respondieron HTTP 200.
- Producción no fue modificada. La auditoría React Doctor permanece en 14
  incidencias en el alcance cambiado; el aviso de `CubitatApp` se conserva como
  diagnóstico estático porque el guard `active` ya cubre el flujo.
- La matriz SQL/RLS sigue pendiente por falta de `dockerDesktopLinuxEngine`.
  El esquema remoto sí pasó `db lint` y `db push --dry-run` sin divergencias.
- El inventario nominal de secretos DEV sigue sin `GROQ_API_KEY` ni las
  variables externas de CAPTCHA, Resend Auth y OAuth Google; no se leyeron ni
  rotaron valores.

## CI y QA externo - 2026-09-28

- `.github/workflows/phase2-quality.yml` mantiene automatizados `npm ci`,
  auditoría de dependencias, lint, suite completa, build productivo aislado y
  build `phase2-dev`.
- No se añadieron E2E remotos autenticados ni mutaciones al workflow porque
  requieren cuentas QA, proveedores externos y limpieza de datos; permanecen
  como pruebas operativas separadas.

## Corte vigente posterior a la revalidación - 2026-09-28

Este bloque es el estado actual y prevalece sobre las cifras de los cortes
históricos anteriores de este archivo:

- Gates actuales: lint correcto, **137 archivos y 608 pruebas correctas**,
  build productivo correcto y `build:phase2-dev` correcto con 446 URLs del
  sitemap y verificador KYC aprobado.
- Runtime público: DEV y producción pasaron la auditoría E2E pública y de
  seguridad, **6/6 cada uno**. DEV mantiene activa la versión
  `46d27ca2-9d43-4ebc-b955-3b800f273f8e` con 100% del tráfico.
- Backend DEV: migraciones local/remoto alineadas hasta `20260916010000`,
  `db lint` sin errores y `db push --dry-run` actualizado.
- PWA/Push: endpoints públicos, manifest y Service Worker responden; el último
  despliegue DEV respondió `200` en los tres recursos y las pruebas focalizadas
  de Push pasaron **2 archivos y 14 pruebas** para el nuevo módulo de estados.
  La matriz
  física Android/iOS sigue sin cerrar porque requiere dispositivos reales con
  la aplicación instalada y cerrada.
- Pendientes externos: `GROQ_API_KEY`, configuración OAuth/CAPTCHA/Resend
  Auth, cuentas QA autenticadas, Docker o conexión SQL independiente y
  decisión sobre exposición pública del Trust Score.
- Producción no fue modificada ni promovida Fase 2 durante este ciclo. El
  despliegue realizado fue únicamente al Worker DEV aislado.

## Revalidación de gates posterior - 2026-09-28

- Lint, suite completa (`136` archivos, `600` pruebas), build productivo y
  build `phase2-dev` pasaron nuevamente.
- El build productivo mantuvo la exclusión de Fase 2 y de secretos privados;
  el build DEV mantuvo KYC, sus verificadores de configuración y 446 URLs del
  sitemap DEV.
- La evidencia es local; no se desplegó este corte y producción continúa
  intacta.

## Corrección de clave estable en tarjetas - 2026-09-28

- Las tarjetas de resultados usan la URL deduplicada de cada imagen como clave
  estable del carrusel, sin alterar el flujo de selección o navegación.
- Prueba focalizada: **9/9**; suite completa: **136 archivos y 600 pruebas**.
- Lint, build productivo y build DEV pasaron. React Doctor dejó de señalar el
  uso del índice como clave en `PropertyCard`.
- El cambio es local y reversible; producción permanece intacta.

## Verificación remota de estructuras DEV - 2026-09-28

- Una consulta SQL remota de solo lectura confirmó en DEV las tablas KYC,
  verificación documental y duplicados, junto con las funciones principales de
  Trust Score y verificación.
- También confirmó los triggers de duplicados y las políticas RLS nominales
  para propietarios y administradores AAL2.
- RLS aparece activado en las tres tablas (`relrowsecurity = true`); no se
  modificó el modo forzado ni el esquema remoto.
- No se leyeron filas de usuarios, no se ejecutaron funciones de negocio y no
  se hicieron escrituras. Producción permanece intacta.

## Prueba remota de duplicados - 2026-09-28

- La prueba transaccional de reglas de duplicados pasó en DEV con
  `BEGIN`/`ROLLBACK`.
- Comprobó la señal inicial, la resolución al aprobar y la reapertura al volver
  a revisión.
- La verificación posterior confirmó que no quedaron propiedades ni flags QA.
- Este bloque queda verificado técnicamente en DEV y continúa fuera de
  producción.

## QA visual del distintivo de vendedor verificado — 2026-10-10

- Se probó `/resultados` en DEV con perfil temporal sintético no agente, estado
  verificado y una propiedad publicada marcada `[QA TEMP]`. La tarjeta mostró
  «Vendedor verificado».
- La investigación localizó un bloqueo en la lista de RPC permitidas del Worker
  DEV. Se añadió `get_verified_seller_ids` y se confirmó que el proxy respondió
  `200` y remitió el ID sintético. Producción no se modificó.
- Worker DEV `b0e3ddfe-d6cc-4f7b-a5bf-e6da2355ea9f`. Después de la inspección se
  borraron los registros Auth, perfil y propiedad. Verificación final: cero
  filas fixture en Auth/perfiles/propiedades y cero estados de hash; no quedan
  vendedores sintéticos elegibles.
- Gates: lint, 141 archivos/633 pruebas aprobadas/1 omitida, build productivo
  aislado y build `phase2-dev` con sitemap estático pasaron.

## Matriz de seguridad DEV: corrección y alcance - 2026-09-28

- Se corrigió la aserción de notificaciones para comprobar el valor después de
  restablecer el rol; la fila ajena queda oculta por RLS.
- El endpoint SQL remoto no conserva el contexto esperado dentro del helper
  `assert_raises`, por lo que la matriz completa se mantiene pendiente para
  `supabase test db` con Docker.
- La ACL remota confirmó acceso solo de `service_role` y no de `authenticated`
  para las funciones server-only de alertas, contactos y purga KYC. La llamada
  directa de alertas como `authenticated` devolvió `permission denied`.

## Verificación focalizada adicional - 2026-09-28

- El carril de verificación documental y anti-fraude pasó 9 archivos y 30
  pruebas: solicitudes de propietario, moderación administrativa, migración,
  duplicados, reportes y envíos públicos.
- La evidencia es sintética y automatizada; no sustituye cuentas QA reales,
  revisión legal ni pruebas de proveedor externo.

## Autenticación focalizada adicional - 2026-09-28

- Configuración Auth, CAPTCHA, MFA, callback OAuth, recuperación de contraseña,
  redirecciones y notificaciones de cuenta: **7 archivos y 36 pruebas
  correctas**.
- El resultado verifica el código y sus contratos locales; la prueba con
  proveedores reales continúa pendiente de configuración externa en DEV.

## Administración, KYC y agentes focalizados - 2026-09-28

- Panel administrativo, KYC, métricas, contexto del anunciante, agentes,
  avisos y moderación: **15 archivos y 58 pruebas correctas**.
- Los `502` mostrados durante la suite fueron llamadas esperadas al backend
  simulado y no implicaron escrituras remotas ni fallos de prueba.

## Superficie pública y PWA focalizadas - 2026-09-28

- Detalle, publicación, búsqueda, alertas, mapas, inicio, resultados y PWA:
  **22 archivos y 106 pruebas correctas**.
- La cobertura automatizada no sustituye la instalación y recepción Push en
  dispositivos físicos Android/iOS.

## Frontera pública de contacto y reportes - 2026-09-28

- DEV y producción rechazaron los métodos `GET` con `405` y JSON inválido con
  `400` en contacto y reportes.
- No se crearon registros ni se enviaron datos válidos.

## Deuda estructural identificada - 2026-09-28

- El grafo detecta complejidad alta en `worker`, `CubitatApp` y la moderación
  de fondo.
- No se refactorizaron los shells centrales durante este ciclo porque los
  contratos y gates actuales están verificados; queda como deuda técnica
  independiente para un carril posterior de bajo riesgo.

## Revalidación completa posterior - 2026-09-28

- Los gates obligatorios se repitieron después de la actualización del handoff:
  lint, suite completa, build productivo y build `phase2-dev`.
- Resultado: **136 archivos / 600 pruebas correctas**; producción excluye los
  módulos exclusivos de Fase 2; DEV incluye KYC y conserva 446 URLs del
  sitemap.
- Esta comprobación fue local; no implica promoción ni cambios en producción.

## Modularización de moderación IA - 2026-09-28

- La lógica de moderación en segundo plano se separó de `worker.ts` hacia
  `web/src/worker/ai-moderation.ts`.
- El módulo conserva el fallback sin Groq, la descarga limitada de imágenes,
  el parseo seguro de respuestas y la escritura mediante RPC confiable.
- El carril crítico pasó 53/53 pruebas y la suite completa pasó 136/136
  archivos y 600/600 pruebas.
- No se desplegó este cambio; requiere una nueva publicación DEV solo cuando
  se decida validar el módulo remoto.

## Verificador de configuración Auth DEV endurecido - 2026-09-28

- `verify-phase2-dev-config.mjs` ahora exige que el archivo conserve las
  referencias por entorno a Turnstile, Resend SMTP y Google OAuth, además de
  origen, redirecciones y expiración de recuperación.
- El guard no exige ni imprime valores secretos; solo detecta configuraciones
  hardcodeadas o incompletas antes del build DEV.
- Los builds productivo y DEV, lint y la suite completa pasaron después del
  cambio.

## Clasificación de aviso KYC - 2026-09-28

- Las URLs temporales de documentos y selfies se revocan al reemplazar el
  archivo, al limpiarlo y al desmontar el hook. Los avisos de React Doctor son
  un falso positivo contextual y no requieren cambios de comportamiento.

## Trust Score: exposición controlada - 2026-09-28

- La función `get_property_trust_score` solo está definida en la migración
  DEV de verificación de propiedades.
- La UI pública no la consulta ni muestra el resultado; `ResultsPage` conserva
  el Trust Score como diferido por decisión de producto.
- Queda pendiente decidir su semántica y exposición antes de añadirlo a
  resultados o promover esa parte del esquema.

## Modularización de notificaciones Push - 2026-09-28

- El mapeo de estados y mensajes de Push se separó en
  `web/src/modules/notifications/push/pushNotificationStatus.ts`.
- La prueba focalizada pasó **2 archivos / 14 pruebas** y la suite completa pasó
  **137 archivos / 608 pruebas**.
- Lint, build productivo y build `phase2-dev` quedaron correctos. El guard de
  secretos compilados también pasó.
- Sin despliegue a producción; el cambio queda aislado para validación DEV.

## Auditoría posterior y estado DEV - 2026-09-28

- React Doctor quedó en **12 incidencias** dentro del alcance de cambios y no
  reportó problemas nuevos en Push; desapareció el aviso de complejidad de
  `PWAInstallPrompt`.
- La versión DEV publicada es
  `46d27ca2-9d43-4ebc-b955-3b800f273f8e`; `/`, el manifest y el Service Worker
  respondieron `200` por HTTP.
- La complejidad de shells centrales, el aviso de Socket y la revisión KYC
  permanecen separados como deuda o revisión contextual; no se mezclaron con
  este cambio funcional.

## Modularización del aviso PWA - 2026-09-28

- `PWAInstallToast.tsx` contiene ahora la vista del aviso de instalación; el
  componente principal mantiene la coordinación de eventos y estado.
- La prueba PWA pasó **10/10** y la suite completa quedó en **137/608**.
- DEV quedó actualizado en la versión
  `4d7bc661-7203-4ad1-85ac-e91680c1dc62`; los tres recursos PWA principales
  respondieron `200`. Producción no fue modificada.
## Revalidación backend DEV - 2026-09-28

- Las migraciones local/remoto siguen alineadas hasta `20260916010000`.
- `supabase db lint --linked --level warning` no encontró errores de esquema.
- No hubo escrituras remotas; solo queda pendiente ejecutar la matriz pgTAP
  cuando Docker o una conexión SQL independiente estén disponibles.

## Ciclo de vida de notificaciones - 2026-09-28

- `useNotifications` protege la sesión inicial y los cambios de autenticación
  frente a respuestas tardías después del desmontaje.
- Prueba focalizada **3/3** y suite completa **137/608**; lint y ambos builds
  correctos.
- DEV quedó actualizado a
  `d45c21a7-2ac9-465d-935c-7637820c50a0` y los tres recursos PWA respondieron
  `200`. Producción no fue modificada.

## E2E público DEV - 2026-09-28

- La auditoría remota pública pasó **7/7** sin credenciales ni escrituras
  persistentes: navegación, resultados, búsqueda/filtros, Turnstile, proxy,
  métricas protegidas y rechazo de moderación IA inválida.
- La prueba no cubre cuentas autenticadas, dispositivos físicos ni proveedores
  externos; esos pendientes conservan su criterio de cierre.

## E2E público producción - 2026-09-28

- La misma auditoría pública de solo lectura pasó **7/7** en producción.
- Se verificaron navegación, resultados, búsqueda/filtros, Turnstile, proxy,
  métricas protegidas y rechazo de moderación IA inválida. No hubo despliegue
  ni escrituras.

## Modularización Auth OAuth - 2026-09-28

- `OAuthProviderButtons.tsx` contiene la presentación de Google/Facebook; la
  lógica OAuth permanece en `LoginModal`.
- El carril enfocado pasó **10/10**, lint y ambos builds quedaron correctos.
- React Doctor conserva **12 incidencias** preexistentes; no apareció una
  incidencia nueva por esta extracción.
- DEV quedó actualizado a
  `e8686ea6-137a-4d29-ad86-5039579eb8e3` y sus tres recursos PWA respondieron
  `200`. Producción no fue modificada.

## E2E OAuth público - 2026-09-28

- El E2E remoto confirmó Google visible y Facebook deshabilitado: **1/1 DEV**
  y **1/1 producción**.
- Vitest quedó en **137/608**, con lint y ambos builds correctos.
## Moderación IA real en DEV - 2026-09-28

- Se configuró `GROQ_API_KEY` únicamente como secreto del Worker DEV mediante
  `wrangler secret put`; no se leyó ni se guardó el valor.
- Se usó el anuncio QA `07a82ef2-3723-45f9-8950-4cb8ec765a46`, identificado
  por el título `Departamento en venta en Playa`, para una prueba aislada.
- El anuncio pasó temporalmente de `published` a `pending_review` mediante una
  actualización condicionada por ID y título. Desde `/moderar` se pulsó
  `Reevaluar con IA` y la interfaz se actualizó sin recargar.
- Resultado observable: `Rechazada por IA`. Groq explicó que la descripción
  declaraba explícitamente que era una publicación QA y no una oferta real.
- Se pulsó `Aprobar` y se verificó el estado final `Publicada`; el panel quedó
  con 9 publicadas, 0 pendientes y 0 rechazadas. Producción no fue modificada.
- Quedan pendientes KYC persistente y Push físico Android/iOS; Groq ya no es
  bloqueo externo de DEV.

## Revisión inicial de fixture KYC - 2026-09-28 (antes de la prueba)

- La consulta agregada de perfiles DEV encontró un perfil `unverified` y uno
  `verified`, pero no encontró objetos en los buckets KYC previstos.
- En ese punto inicial no se habían insertado documentos ficticios ni alterado
  perfiles; la prueba persistente quedó pendiente hasta disponer de fixtures QA.

## Prueba KYC sintética DEV - 2026-09-28

- Se prepararon `tmp/kyc-qa/qa-document.png` y `tmp/kyc-qa/qa-selfie.png`,
  ambos marcados visiblemente `QA - NO VALIDO`.
- Se enviaron desde la cuenta DEV de prueba y aparecieron en el panel KYC con
  sus dos evidencias.
- Se rechazaron desde moderación con el motivo `QA: evidencia sintética
  marcada como NO VALIDA para probar el flujo.`
- Resultado observable: el panel quedó en `No hay solicitudes KYC pendientes`
  y la cuenta mostró `Solicitud Rechazada` con el motivo persistido.
- KYC queda verificado en DEV para enviar, revisar y rechazar; no se aprobó
  ninguna identidad real y producción no fue tocada.
## PgTAP local y gates de cierre - 2026-09-29

- Docker quedó disponible y se reconstruyó únicamente la base local con
  `supabase db reset --local --no-seed --yes`.
- Se cargaron después, solo en el contenedor local, las migraciones de
  `web/supabase/dev-migrations/` para que las pruebas de Fase 2 no se mezclen
  con la cadena productiva.
- `supabase db lint --local --level warning`: sin errores de esquema.
- `supabase test db --local`: PASS, 6 archivos y 6 pruebas pgTAP.
- `npm run lint`: PASS.
- `npm run test:run`: PASS, 137 archivos y 608 pruebas.
- `npm run build`: PASS; el verificador confirmó que el bundle productivo no
  incluye módulos exclusivos de Fase 2 ni secretos privados.
- `npm run build:phase2-dev`: PASS; el bundle DEV incluye KYC y no contiene
  secretos privados.
- No se modificaron DEV remoto ni producción en esta validación.

La prueba `web/supabase/tests/property_duplicate_rules.sql` dejó de depender
de datos sembrados opcionales: ahora crea sus fixtures sintéticas dentro de la
transacción y termina con `ROLLBACK`.

La prueba `web/supabase/tests/property_verification_local.sql` cubre el flujo
completo de evidencia documental sintética: subida autorizada, una sola
solicitud pendiente, cálculo de Trust Score, bloqueo de revisión sin AAL2,
aprobación con AAL2 y aislamiento frente a otra cuenta. Todo termina con
`ROLLBACK`.

## Auditoría de cierre DEV — 2026-10-07

- `npm ci` fallaba porque faltaban en `web/package-lock.json` las entradas opcionales multiplataforma de `@supabase/cli`; se añadieron en la rama `bugfix/phase2-lockfile-sync`. La instalación limpia y `npm run lint` terminaron correctamente.
- `npm run test:run`: 137 archivos; 607 pruebas aprobadas y 1 omitida.
- `npm run build:phase2-dev`: correcto con inventario público remoto de DEV; generó 34 rutas y aprobó los verificadores de bundle y secretos.
- `npm run build`: correcto con sitemap estático de CI; se confirmó aislamiento productivo de módulos DEV y ausencia de marcadores de secretos. No se publicó.
- Supabase DEV (`bknwerqbbysveehcdmzr`): `db lint` sin errores. No se aplicaron migraciones ni se escribieron datos. El dry-run sobre la cadena normal mostró siete migraciones `20260930` de la ruta de producción; no se confundieron con la cadena aislada `dev-migrations`.
- Cloudflare confirma `RESEND_API_KEY` y `GROQ_API_KEY` por nombre en DEV; no se leyeron valores. La última versión del Worker DEV continúa siendo del 2026-09-28. DEV, su manifest y la portada productiva responden HTTP 200.
- La entrega real de correo Resend, el digest diario (la nota del vault afirma que código/pruebas existían, pero este checkout no contiene esa implementación ni la migración `20261001120000_daily_search_alert_email_digest.sql`) y Push físico en iOS siguen pendientes. El QA E2E documental DEV se completó y se limpiaron solicitudes y PDFs sintéticos el 2026-10-10. No aplicar una migración no versionada ni revisada. Android ya consta como verificado en el vault. Trust Score permanece interno por decisión documentada; la revisión legal manual sigue fuera del alcance.
- No se desplegó ningún Worker, no se tocó producción y no se enviaron correos.
- También quedan pendientes la revisión de falsos positivos de la regla anti-duplicados con casos QA representativos y la comprobación de Turnstile con el proveedor real; las pruebas automatizadas no sustituyen esas verificaciones operativas.
- Corrección documental: la guía de despliegue estaba desactualizada. El commit `420b9ea` (`fix(production): defer alert email delivery`) retiró deliberadamente `dispatchPendingAlertEmails` del Worker productivo. Producción conserva el esquema de cola, pero solo DEV ejecuta el dispatcher Resend; no hay evidencia de entrega automática de alertas por correo en producción. La eventual reactivación requiere QA y aprobación de promoción.

## Recuperación Supabase DEV y publicación QA — 2026-10-08

- El proyecto Supabase DEV bknwerqbbysveehcdmzr completó el reinicio y `supabase projects list` reportó `ACTIVE_HEALTHY`. La ruta DEV `/resultados` cargó 9 propiedades. Producción no se tocó.
- Se reintentó el borrador QA conservado. La aplicación confirmó “Publicación recibida”; el anuncio quedó persistido en Mis publicaciones como “Rechazada por IA”. El motivo confirma que descripción e imágenes identifican el inmueble como ficticio. Es el resultado esperado y no debe contarse como falso positivo ni aprobarse; no aparece en el catálogo público.
- Wrangler mostró el nombre `GROQ_API_KEY` en los secretos del Worker DEV; no se leyó su valor.
- El reinicio recuperó el servicio, pero no identifica la causa raíz de los PGRST002/PGRST003 previos. La interrupción parece resuelta en esta comprobación; mantenerla como incidente transitorio sin causa aislada.
- La primera publicación fallida había subido una imagen a Storage antes del 503. No se borraron objetos; verificar su asociación antes de cualquier limpieza.
- El QA E2E de verificación documental DEV ya se completó con evidencia PDF sintética: subida, revisión aprobada/rechazada, estado del propietario y aislamiento RLS. La limpieza posterior dejó 0 solicitudes y 0 archivos QA; se conservaron 8 eventos inmutables y 3 propiedades. No se modificó producción.
- Revisar aún falsos positivos anti-duplicados y moderación de una publicación/imágenes legítimas de QA. Esta prueba demuestra rechazo esperado de contenido abiertamente falso, no el comportamiento con contenido legítimo.
## Endurecimiento de privilegios Data API — 2026-10-08

- Se confirmó en Supabase DEV que `anon` y `authenticated` tenían privilegios efectivos de `TRUNCATE`, `TRIGGER` y `REFERENCES` en `contacts`, `notifications`, `profiles`, `properties` y `property_reports`, además de escrituras innecesarias. RLS protege las filas, pero no sustituye estos privilegios de tabla.
- La migración `web/supabase/dev-migrations/20261008010000_harden_core_table_grants.sql` se aplicó únicamente a DEV. Se conservaron las operaciones requeridas por cliente y las políticas RLS existentes.
- La verificación con `has_table_privilege` confirmó la revocación de esos tres privilegios para `anon` y `authenticated`; `service_role` no cambió.
- Producción no se consultó ni modificó. Antes de considerar un cambio allí hay que auditar sus ACL y comparar sus políticas activas.

## Endurecimiento de permisos RPC en DEV — 2026-10-08

- La auditoría de funciones `SECURITY DEFINER` descubrió que, pese al `REVOKE FROM PUBLIC` histórico, los grants explícitos a `anon` y `authenticated` seguían habilitando `claim_pending_push_deliveries` y `authorize_push_delivery`. La primera devuelve credenciales de suscripciones Push y ambas deben ser exclusivas del Worker con `service_role`.
- `web/supabase/dev-migrations/20261008020000_harden_sensitive_rpc_grants.sql` revocó esos permisos en DEV y mantuvo la ejecución solo para `service_role`. También retiró el grant anónimo de `get_admin_metrics`; la función conserva su verificación interna de AAL2 para usuarios autenticados.
- La verificación remota de `has_function_privilege` confirmó el aislamiento esperado. Producción no se modificó.

## Revisión adicional de RPC expuestas — 2026-10-08

- Se contrastaron las funciones `SECURITY DEFINER` de DEV con sus consumidores y controles internos. El Trust Score requiere propietario o administrador AAL2; las funciones de ocultar/restaurar verifican propietario; las funciones de revisión documental/KYC exigen administrador AAL2. Las RPC de entrega Push quedaron reservadas a `service_role` en DEV-F2.13.
- Se encontró que `increment_property_view_count` aceptaba llamadas públicas y actualizaba cualquier fila por ID, incluidos borradores u ocultos. DEV-F2.14 conserva la llamada pública pero restringe la actualización a propiedades `published` y usa `search_path` seguro.
- La definición y los permisos efectivos se verificaron en Supabase DEV. Producción no se modificó.

## Revisión de anti-duplicados en DEV — 2026-10-08

- La regla compara coincidencia exacta del fingerprint normalizado (título, ubicación, operación, tipo, precio y superficie) y solo añade una señal para revisión administrativa; no rechaza la propiedad automáticamente.
- Consulta agregada DEV: cero grupos con fingerprint repetido y cero flags activos. No hay muestra actual para evaluar falsos positivos, por lo que no se alteró el criterio.
- Pendiente: QA con dos anuncios legítimos, en particular unidades distintas del mismo edificio con atributos coincidentes.

## QA E2E de verificación documental de propiedad — 2026-10-10

- En Supabase/Worker DEV se completó el flujo con evidencia PDF sintética,
  marcada como prueba y sin datos reales ni validez legal.
- Se verificó la solicitud del propietario, la apertura del documento privado
  desde administración y ambos desenlaces: aprobación y rechazo. La cuenta del
  propietario mostró el estado actualizado y, para el rechazo, el motivo
  `no validos para este fin`.
- Esto verifica el recorrido funcional de una cuenta; no demuestra todavía el
  aislamiento frente a una segunda cuenta ni constituye validación legal.
- RLS comprobada en DEV dentro de transacciones de solo lectura: el propietario
  ve 1 solicitud y 1 objeto; un UID ajeno bajo el rol `authenticated` ve 0 y 0;
  `anon` ve 0 objetos y carece de permiso SELECT sobre la tabla de solicitudes.
  El UID ajeno se simuló con claims Postgres; no se usó una segunda sesión real.
- Revalidación tras la autorización de limpieza (2026-10-10): la tabla quedó
  con 0 solicitudes y el bucket con 0 PDFs/objetos con contenido; permanecen
  solo 3 marcadores de carpeta vacía de 0 bytes (`.emptyFolderPlaceholder`).
  Se conservaron las 8 entradas de bitácora. No se modificó producción.

## Barrido completo de privilegios de tablas — DEV — 2026-10-08

- El barrido del esquema público detectó privilegios efectivos `TRUNCATE`, `TRIGGER` y `REFERENCES` en diez tablas de datos, además de escrituras directas innecesarias en varias.
- Se limitaron los grants en las tablas de perfiles, propiedades, contactos, notificaciones, reportes, KYC, verificación documental, Push, favoritos y alertas mediante DEV-F2.12 y DEV-F2.16, preservando las operaciones que usa la aplicación y sus políticas RLS.
- La consulta global posterior con `has_table_privilege` devolvió cero tablas públicas con esos privilegios para `anon` y `authenticated`. Las RPC server-only de Push también quedaron reservadas a `service_role`.
- Los cambios se aplicaron solo a Supabase DEV. Producción queda pendiente de una auditoría ACL independiente antes de cualquier promoción.

# 2026-10-09 — Error de carga del panel y consulta de estado pHash (DEV)

- Causa: el proxy de `cubitat1-phase2-dev` rechazaba el RPC autenticado
  `get_admin_property_image_hash_status`, aunque la función existía en Supabase
  DEV y requería correctamente administrador AAL2. El fallo de ese dato
  complementario impedía cargar todas las propiedades.
- Se añadió la función a la allowlist autenticada del Worker Fase 2 DEV y se
  desplegó `cfafb374-1eef-400b-a080-37c3cdfb49ca`. Lint y build DEV pasaron.
- Verificación visual en sesión autenticada: `Publicadas (9)` muestra las nueve
  propiedades y el bloque de hash en cada tarjeta. Cobertura: 1/9 con hash; las
  otras ocho advierten que no pudieron compararse. No se afirma cobertura
  completa ni ausencia global de duplicados. Producción intacta.
# 2026-10-09 — Coincidencias de imágenes por hash perceptual (DEV)

- Implementado en el Worker DEV: pHash de 64 bits sobre WebP de portada y una
  imagen de galería; umbral inicial `<= 8/64` para mostrar candidatos al
  moderador. La señal es privada y no rechaza ni publica automáticamente.
- La aplicación envía al Worker únicamente el ID guardado. El Worker comprueba
  la sesión y propiedad, descarga desde el bucket permitido, aplica límites de
  tamaño/dimensiones y persiste fingerprints y flags mediante RPC reservadas al
  `service_role`.
- DEV incorpora la migración `20261009010000_property_image_phash_duplicates.sql`.
  Las publicaciones antiguas se indexan por Cron, una por minuto; el
  reconciliador actualiza candidatos que continúan en revisión.
- Worker DEV desplegado como `6b3f7913-fa3b-4ec5-a119-ce37f61031d9`; portada
  responde `200` y la nueva ruta rechaza `GET` con `405`. `npm run lint` y
  `npm run build:phase2-dev` pasaron; este build usó `SITEMAP_MODE=static` por
  ausencia de `.env`. Pendiente QA con dos imágenes autorizadas para confirmar
  decode real, coincidencia visible y tasa de falsos positivos. No se cambió
  producción.

## QA exploratorio pHash: escenas distintas y recortes — 2026-10-10

- Experimento local con imágenes WebP sintéticas y la misma fórmula DCT de 64 bits del Worker: escenas distintas de interior/exterior quedaron entre 12 y 36 bits; el umbral DEV es `<= 8`, así que ninguna habría generado candidato en esta muestra.
- Recortes centrados de la misma escena: 5 % de recorte = 8 bits (entra como candidato), 10 % = 10 bits y 15 % = 12 bits (quedan fuera). Esto sugiere riesgo de falso negativo con recortes moderados; no se amplió el umbral porque la muestra es pequeña y sintética.
- Pruebas focalizadas de política/UI/repositorio: 19/19 pasaron. No se escribieron filas ni objetos en Supabase DEV, no se abrió un anuncio nuevo y no se modificó producción.
- Esto no sustituye el QA E2E del Worker con fotografías inmobiliarias variadas ni el backfill del catálogo. Mantener pendiente la validación operativa de falsos positivos/negativos y ampliar cobertura.

## QA pHash con fotografías sintéticas — 2026-10-10 (continuación)

- Se generaron tres fotografías inmobiliarias sintéticas en WebP y se midió pHash con muestreo/DCT de 64 bits. Pares visualmente distintos: sala/cocina `30/64`, sala/sala diferente `38/64`, cocina/sala diferente `24/64`; ninguno cruzó `<= 8` en esta muestra.
- Recortes centrados de una foto no cambiaron de forma monotónica: eliminar 3 % dio `10/64`; 5 % y 7 % dieron `4/64`; eliminar 10 % y 15 % dio `14/64`. El umbral detecta algunos recortes y omite otros; se necesitan más fotografías y tipos de recorte antes de calibrar.
- 19 pruebas focalizadas de moderación/pHash pasaron en la continuación anterior. Intenté preparar un anuncio por el formulario, pero la interfaz disponible no permitió adjuntar el archivo; cerré el formulario sin enviar y no se creó un anuncio.
- Recuento remoto de solo lectura después del intento: 12 anuncios activos con imágenes, 4 indexados y 4 flags pHash sin resolver; no hubo cambios en la base. Producción intacta.
- Pendiente: un QA E2E con carga de fotos sintéticas por el formulario normal, confirmar hashes de Worker y resultado visible, limpiar solo esos fixtures; ampliar el backfill (4/12) y evaluar una matriz de fotos similares antes de ajustar `<= 8`.

### Confirmación con el decodificador real del Worker — 2026-10-10

- Se ejecutó `refreshPropertyImageDuplicates` desde un Worker local de Wrangler con el WebP decoder WASM real. El mock interceptó el RPC de persistencia en memoria; no se usó una clave real ni hubo escrituras externas.
- Distancias resultantes: sala/cocina `30`, otra sala distinta `34`; recortes de la sala: 3 % `8`, 5 % `4`, 7 % `8`, 10 % `12`, 15 % `16`. Con `<= 8`, la muestra separa las escenas distintas y detecta recortes pequeños; los recortes del 10–15 % no generan candidata.
- El formulario remoto no pudo completar la carga de archivos; se cerró antes de enviar. Los conteos DEV siguen en 12 propiedades activas con imágenes, 4 indexadas y 4 flags no resueltos. Producción permanece intacta.

## QA pHash E2E en DEV con recorte — 2026-10-10

- La carga por el formulario normal ya funciona con el selector de archivos del navegador. Se enviaron tres anuncios sintéticos de QA al ambiente DEV; los que indicaban explícitamente que eran pruebas fueron rechazados por la IA, pero igualmente quedaron con hash procesado. No se aprobaron manualmente ni se publicaron al catálogo.
- Para que la alerta fuera visible en moderación, se envió una segunda variante de prueba con descripción inmobiliaria normal y la misma foto base recortada 5 % por cada borde. La IA la aprobó para revisión humana; la publicación quedó bajo revisión, sin aprobar ni publicar manualmente.
- El panel `/moderar`, filtro `Coincidencias pHash`, mostró la nueva y la existente lado a lado: `coincidencia parcial · 8 de 64 diferencias`. Esto confirma que el umbral inclusivo `<= 8` incluye este recorte límite. El revisor puede comparar ambas fichas y resolver; la señal por sí sola no publica ni rechaza.
- La ficha indicó cobertura `5 de 13` publicaciones activas con imágenes indexadas. El filtro mostró 4 anuncios con coincidencias. Por tanto, el resultado positivo es verificable, pero la cobertura continúa incompleta y un resultado sin candidata no prueba ausencia de duplicados.
- También se comprobó el flujo de salida: un anuncio explícitamente etiquetado como sintético fue rechazado por la IA; al quedar `ai_rejected`, la señal pHash se resuelve automáticamente y no aparece en la cola de coincidencias. Para validar la interfaz de comparación se requiere que la ficha siga en `pending_review` o `ai_approved`.
- Producción no se modificó. Ningún anuncio de prueba recibió aprobación humana ni se publicó.
- Pendiente: limpiar solo estos anuncios y sus imágenes sintéticas cuando se autorice; ampliar backfill de 5/13 y continuar matriz de recortes y fotos parecidas antes de cambiar el umbral.

## Cobertura pHash DEV aclarada — 2026-10-10

La lectura de Supabase DEV confirmó 13 anuncios activos con imágenes: 5 procesados y 8 intentados sin imágenes procesables; no hay anuncios elegibles sin intento. Los 5 procesados tienen rutas del bucket privado `property_images`; los otros 8 usan URLs externas o rutas no compatibles. La especificación de media prohíbe calcular hashes fuera del bucket privado DEV, por lo que no se amplió el allowlist ni se modificaron anuncios o Storage. La cobertura `5/13` sigue siendo parcial y una búsqueda sin candidata no descarta duplicados entre los 8 no procesables. Próximo paso sujeto a decisión: normalizar/copiar imágenes de esos 8 a Storage DEV mediante un proceso controlado, o dejar esas referencias fuera de cobertura. Producción intacta.

### Decisión de alcance pHash — 2026-10-10

El usuario confirmó que los 8 anuncios sin hash procesable son fixtures de prueba; no hace falta procesarlos ni migrarlos. Se excluyen intencionalmente del alcance y no bloquean el cierre de cobertura real. `5/13` describe el conteo bruto que incluye los fixtures. Mantener la fuente privada permitida, sin importar URLs externas.

## QA pHash negativo visible en moderación DEV — 2026-10-10

- Con autorización del usuario se envió por el formulario DEV una ficha QA ficticia con imagen generada para el caso negativo. El Worker procesó el hash y `/moderar` mostró **“Sin coincidencias de imagen. Hash procesado.”** La descripción de cobertura indica que la revisión del catálogo sigue incompleta.
- La tarjeta quedó aprobada por IA, pero permanece bajo revisión humana: no se aprobó manualmente ni se publicó.
- El contador de candidatas pHash siguió en 4; la cobertura pasó de 5/13 a 6/14 por la nueva ficha QA. Las otras ocho fichas sin imagen procesable son fixtures que el usuario indicó que no hace falta migrar ni procesar.
- Imagen de QA preservada en `work/qa/property-phash-negative-qa.png`. Producción intacta.
- El caso comprueba que una imagen distinta del inventario procesado se presenta sin candidata; no demuestra cobertura global ni basta para recalibrar el umbral. Pendiente una matriz mayor de positivos/negativos antes de declarar cerrado el QA antifraude.

## QA pHash local ampliado: escenas parecidas y recortes — 2026-10-10

- Amplié la matriz local a 14 imágenes sintéticas inmobiliarias (91 pares), codificadas como WebP y medidas con la misma fórmula pHash de 64 bits del Worker. No se subieron imágenes nuevas a DEV ni se modificaron datos.
- Entre imágenes de escenas distintas, las distancias observadas fueron 16–42/64; no hubo candidatos con el umbral actual `<= 8`.
- Variantes visualmente casi iguales de una sala quedaron a 10, 12, 14 y 16/64. El umbral vigente no detectaría esos pares, aunque la escena se ve prácticamente igual. Recortes centrados de una imagen: 2–3 % por borde = 8/64; 5 % = 12/64; 10 % = 18/64; 15 % = 22/64; 20 % = 30/64. La respuesta depende mucho de la imagen/recorte.
- Conclusión: pHash funciona para copias muy cercanas, pero no basta para inferir que fotos diferentes muestran el mismo inmueble. No subir el umbral solo con esta muestra sintética; podría incrementar falsas alertas. El paso correcto es validar una matriz etiquetada de fotos reales del mismo inmueble y de inmuebles distintos; considerar combinar pHash con señales adicionales si se exige reconocer otras tomas del mismo inmueble.
- Límite del experimento: se usaron imágenes generadas localmente, codificadas/decodificadas como WebP con Sharp, y se reprodujo la fórmula DCT y el muestreo del Worker. No equivale a validar una población real de anuncios ni mide tasa de falsos positivos/falsos negativos.

### Transformaciones de una misma foto (continuación local, 2026-10-10)

- En una imagen sintética, volver a codificar como WebP (calidad 40), reducir a la mitad la resolución, cambiar brillo ±15 % y saturación +25 % produjo `0–2/64` diferencias; esas variantes entran en `<= 8`.
- Recortar 2 % de cada borde produjo `8/64` (límite incluido); girar 2° dio `16/64` y reflejar horizontalmente `32/64`, por lo que ambas transformaciones quedan fuera.
- Es una sola foto base y transformaciones digitales, así que describe robustez de copia y no permite fijar umbral para decidir si fotos distintas son del mismo inmueble.


## QA de moderación IA con imagen y decisión del umbral pHash — 2026-10-10

- Revisión de solo lectura en la sesión autenticada DEV: el panel muestra una ficha QA con estado **Aprobada por IA** y una explicación que describe los detalles de la fotografía. La ruta de aprobación solo se alcanza con una respuesta válida del proveedor; sin `GROQ_API_KEY` o si Groq falla, el Worker deja la ficha en revisión manual. Esto confirma el caso positivo multimodal en DEV junto al rechazo previo de contenido que se identificaba explícitamente como ficticio.
- El usuario confirma que el comportamiento pHash actual le funciona por ahora; se conserva el umbral `<= 8/64`. No se cambia código ni configuración. La prueba local ampliada queda como exploración; la medición con fotos reales sigue siendo mejora futura, no tarea inmediata de recalibración.
- La ficha QA no fue aprobada manualmente ni publicada. Producción permanece intacta.

## Turnstile con proveedor real — DEV — 2026-10-10

- Se conservó en DEV el widget compartido cubitat-turnstile usado también por producción. Tras actualizar el secreto del Worker turnstile-siteverify-cubitat mediante Wrangler, se completó un único envío QA autorizado desde una ficha de contacto DEV.
- La interfaz confirmó “¡Mensaje enviado!” y el Worker recibió siteverify HTTP 200 con outcome: ok y sin códigos de error. Esto confirma un token real y el flujo de contacto en DEV.
- No se envió ningún formulario en producción. Esta comprobación no sustituye una prueba independiente de CAPTCHA de Supabase Auth ni prueba otros formularios.

## Decisión de aceptación del antifraude — 2026-10-10

El usuario confirma que el comportamiento antifraude actual funciona bien. Se mantiene pHash <= 8/64, orientativo y sujeto a decisión humana; no se ajusta el umbral ni se amplía la matriz de fotos reales en este ciclo. Esa calibración queda diferida por decisión de producto y no bloquea la aceptación actual en DEV. La verificación real de Turnstile para contacto DEV quedó registrada arriba. Esta aceptación no implica promoción a producción.
## Lectura del filtro de vendedor verificado en DEV — 2026-10-10

- Consulta pública de solo lectura: el catálogo cargó 9 propiedades y, al activar Solo verificados, mostró “No encontramos propiedades con esos filtros”.
- No hay en este momento una ficha pública elegible para comprobar el distintivo con una cuenta real autenticada. La prueba visual previa usó un fixture sintético ya eliminado.
- No se creó ni modificó ninguna cuenta, verificación KYC o propiedad. Para cerrar esa evidencia hace falta una sesión de DEV con una cuenta ya elegible y una propiedad publicada; no se debe aprobar KYC real solo para hacer la prueba.

## Auditoría remota de producción — 2026-10-10

La consulta de solo lectura se hizo al proyecto Supabase de producción identificado explícitamente. El historial de migraciones coincide hasta `20260930160000`; por tanto, producción ya contiene la base de KYC, métricas/agentes, verificación documental, reglas de duplicados exactos, retención KYC y cola de correo. Esta evidencia corrige la nota previa que describía esos elementos como exclusivos de DEV. El Worker `cubitat1` sirve al 100% la versión `f704da45-1a0b-4c0d-86f4-3081cdbb3cb0` (upload 2026-10-11 01:33 UTC), pero Cloudflare no muestra el commit de origen.

La revisión de catálogos encontró permisos de ejecución excesivos en `claim_pending_push_deliveries(integer)` y `authorize_push_delivery(uuid,integer)` para `anon` y `authenticated`; la primera devuelve credenciales Push. También se encontraron grants de tabla más amplios que las operaciones de cliente, ejecución anónima de `get_admin_metrics()` (la función conserva chequeo interno AAL2), y un contador público que afecta anuncios no publicados. El parche se fusionó en `main` mediante PR #120 como `2cd21a0c210b7e6f402eeed9add67bb06075bf55`; CI posterior aprobó audit, lint, suite y ambos builds. En ese momento el dry-run enumeró exactamente la migración de notificación y esta corrección; la aplicación autorizada posterior y su verificación se registran a continuación. No se consultaron filas de usuarios ni se modificaron datos/configuración remotos durante aquella auditoría.

## Aplicación autorizada de migraciones a producción — 2026-10-10

- Tras autorización expresa del usuario, se aplicaron en orden al proyecto Supabase de producción `tohjzoncoosvjbjcakdl` las migraciones `20261009100000_simplify_property_approval_notification.sql` y `20261010110000_harden_production_phase2_privileges.sql`. El dry-run inmediatamente previo enumeró únicamente esas dos migraciones.
- `supabase migration list --linked` confirmó ambas versiones sincronizadas entre local y remoto.
- Verificación de permisos efectivos: `claim_pending_push_deliveries(integer)` y `authorize_push_delivery(uuid,integer)` no son ejecutables por `anon` ni `authenticated`, y sí por `service_role`; `get_admin_metrics()` no es ejecutable por `anon` y conserva `authenticated` con su control AAL2 interno. El contador público de vistas sigue permitido, con filtro para cambiar solo propiedades `published` y `search_path=pg_catalog`.
- En 11 tablas core/Fase 2 comprobadas, `anon` y `authenticated` ya no tienen privilegios `TRUNCATE`, `TRIGGER` ni `REFERENCES`. No se leyeron ni alteraron filas de usuarios.
- Solo hubo cambios SQL; no se desplegó Worker ni se modificaron secretos Cloudflare. La UI y los módulos pHash exclusivos de DEV no se promovieron en esta operación.
- La nota previa “Queda pendiente autorización para aplicar” queda superada por este registro posterior.

## Perfil aislado de verificación documental para producción — 2026-10-10

- En la rama `feat/production-property-verification-profile` se preparó un build independiente que habilita la solicitud y moderación de documentos de propiedad contra Supabase producción. Requiere la URL exacta de producción y una anon key para compilar.
- El Worker productivo incorpora las tres RPC documentales en su allowlist autenticada, nunca en la pública. RLS y AAL2 siguen aplicando dentro de Supabase. No se creó migración nueva porque las tablas, funciones y políticas ya estaban presentes en el proyecto productivo.
- El perfil mantiene desactivados KYC, agentes, notificaciones y pHash. También se evitó que el panel de propiedades invoque RPC de duplicados cuando el perfil de duplicados está apagado.
- Verificación local: lint y `npm run build:phase2-documents` pasaron; los verificadores comprobaron el destino de Supabase, los marcadores documentales y la exclusión de DEV/KYC/pHash. El CI ejecutará su propia suite al abrir la PR.
- Estado al redactar: código preparado y pendiente de PR/CI/fusión. No se desplegaron el sitio ni el Worker y no se cambió configuración remota.

## Perfil integral de Fase 2 para producción — 2026-10-10

- Se prepara en `feature/phase2-production-profile` un build único para KYC,
  verificación documental, Trust Score interno, distintivo de vendedor
  verificado y revisión pHash. El build base continúa aislado.
- Supabase producción fue consultado de solo lectura: hay cero solicitudes de
  verificación documental; faltan la bitácora documental, la RPC de vendedores
  verificados y las tablas/RPC de pHash. Las migraciones aditivas
  `20261010120000` y `20261010130000` son las únicas pendientes según el dry-run.
- El esquema remoto existente pasó `supabase db lint --linked --level warning`.
  Las migraciones nuevas no se han aplicado y el Worker/sitio productivos no se
  han desplegado. No marcar el rollout como completado antes de CI, merge,
  migraciones, despliegue y smoke checks.
- El perfil no activa el dispatcher de correo de alertas; mantiene pHash bajo
  decisión humana y procesa como máximo el lote de backfill existente por Cron.

## Promoción integral Fase 2 a producción — 2026-10-11

Este estado posterior prevalece sobre los párrafos anteriores que describen el rollout como pendiente. El código está integrado en `main` (PR #124, merge `19b91e8`) y desplegado en producción.

- Supabase `tohjzoncoosvjbjcakdl`: aplicadas `20261010120000_phase2_seller_badge_and_document_audit.sql` y `20261010130000_property_image_phash_duplicates.sql`. `supabase migration list --linked` confirmó ambas presentes en el historial remoto. Se verificaron tablas/auditoría, acceso `anon` denegado a tablas privadas, RPC de moderación sin EXECUTE para `anon`, y `get_verified_seller_ids()` pública.
- Cloudflare Worker `cubitat1`: versión `b82e6c75-7a3d-423b-b128-bdd5f60adb82` al 100%; rutas `cubitathome.com/*` y `www.cubitathome.com/*`; cron `* * * * *` sincronizado. El cron pHash puede procesar una ficha elegible por ciclo, con imágenes permitidas del bucket `property_images`.
- Perfil de build `phase2-production`: KYC, verificación documental, Trust Score interno, distintivo de vendedor y pHash habilitados; configuración excluye DEV y dispatcher Resend.
- Smoke en producción: `/`, `/resultados`, `/publicar`, `/moderar`, `/manifest.webmanifest` y `/sitemap.xml` devolvieron HTTP 200; 10 de 10 respuestas al home coincidieron con el HTML generado por ese build. El GET inválido al endpoint pHash devolvió 405, consistente con POST requerido. Esto verifica entrega técnica, no reemplaza una sesión de usuario autenticada.
- QA aún pendiente: sesión de moderador con AAL2; carga/lectura de documento privado y estado del propietario; comparación pHash en un anuncio elegible; distintivo con vendedor verificado elegible; recepción real de Push en dispositivo. El dispatcher de correo Resend continúa excluido.
- Sin respaldo previo al rollout: Supabase Free no incluye respaldo automático; el workflow manual de GitHub falló porque `SUPABASE_DB_PASSWORD` no está configurado. No se alteraron filas de usuarios durante la verificación; las migraciones son aditivas y las tablas nuevas inician vacías. Resolver respaldos antes de futuras operaciones destructivas.

## Revisión posterior de cobertura pHash y backup — 2026-10-11

- Consulta SQL de solo lectura en Supabase producción: 306 publicaciones activas tienen fila de estado pHash; 3 propiedades tienen imagen procesada y 3 fingerprints; hay 0 alertas pHash sin resolver. Las otras 303 filas tienen `processed_images = 0`, así que la función de backfill las considera ya intentadas y no las vuelve a seleccionar.
- En esas 303 filas, 301 propiedades tienen referencias HTTP y 2 no tienen referencias de imagen. Los hosts agregados fueron `images.unsplash.com`; se contaron 889 referencias, sin leer ni guardar URLs individuales. El Worker restringe el cálculo a rutas del bucket `property_images`. No ampliar el fetch a Unsplash: son imágenes de stock repetidas entre anuncios de demostración y podrían generar alertas engañosas. Por tanto, `Coincidencias pHash (0)` solo describe el pequeño subconjunto de tres imágenes procesadas, no todo el catálogo.
- El GET al endpoint pHash respondió 405, lo esperado para el handler POST; esto confirma que la ruta existe, no el resultado de una carga nueva. No se cambió el umbral, no se forzó backfill y no se escribieron filas.
- Los builds `npm run build` y `npm run build:phase2-production` pasaron con `SITEMAP_MODE=static`; se ejecutaron los verificadores completos de bundles, Worker y secretos privados. Ese modo genera solo las dos rutas base, no sustituye el sitemap dinámico completo.
- Se confirmó que el workflow de backup no tiene secretos de GitHub Actions y el último intento usó `PGPASSWORD` vacío. El host fijo tampoco corresponde al endpoint del proyecto. La rama `bugfix/supabase-backup-connection-url` actualiza el workflow para exigir una URI de conexión guardada como secreto `SUPABASE_DB_URL`. Debe copiarse del panel `Connect` en modo Session pooler; no se debe deducir el host/índice del pooler. El backup no se ejecutó porque el secreto no existe y no se exportaron datos productivos.

## Backup PostgreSQL de producción verificado — 2026-10-11

- El secreto GitHub Actions `SUPABASE_DB_URL` está configurado sin exponer su valor. La conexión usa el Session pooler IPv4 de Supabase producción `tohjzoncoosvjbjcakdl`.
- PR #127 (`a4ca6b3b0902d2385cf4412aa47cdb86f3ab2c3d`) integra `postgres:17-alpine` como cliente; la versión coincide con PostgreSQL 17.6 del servidor.
- Run [38171053663](https://github.com/BladeX1X/Cubitat/actions/runs/38171053663) completó `pg_dump`, compresión y carga de `supabase-database-backup` (293,385 bytes; vence 2027-01-09). No se modificó el esquema ni se escribieron filas en la base.
- La operación confirma un backup manual, no respaldos automáticos: se conserva como artefacto privado de Actions por 90 días.
- Esta evidencia posterior supersede la nota de 2026-10-11 que registraba el backup como pendiente.

## Gate AAL2 de moderación observado en producción — 2026-10-11

- La sesión autenticada de Chrome abrió `https://cubitathome.com/moderar`; la página mostró el panel administrativo y los conteos de propiedades de producción.
- `AdminMfaGate` solo renderiza el contenido protegido cuando Supabase devuelve `currentLevel === 'aal2'`; observar el panel abierto en esta versión productiva confirma el paso del gate AAL2.
- La vista quedó en el filtro predeterminado sin pendientes. No se ejecutaron aprobaciones/rechazos, no se leyó evidencia privada y no se cambiaron filas.
- El subpunto de acceso al panel AAL2 queda verificado. Siguen pendientes las operaciones administrativas y los flujos específicos enumerados en la matriz; esta observación no los sustituye.

## Recuperación del perfil integral y build automático — 2026-10-11

- En producción, `/moderar` volvió a servir un bundle sin KYC, Documentos ni coincidencias pHash después de cargas automáticas de Cloudflare. La configuración visible de Workers Builds confirmó `main`, raíz `/web`, comando `npm run build` y despliegue `npx wrangler deploy`; por tanto, cada push a `main` ejecutaba el perfil base.
- Se cambió y guardó el comando de compilación de Cloudflare a `npm run build:phase2-production`; se volvió a cargar el panel y se confirmó que persistió. El deploy sigue usando `npx wrangler deploy`, con el repositorio conectado y las variables de build ya configuradas.
- Se restauró el perfil completo en el Worker `cubitat1` mediante Wrangler, versión `14913e18-d5a5-4864-80ea-dcb951fd2062`. `/moderar` vuelve a mostrar KYC, Documentos y Coincidencias pHash tras pasar AAL2. No se modificaron filas ni esquema de Supabase.
- Verificación post-merge completada: PR #130 (merge `3e46becb7c4e6610b1de7b87a41f173715fb2f89`) disparó Workers Build `6086639e-5c26-4b49-876a-b6d1045d2067`. El build usó `npm run build:phase2-production`; las etapas de instalación, build y deploy terminaron en verde. El Worker quedó en la versión `98c825b6-a653-48b1-9c60-6ea76bf40e06` al 100%, y la sesión AAL2 volvió a mostrar KYC, Documentos y Coincidencias pHash. El CI de main run [38185184858](https://github.com/BladeX1X/Cubitat/actions/runs/38185184858) también pasó todos los gates.
- QA funcional productivo aún limitado por los datos disponibles: 1 solicitud documental histórica y 0 pendientes; 0 vendedores verificados elegibles; 306 estados pHash, 3 imágenes procesadas/fingerprints y 0 coincidencias abiertas. No se leyeron documentos privados ni se crearon anuncios sintéticos en producción. Push físico sigue pendiente de un dispositivo PWA.
- `.agents/AGENTS.md`, requerido por las instrucciones raíz, no existe en el checkout actual; se deja constancia y se aplicaron las reglas disponibles de `AGENTS.md` y `web/AGENTS.md`.

## Distintivo de vendedor para administradores que publican — 2026-10-12

- A petición del usuario, se amplió `get_verified_seller_ids()` para incluir perfiles `admin` solo cuando el KYC está verificado y existe al menos una propiedad publicada. La función devuelve únicamente IDs y conserva permisos actuales.
- La migración `20261012170000_include_verified_admin_sellers.sql` se aplicó en Supabase producción `tohjzoncoosvjbjcakdl`; el dry-run previo enumeró solo esta migración y el historial remoto quedó sincronizado. El aviso de Docker afectó únicamente la caché local del catálogo.
- Una consulta de solo lectura confirmó que la proyección pública incluye un ID admin verificado y que «Casa en venta en Holguín» califica. En `cubitathome.com/resultados`, la tarjeta muestra «Vendedor verificado».
- El frontend ya contiene la corrección del filtro `Solo Verificados` fusionada en PR #132; no se alteraron perfiles ni anuncios. La migración quedó versionada en `main` mediante PR #133, merge `71c58f4a0444a8980cea85e377f5a720c3363788`; ambas verificaciones automáticas pasaron. El Worker ya servía la interfaz, así que no necesitó otro cambio de frontend para mostrar el sello.

## Cobertura pHash comparable en producción — 2026-10-13

- La auditoría de solo lectura documentada el 2026-10-11 encontró 306 filas
  activas con estado pHash, pero solo 3 con fingerprints. De las restantes,
  301 usan referencias a `images.unsplash.com` y 2 no tienen imagen.
- El pHash productivo ya está habilitado: el Worker `cubitat1` calcula al
  publicar y ejecuta el backfill gradual. Hashar las fotos de stock sería
  engañoso porque un mismo recurso puede aparecer en propiedades distintas.
- La cobertura mostrada por la RPC usaba como denominador cualquier anuncio con
  una URL de imagen. `20261013110000` se aplicó a producción y cuenta solo WebP
  propias guardadas en `property_images` bajo la carpeta del propietario; el
  panel explica por qué las URLs externas quedan fuera.
- Validación local: `npm run lint` correcto; 145 archivos/643 pruebas aprobadas
  y 1 omitida; `npm run build` y `npm run build:phase2-production` correctos
  con `SITEMAP_MODE=static`. El build Phase 2 verificó que mantiene pHash y
  excluye DEV/correo. La lint SQL local no se pudo ejecutar porque no hay una
  base Supabase local disponible.
- Verificación en moderación con sesión administrativa AAL2: cobertura visible
  de 3/3 anuncios elegibles con hashes; no hay coincidencias abiertas entre
  ellos. Las publicaciones con fotos externas informan que no se analizaron.
  No se alteraron anuncios, fingerprints ni señales.
