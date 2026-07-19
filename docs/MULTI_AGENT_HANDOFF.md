# Relevo y coordinación multiagente de Cubitat

Última actualización: 2026-07-19

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

- Rama base actual: `main` en `ba9867f`; el endurecimiento MFA se integró
  mediante el PR #55.
- Migraciones: 47 migraciones sincronizadas con producción. La migración 47
  exige `aal2` además del rol admin en RLS y en la RPC de métricas, sin alterar
  los permisos legítimos del propietario.
- Validación local más reciente: lint limpio, 45 archivos y 172 pruebas
  aprobadas, build TypeScript/Vite/PWA correcto y sitemap de 473 URLs.
- Recuperación de contraseña:
  - plantilla remota portable con `token_hash` aplicada mediante Supabase CLI;
  - enlace real probado sin el error PKCE entre navegadores;
  - la ruta usa un shell aislado que no muestra el estado autenticado;
  - después de cambiar la contraseña se ejecuta `signOut` y se abre el login.
- Despliegue productivo vigente: Worker `cubitat1`, versión
  `91e5452f-0e83-483b-9667-f2bd114331dd`, activa al 100 % desde el 2026-07-19.
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
| L. Bitácora de moderación | En curso | Codex principal | PR #26 fusionado y desplegado; migración 42 sincronizada y bitácora admin verificada en producción con consola limpia. Falta evidencia productiva específica de denegación para usuario normal/anónimo y del rechazo de mutaciones antes de marcar terminado. |
| P. MFA administrativo | Terminado | Codex principal | TOTP activo; guard modular, Worker, RPC y RLS exigen `aal2`. Migración 47 sincronizada; admin AAL1 denegado, admin AAL2 operativo y propietario normal aislado. Lint, 172 pruebas, build, panel y consola verificados. |

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
