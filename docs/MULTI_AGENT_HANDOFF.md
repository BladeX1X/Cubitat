# Relevo y coordinación multiagente de Cubitat

Última actualización: 2026-07-12

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

- Rama de trabajo actual: `feature/quality-hardening`.
- Migraciones: 39 migraciones sincronizadas con producción; la migración 39
  endurece RLS de perfiles, contactos y reportes.
- Validación local más reciente: lint limpio, 10 archivos de pruebas y 53
  pruebas aprobadas, build de producción correcto y sitemap de 1007 URLs.
- Recuperación de contraseña:
  - plantilla remota portable con `token_hash` aplicada mediante Supabase CLI;
  - enlace real probado sin el error PKCE entre navegadores;
  - la ruta usa un shell aislado que no muestra el estado autenticado;
  - después de cambiar la contraseña se ejecuta `signOut` y se abre el login.
- Despliegue activo de Cloudflare: `8129f0d1-7573-485a-a42b-20ed85b4306a`.
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
| C. Rendimiento y responsive | En curso | Codex principal | Responsive y TTFB completados; faltan LCP, CLS e INP/TBT porque Chrome DevTools MCP no está configurado. Fallback de imágenes rotas desplegado. |
| D. RLS por rol | Terminado | Codex principal | Matriz real completa: propietario lista y edita únicamente su borrador QA; otro usuario ve cero publicaciones y la URL ajena vuelve a `/mis-propiedades`; admin accede a contenido no público, reportes y controles de moderación; guards y consola correctos. |
| E. Métricas admin | Terminado | Codex principal | Verificado en producción: Cloudflare 23,260 solicitudes del día; Supabase BD 12.9 MB, Storage 0.6 MB, 313 anuncios, 25 usuarios y 3 reportes; GA4 devuelve usuarios activos mediante Service Account con rol Lector. Endpoint admin autenticado, errores parciales y reintento desplegados. El egreso unificado permanece identificado como dato exclusivo del dashboard de Supabase porque su Management API no expone bytes mediante `analytics_usage_read`. |
| F. Moderación Groq | Bloqueado | — | Reevaluar un anuncio únicamente cuando exista uno pendiente. No usar anuncios rechazados o publicados como sustituto. |
| G. Contenido real | Bloqueado | — | Requiere inventario, fotos, títulos, precios y zonas aportados o aprobados por el usuario. |
| H. Legal | Bloqueado | — | Requiere revisión jurídica externa de Privacidad y Términos. |
| I. Operación humana | Bloqueado | — | El usuario debe definir quién revisa publicaciones y el tiempo máximo de revisión. |

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

## Notas de seguridad

- Nunca registrar tokens, contraseñas, secretos, contenido de `.env` ni enlaces
  reales de recuperación.
- No completar un cambio real de contraseña durante una prueba salvo
  autorización específica del usuario.
- No marcar producción como verificada usando solo resultados locales.
- No desplegar cambios de otro carril sin revisar su diff y sus validaciones.
