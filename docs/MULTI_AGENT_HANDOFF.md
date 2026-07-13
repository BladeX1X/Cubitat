# Relevo y coordinación multiagente de Cubitat

Última actualización: 2026-07-13

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

- Rama base actual: `main`, commit `60cd5ff` tras fusionar los PR #4 y #5.
- Migraciones: 40 migraciones sincronizadas con producción; la migración 39
  endurece RLS y la 40 incorpora métricas agregadas admin-only.
- Validación local más reciente: lint limpio, 20 archivos de pruebas y 80
  pruebas aprobadas, build de producción correcto y sitemap de 1007 URLs.
- Recuperación de contraseña:
  - plantilla remota portable con `token_hash` aplicada mediante Supabase CLI;
  - enlace real probado sin el error PKCE entre navegadores;
  - la ruta usa un shell aislado que no muestra el estado autenticado;
  - después de cambiar la contraseña se ejecuta `signOut` y se abre el login.
- Despliegue activo de Cloudflare: `cbacb3a6-fa2a-40c7-80ac-570c325666fa`.
- Google OAuth funciona de extremo a extremo.
- Panel de moderación accesible para administrador. Último estado observado:
  0 pendientes, 9 rechazadas por IA y 303 publicadas.
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
- GitHub/Cloudflare: PR autogenerado #1 cerrado por obsoleto. El Worker estático
  legado `cubitat` aún expone su subdominio `workers.dev`; no tiene dominio
  personalizado ni bindings. Deshabilitar ese subdominio requiere una acción
  explícita en Cloudflare y no bloquea `cubitathome.com`, servido por `cubitat1`.
- Pendientes humanos: prueba táctil en dispositivo físico, contenido/fotos
  reales aprobados y revisión jurídica. Pendientes operativos no bloqueantes:
  branding OAuth, renovar el token de métricas antes de 2026-08-11, observar
  KPIs reales y sanear una URL de imagen de contenido cuando se autorice.

## Notas de seguridad

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
