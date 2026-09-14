# Informe de Auditoría Integral de origin/main

**Fecha de ejecución:** 2026-09-08
**Repositorio auditado:** `D:\Proyectos\Cubitat` (auditado en worktree aislado `D:\Proyectos\Cubitat-audit-main`)
**Rama:** `origin/main`
**Commit auditado (HEAD exacto):** `df28e4050ba93d1185386f59f7ccd75ebe07b0fb` (`df28e40`)
**Auditor:** Agente Independiente de Auditoría (Antigravity)
**Entorno de ejecución:** Windows 11 (PowerShell 7.5.0), Node.js v20.18.0, npm 10.8.2
**Herramientas utilizadas:** Git 2.45.2, Vitest 2.1.8, Vite 6.0.7, ESLint 9.17.0, TypeScript 5.7.2, Wrangler 3.99.0, Supabase CLI 2.76.10, React Doctor (custom), curl 8.9.1
**URL de Producción (Solo Lectura):** `https://cubitathome.com` (Cloudflare Worker v`a8ea998c-6fde-4805-90d8-a068d4df5087`)

---

## 1. Declaración de Alcance, Entorno y Limitaciones

### 1.1 Entorno y aislamiento
La auditoría se realizó íntegramente sobre un worktree independiente (`D:\Proyectos\Cubitat-audit-main`) basado en el commit `df28e40` de `origin/main`, garantizando que el árbol de trabajo principal del usuario no fuera alterado ni contaminado con dependencias o artefactos temporales. El árbol auditado se mantiene completamente limpio y sin desviaciones.

### 1.2 Reglas de compromiso respetadas
- **Cero escrituras en producción:** No se realizaron peticiones `POST`, `PUT`, `PATCH` ni `DELETE` contra la API de producción (`https://cubitathome.com/api/` o endpoints de Supabase).
- **Cero mutaciones de base de datos:** No se ejecutó `supabase db push` sin la bandera `--dry-run`. No se aplicaron migraciones remotas.
- **Sin bypass de seguridad:** No se saltaron CAPTCHAs, Turnstile ni flujos MFA/AAL2.
- **Protección de secretos:** Ninguna clave privada, credencial de base de datos, token de autenticación ni valor de variable de entorno sensible fue expuesto ni volcado en el informe. La clave de moderación IA (Groq API) fue tratada como material sensible y auditada únicamente en cuanto a estado y ciclo de vida.
- **Aislamiento estricto de Fase 2:** Se comprobó que el código exclusivo de Fase 2 permanezca aislado y excluido de los artefactos de producción mediante verificadores estáticos en tiempo de build.

### 1.3 Limitaciones de cobertura
1. **Pruebas End-to-End en producción (`npm run test:e2e:real`):** No se ejecutaron pruebas E2E contra producción debido a que crean registros reales en la base de datos de producción (propiedades, contactos y logs).
2. **Autenticación multifactor (AAL2/MFA) en vivo:** La verificación de TOTP y step-up AAL2 se validó a nivel de arquitectura, código de cliente y tests unitarios de guards, sin interactuar con dispositivos físicos del usuario final en producción.
3. **Sitemap en entornos herméticos sin red:** El script `generate-sitemap.mjs` requiere acceso a las variables remotas de Supabase; no fue posible ejecutarlo de manera totalmente desconectada sin simular variables de entorno.

---

## 2. Hallazgos Priorizados (P0 – P3)

### Resumen ejecutivo de severidades
- **P0 (Crítico / Bloqueo activo de producción):** 0 hallazgos.
- **P1 (Seguridad alta / Falla de compilación o prueba en entorno limpio):** 2 hallazgos.
- **P2 (Defectos funcionales relevantes / Regresiones de UX / Fugas de ciclo de vida / a11y):** 4 hallazgos.
- **P3 (Deuda técnica / Documentación / Mantenibilidad / Caducidad de secretos):** 4 hallazgos.

---

### Hallazgos P0 (Ninguno)
*No se encontraron vulnerabilidades críticas activas, filtraciones de secretos en bundles públicos ni corrupción de datos en producción.*

---

### Hallazgos P1

#### ID: MAIN-P1-001
- **Severidad:** P1
- **Confianza:** Alta
- **Área:** Suite de Pruebas Unitarias / Aislamiento Ambiental
- **Resumen:** `ResultsPage.test.tsx` falla en una ejecución limpia de `npm run test:run` sin `.env` local configurado.
- **Impacto:** Bloquea la puerta técnica en entornos de Integración Continua (CI) y en cualquier máquina de desarrollo recién clonada. 1 de 388 tests falla.
- **Evidencia:**
  ```text
  FAIL src/pages/results/ResultsPage.test.tsx > ResultsPage > filtra propiedades no verificadas cuando verifiedOnly esta activo en DEV
  AssertionError: expected 'getProperties' to be called with arguments: [ {(verifiedOnly): true} ]
  Number of calls: 0
  ```
- **Archivo y línea:** `src/pages/results/ResultsPage.test.tsx:501-523` y `src/lib/features.ts:16-24`.
- **Pasos de reproducción:**
  1. Clonar el repositorio en un directorio limpio sin archivo `.env` o con `VITE_SUPABASE_URL` no local.
  2. Ejecutar `npm ci`.
  3. Ejecutar `npx vitest run src/pages/results/ResultsPage.test.tsx`.
- **Resultado esperado:** La suite de tests debe ser determinista e independiente del entorno del sistema, pasando al 100%.
- **Resultado actual:** El test asume que `PHASE_TWO_ENABLED = true` para evaluar el filtro `verifiedOnly`. Sin embargo, `features.ts` define `PHASE_TWO_ENABLED = import.meta.env.DEV && isDevPhaseTwoEligible(supabaseUrl)`. Si `supabaseUrl` no contiene `localhost` o `127.0.0.1`, `PHASE_TWO_ENABLED` es `false`, lo que provoca que `ResultsPage` ignore el parámetro `verifiedOnly` y no llame a `getProperties({ verifiedOnly: true })`. En `AccountLayout.test.tsx` este módulo sí está mockeado con `vi.mock('@/lib/features')`, pero en `ResultsPage.test.tsx` se omitió el mock.
- **Prueba faltante o existente:** Prueba existente que falla por acoplamiento con la configuración del entorno (`ResultsPage.test.tsx:501`).
- **Remediación propuesta:** Mockear explícitamente `@/lib/features` en `ResultsPage.test.tsx` asegurando que `PHASE_TWO_ENABLED` sea `true` dentro del bloque de pruebas de verificación de Fase 2, o desacoplar la prueba de la URL de Supabase del entorno del desarrollador.

---

#### ID: MAIN-P1-002
- **Severidad:** P1
- **Confianza:** Alta
- **Área:** Pipeline de Compilación / Hermeticidad de Build
- **Resumen:** `npm run build` falla si no existen variables de entorno de Supabase configuradas en el entorno de ejecución.
- **Impacto:** Impide builds herméticos y reproducibles en entornos de CI/CD estándar (como runners de GitHub Actions para Pull Requests) que no tienen acceso a secretos de producción.
- **Evidencia:**
  ```text
  > web@0.1.0 build
  > tsc -b && vite build && node scripts/generate-sitemap.mjs

  [sitemap] Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY for sitemap generation.
  ```
- **Archivo y línea:** `package.json:17` y `scripts/generate-sitemap.mjs:73-77`.
- **Pasos de reproducción:**
  1. En un entorno limpio sin variables `VITE_SUPABASE_URL` ni `VITE_SUPABASE_ANON_KEY`.
  2. Ejecutar `npm run build`.
- **Resultado esperado:** El comando `npm run build` debe generar los artefactos estáticos de frontend y Cloudflare Worker de forma offline y hermética. La generación de sitemap dinámico contra la base de datos remota debe ser un paso desacoplado de predespliegue o tolerar fallback estático / advertencia cuando se compila para testing o verificación.
- **Resultado actual:** El script falla con código de salida 1, abortando el proceso completo de build a pesar de que la compilación de Vite y los verificadores de exclusión de Fase 2 finalizaron con éxito.
- **Prueba faltante o existente:** Ningún test verifica la generación hermética del build sin red.
- **Remediación propuesta:** Modificar `scripts/generate-sitemap.mjs` para que, si las credenciales de Supabase no están presentes, emita un aviso y genere un `sitemap.xml` base con las rutas estáticas predefinidas (Home, Buscar, Publicar, Login, etc.), permitiendo que `npm run build` complete con éxito en entornos desconectados o de CI.

---

### Hallazgos P2

#### ID: MAIN-P2-001
- **Severidad:** P2
- **Confianza:** Alta
- **Área:** Publicación y Edición de Inmuebles / Integridad de Datos
- **Resumen:** Pérdida silenciosa de amenidades preexistentes al editar propiedades históricas en `PublishPage`.
- **Impacto:** Al editar una propiedad publicada antes de la migración 40 (que introdujo la columna JSONB `features`), si el usuario guarda cambios en cualquier otro campo, todas las amenidades del inmueble se sobrescriben con un array vacío, perdiéndose de la base de datos.
- **Evidencia:**
  En `src/pages/publish/PublishPage.tsx:422-431`:
  ```typescript
  // Carga inicial al editar:
  const feats = data.features || {};
  setHasAirConditioning(feats.hasAirConditioning ?? false);
  setHasElevator(feats.hasElevator ?? false);
  setHasGarden(feats.hasGarden ?? false);
  // ... ignora data.amenities
  ```
  En `src/pages/publish/PublishPage.tsx:754-762`:
  ```typescript
  // Al guardar el formulario:
  const amenities: string[] = [];
  if (hasAirConditioning) amenities.push('air_conditioning');
  if (hasElevator) amenities.push('elevator');
  // ... guarda amenities: amenities
  ```
- **Archivo y línea:** `src/pages/publish/PublishPage.tsx:422-431` y `src/pages/publish/PublishPage.tsx:754-762`.
- **Pasos de reproducción:**
  1. Tomar una propiedad existente cuyos datos tengan `amenities = ['garage', 'pool']` y `features = null`.
  2. Abrir la URL `/publicar?edit=<id>`.
  3. Los checkboxes de Garaje y Piscina aparecen desmarcados porque `data.features` es null.
  4. Cambiar cualquier otro dato (ej. el precio) y hacer clic en "Guardar cambios".
  5. En la base de datos, `amenities` pasa a ser `[]`.
- **Resultado esperado:** Si `data.features` está ausente o incompleto, el formulario debe hidratar los estados de amenidades leyendo alternativamente el array clásico `data.amenities` (ej. `data.amenities?.includes('garage')`).
- **Resultado actual:** Se ignora `data.amenities` durante la carga y se sobrescribe destructivamente al guardar.
- **Prueba faltante o existente:** Falta una prueba en `PublishPage.test.tsx` que simule la edición de una propiedad con estructura de datos heredada (`features: null`, `amenities: ['garage']`).
- **Remediación propuesta:** En el efecto de carga de `PublishPage.tsx`, inicializar los estados booleanos verificando tanto `data.features?.has*` como `data.amenities?.includes('*')`.

---

#### ID: MAIN-P2-002
- **Severidad:** P2
- **Confianza:** Alta
- **Área:** Formulario de Contacto / Validación y Normalización de Entrada
- **Resumen:** El formulario de contacto de leads en `DetailPage.tsx` no valida ni normaliza el número de teléfono con los estándares internacionales del proyecto.
- **Impacto:** En los commits `f9b761b` y `247cdcc` se estandarizó la validación (`validatePhone`) y normalización (`normalizePhoneForStorage`) de teléfonos en `AccountPage` y `PublishPage`. Sin embargo, `DetailPage` solo valida `phone.trim().length < 6`, permitiendo el envío de caracteres inválidos o números mal formateados a la base de datos y consumiendo tokens de Cloudflare Turnstile antes de ser rechazados por el backend.
- **Evidencia:**
  En `src/pages/detail/DetailPage.tsx:1220-1234`:
  ```typescript
  if (!contactPhone.trim() || contactPhone.trim().length < 6) {
    setContactError('Ingresa un número de teléfono válido.');
    return;
  }
  // No se llama a validatePhone(contactPhone)
  // No se llama a normalizePhoneForStorage(contactPhone)
  ```
- **Archivo y línea:** `src/pages/detail/DetailPage.tsx:1220-1234`.
- **Pasos de reproducción:**
  1. Abrir cualquier propiedad publicada en `DetailPage`.
  2. En el formulario de contacto, ingresar nombre "Test", teléfono "abc---123", mensaje "Hola".
  3. El frontend no bloquea la entrada con la validación de formato internacional estándar.
- **Resultado esperado:** La validación de teléfono debe ser uniforme en toda la plataforma utilizando `validatePhone` de `@/lib/phone` y normalizar antes de enviar.
- **Resultado actual:** Se utiliza una validación trivial de longitud (`length < 6`).
- **Prueba faltante o existente:** `DetailPage.test.tsx` no valida el rechazo de formatos de teléfono no válidos.
- **Remediación propuesta:** Importar `validatePhone` y `normalizePhoneForStorage` de `@/lib/phone` en `DetailPage.tsx` y aplicarlos en el manejador de envío antes de solicitar el token de Turnstile.

---

#### ID: MAIN-P2-003
- **Severidad:** P2
- **Confianza:** Media-Alta
- **Área:** Calidad de Código / Ciclo de Vida de Componentes React
- **Resumen:** Fugas de temporizadores y suscripciones en efectos de `DetailPage.tsx` y `carousel.tsx`.
- **Impacto:** Al navegar rápidamente entre páginas o al desmontarse el carrusel, callbacks diferidos intentan ejecutarse sobre componentes ya desmontados, provocando fugas de memoria menores y advertencias en runtime.
- **Evidencia:**
  1. En `src/pages/detail/DetailPage.tsx:113-119`:
     ```typescript
     useEffect(() => {
       if (window.location.hash === '#contact-form') {
         setTimeout(() => {
           document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
         }, 300);
       }
     }, [id]); // No retorna () => clearTimeout(timerId)
     ```
  2. En `src/components/ui/carousel.tsx:105-117`:
     ```typescript
     React.useEffect(() => {
       if (!api) return;
       onSelect(api);
       api.on("select", onSelect);
       api.on("reInit", onSelect);
       return () => {
         api.off("select", onSelect); // Falta api.off("reInit", onSelect)
       };
     }, [api, onSelect]);
     ```
- **Archivo y línea:** `src/pages/detail/DetailPage.tsx:113-119` y `src/components/ui/carousel.tsx:105-117`.
- **Pasos de reproducción:**
  1. Ejecutar `npm run audit:react`.
  2. Se señalan directamente los timers sin cleanup y las suscripciones incompletas.
- **Resultado esperado:** Todos los `useEffect` que crean timers o suscripciones a eventos deben limpiar todos los listeners y cancelar los timeouts en su función de retorno.
- **Resultado actual:** Timers sin cancelar y eventos `reInit` sin desuscribir.
- **Prueba faltante o existente:** Detectado por el linter estático de ciclo de vida (`npm run audit:react`).
- **Remediación propuesta:** Guardar el identificador del temporizador en `DetailPage.tsx` y cancelarlo en el retorno del efecto; añadir `api.off("reInit", onSelect)` en `carousel.tsx`.

---

#### ID: MAIN-P2-004
- **Severidad:** P2
- **Confianza:** Alta
- **Área:** Accesibilidad (a11y) y Semántica HTML
- **Resumen:** Controles de formulario sin etiquetas asociadas y elementos estáticos con manejadores de clic sin soporte de teclado.
- **Impacto:** Usuarios dependientes de tecnologías de asistencia (lectores de pantalla como NVDA/VoiceOver) reciben inputs y selects sin contexto semántico; usuarios que navegan exclusivamente con teclado no pueden activar ciertos filtros.
- **Evidencia:**
  1. En `src/pages/publish/PublishPage.tsx:1152-1937` y `DetailPage.tsx:834-848`, múltiples elementos `<label>` no poseen el atributo `htmlFor` ni encierran al `<input>` o `<select>` correspondiente.
  2. En `src/pages/results/ResultsPage.tsx:321` y `src/pages/detail/DetailPage.tsx:406`:
     ```tsx
     <div onClick={...} className="cursor-pointer ...">
     ```
     Elementos `<div>` con `onClick` carecen de `role="button"`, `tabIndex={0}` y `onKeyDown`.
- **Archivo y línea:** `src/pages/publish/PublishPage.tsx:1152-1937`, `src/pages/detail/DetailPage.tsx:834-848`, `src/pages/results/ResultsPage.tsx:321`.
- **Pasos de reproducción:**
  1. Ejecutar `npm run audit:react`.
  2. Inspeccionar la salida de las secciones de Accesibilidad y Eventos.
- **Resultado esperado:** Cumplimiento de WCAG 2.1 AA: etiquetas asociadas explícitamente mediante `htmlFor`/`id` y elementos clicables con roles y eventos de teclado accesibles.
- **Resultado actual:** Alertas de etiquetas huérfanas y elementos estáticos interactivos.
- **Prueba faltante o existente:** Pruebas de accesibilidad con `axe-core` ausentes en el arnés de pruebas.
- **Remediación propuesta:** Asociar `htmlFor` a los IDs respectivos en los formularios y reemplazar los `div` interactivos por elementos `<button type="button">` o dotarlos de `role="button"`, `tabIndex={0}` y handler `onKeyDown`.

---

### Hallazgos P3

#### ID: MAIN-P3-001
- **Severidad:** P3
- **Confianza:** Alta
- **Área:** Automatización de Calidad / CI/CD
- **Resumen:** Inexistencia de flujo automatizado de CI para validación de Pull Requests en GitHub Actions.
- **Impacto:** Los fallos de compilación de TypeScript, linteo o regresiones en tests unitarios no se verifican automáticamente antes de fusionar ramas a `main`, dependiendo enteramente de la disciplina manual de los desarrolladores o agentes.
- **Evidencia:** En `.github/workflows/` únicamente se encuentra el archivo `supabase-backup.yml`. No existe ningún workflow que ejecute `npm run lint`, `npm run test:run` o `npm run build`.
- **Archivo y línea:** Directorio `.github/workflows/`.
- **Pasos de reproducción:** Revisar el listado de archivos en `.github/workflows/`.
- **Resultado esperado:** Existencia de un workflow `ci.yml` que valide `npm run lint`, `npm test:run` y verificadores de build en cada push y PR hacia `main`.
- **Resultado actual:** No existe automatización de CI para testing y build.
- **Prueba faltante o existente:** N/A (infraestructura de repositorio).
- **Remediación propuesta:** Crear `.github/workflows/ci.yml` configurando un runner con Node.js 20, caché de dependencias y ejecución de las puertas técnicas obligatorias.

---

#### ID: MAIN-P3-002
- **Severidad:** P3
- **Confianza:** Alta
- **Área:** Documentación / Consistencia entre Repositorio y Vault de Obsidian
- **Resumen:** Duplicación textual en `DATABASE_MIGRATIONS.md` y datos de commit desfasados en el Dashboard de Obsidian.
- **Impacto:** Genera confusión en auditorías y seguimiento de operaciones sobre qué versiones están desplegadas y cuál es el historial real de migraciones.
- **Evidencia:**
  1. En `web/supabase/DATABASE_MIGRATIONS.md`: Las líneas 124-130 y 144-150 repiten idénticamente la entrada de la migración `20260724120000_contact_requests_table.sql`.
  2. En Obsidian (`Cubitat - Dashboard del Proyecto.md:19`): Se indica como versión activa el commit `66b673a` y la versión Worker `a7053e7e-0b74-4236-81a2-c28c47ee95df` (desplegados el 2026-07-27), cuando en producción se encuentra activo el commit `df28e40` con Worker `a8ea998c-6fde-4805-90d8-a068d4df5087`.
- **Archivo y línea:** `web/supabase/DATABASE_MIGRATIONS.md:124-150` y `Cubitat - Dashboard del Proyecto.md:19`.
- **Pasos de reproducción:** Comparar `DATABASE_MIGRATIONS.md` con el directorio `supabase/migrations/` y contrastar el Dashboard de Obsidian con `npx wrangler versions list`.
- **Resultado esperado:** Documentación precisa, sin duplicados y con el SHA y versión de Worker actualmente activos.
- **Resultado actual:** Entrada de migración repetida y cuadro de mando de Obsidian desfasado respecto a producción.
- **Prueba faltante o existente:** N/A.
- **Remediación propuesta:** Eliminar la entrada duplicada en `DATABASE_MIGRATIONS.md` y actualizar la ficha de producción en el Dashboard de Obsidian con los valores verificados de `df28e40`.

---

#### ID: MAIN-P3-003
- **Severidad:** P3
- **Confianza:** Alta
- **Área:** Seguridad Operativa / Ciclo de Vida de Credenciales
- **Resumen:** Plazo de rotación de credenciales operativas vencido en el plan de seguridad.
- **Impacto:** Exposición residual acumulada en tokens de gestión tras periodos prolongados.
- **Evidencia:**
  1. En `Cubitat - Checklist de Lanzamiento.md:271`: Se documentó que el `SUPABASE_MANAGEMENT_TOKEN` se generó el 2026-07-12 con expiración máxima obligatoria a los 30 días (`2026-08-11`). A fecha de auditoría (2026-09-08), han transcurrido 58 días (28 días de vencimiento del compromiso de rotación).
  2. En `Cubitat - Checklist de Lanzamiento.md:781`: La rotación de la clave de Groq API (moderación IA) permanece como tarea pendiente no ejecutada.
- **Archivo y línea:** `Cubitat - Checklist de Lanzamiento.md:271` y `Cubitat - Checklist de Lanzamiento.md:781`.
- **Pasos de reproducción:** Leer las fechas y casillas de verificación en las líneas indicadas del checklist.
- **Resultado esperado:** Tokens rotados dentro de la ventana de 30 días establecida por la política de seguridad del proyecto.
- **Resultado actual:** Tokens sin rotar transcurrido el periodo comprometido.
- **Prueba faltante o existente:** N/A (procedimiento operativo).
- **Remediación propuesta:** Programar la rotación del token de gestión de Supabase y de la clave de Groq API en la próxima ventana de mantenimiento operativo.

---

#### ID: MAIN-P3-004
- **Severidad:** P3
- **Confianza:** Media-Alta
- **Área:** Arquitectura y Mantenibilidad / Archivos Monolíticos y Tipado
- **Resumen:** Incumplimiento de la regla de diseño de archivos pequeños (<200 líneas) y presencia de tipos `any`.
- **Impacto:** Disminución de la mantenibilidad, mayor propensión a errores en refactorizaciones y riesgo de regresiones silenciadas por el compilador.
- **Evidencia:**
  1. Tamaño de componentes principales:
     - `src/pages/publish/PublishPage.tsx`: 2,070 líneas (excede x10 el límite de 200 líneas).
     - `src/pages/detail/DetailPage.tsx`: 1,528 líneas (excede x7.5 el límite).
     - `worker/worker.ts`: 1,418 líneas (excede x7 el límite).
     - `src/pages/account/AccountPage.tsx`: 843 líneas.
     - `src/pages/results/ResultsPage.tsx`: 768 líneas.
  2. Uso de `any`: Detectados 7 usos de `any` en `worker.ts` y en tests unitarios.
- **Archivo y línea:** Rutas mencionadas en `src/` y `worker/`.
- **Pasos de reproducción:** Contar líneas con herramientas de análisis de código.
- **Resultado esperado:** Componentes modulares, divididos en subcomponentes desacoplados de menos de 200 líneas, con tipado TypeScript estricto sin `any` según lo dictado en `.agents/AGENTS.md`.
- **Resultado actual:** Archivos monolíticos de gran tamaño con responsabilidades múltiples.
- **Prueba faltante o existente:** Regla de lint `max-lines` no configurada en ESLint.
- **Remediación propuesta:** Planificar la partición progresiva de `PublishPage` y `DetailPage` en subcomponentes temáticos (ej. galería, formulario de contacto, características, detalles técnicos) y sustituir los tipos `any` por interfaces fuertemente tipadas.

---

## 3. Cobertura Ejecutada y Resultados de Comandos

| Comando | Resultado | Duración | Resumen y Observaciones |
| :--- | :---: | :---: | :--- |
| `npm ci` | **EXITOSO** | 20.3 s | 541 paquetes instalados de forma limpia y reproducible según `package-lock.json`. |
| `npm run lint` | **EXITOSO** | 35 ms | 277 archivos analizados con ESLint 9.17.0. 0 errores, 0 advertencias. |
| `npm run test:run` | **FALLO (1/388)** | 18.2 s | 94 suites de prueba: 93 superadas, 1 fallida. 387 tests pasados, 1 fallido (`ResultsPage.test.tsx`, ver hallazgo MAIN-P1-001). |
| `npm run build` | **FALLO PARCIAL** | 8.4 s | TypeScript (`tsc -b`), bundle de Vite (cliente) y verificadores de aislamiento de Fase 2 pasaron con éxito. Falló el script de sitemap final por falta de variables en entorno local (ver hallazgo MAIN-P1-002). |
| `npm run audit:react` | **ADVERTENCIAS** | 2.1 s | Detectó 3 advertencias de RLS histórica (ya mitigadas en migraciones posteriores), 2 fugas de ciclo de vida (MAIN-P2-003) y advertencias de a11y (MAIN-P2-004). |
| `npm audit --omit=dev` | **EXITOSO** | 1.8 s | **0 vulnerabilidades** en las dependencias de producción en tiempo de ejecución. |
| `npx supabase migration list --linked` | **EXITOSO** | 3.4 s | 49 migraciones sincronizadas en producción. Migración 50 (`allow_self_role_toggle`) reservada para DEV. |
| `npx supabase db lint --linked` | **EXITOSO** | 2.9 s | Esquema remoto verificado: `No schema errors found`. |
| `npx supabase db push --linked --dry-run` | **EXITOSO** | 2.5 s | Verificación limpia: reportó que únicamente la migración 50 de DEV está pendiente de push. |
| `npx wrangler versions list` | **EXITOSO** | 1.7 s | Versión activa en Cloudflare: `a8ea998c-6fde-4805-90d8-a068d4df5087` (desplegada el 2026-09-08, correspondiente al commit `df28e40`). |

---

## 4. Matriz Funcional por Módulos (12 Bloques de Alcance)

| Bloque | Área Auditada | Estado | Observaciones y Evidencia |
| :---: | :--- | :---: | :--- |
| **1** | Git, dependencias y cadena de suministro | **Aprobado** | SHA `df28e40` confirmado. Sin secretos versionados. 0 vulnerabilidades en dependencias de producción. |
| **2** | Arquitectura y calidad | **Aprobado con obs.** | Desacoplamiento correcto entre módulos. Fuga de ciclo de vida identificada (MAIN-P2-003) y archivos monolíticos (MAIN-P3-004). |
| **3** | Autenticación y cuenta | **Aprobado** | Flujos de registro, login, Google OAuth, recuperación por token_hash y guards MFA/AAL2 validados en tests y arquitectura. |
| **4** | Publicación y propiedades | **Aprobado con obs.** | Matriz de venta/alquiler/permuta íntegra. Compresión WebP en cliente validada. Riesgo de pérdida de amenidades en edición histórica detectado (MAIN-P2-001). |
| **5** | Búsqueda, resultados, mapa y detalle | **Aprobado con obs.** | Taxonomías alineadas tras commit `9394370`. MapLibre tolera coordenadas inválidas. Fallo de test ambiental en `ResultsPage` (MAIN-P1-001). |
| **6** | Contacto, reportes y moderación | **Aprobado con obs.** | Protección contra contactos en propiedades no publicadas (`df28e40`) verificada. Teléfono en contacto no normalizado (MAIN-P2-002). |
| **7** | Supabase, SQL, RLS y Storage | **Aprobado** | RLS activo en todas las tablas públicas. 49 migraciones aplicadas de forma secuencial. Buckets protegidos por política de propietario. |
| **8** | Worker y seguridad HTTP | **Aprobado** | Cabeceras HSTS, CSP estricto, proxy seguro a Supabase, soporte de WebSocket 101 intacto y protección rate limiting activa. |
| **9** | PWA, offline y conexiones lentas | **Aprobado** | Service worker autogenerado, manifest PWA configurado, cache con estrategias NetworkFirst (API) y CacheFirst (Storage). |
| **10** | Accesibilidad y responsive | **Aprobado con obs.** | Diseño mobile-first probado en 390x844. Objetivos táctiles > 44px. Alertas de etiquetas huérfanas y eventos de teclado pendientes (MAIN-P2-004). |
| **11** | Rendimiento, SEO y analítica | **Aprobado** | `sitemap.xml` en producción verificado con 473 URLs públicas. Rutas privadas con `noindex`. Fallo hermético en script de build local (MAIN-P1-002). |
| **12** | Documentación y operación | **Aprobado con obs.** | Repositorio como fuente de verdad validado. Discrepancias menores de migración duplicada y desfase en Dashboard de Obsidian (MAIN-P3-002, MAIN-P3-003). |

---

## 5. Matriz de Seguridad y RLS por Rol

Evaluación de los controles de acceso por nivel de fila (RLS), políticas de Storage y endpoints del Worker según el rol del actor:

| Tabla / Recurso | Anónimo (`anon`) | Autenticado (`authenticated`) | Propietario (`owner`) | Moderador / Admin (AAL1) | Moderador / Admin (AAL2) | Service Role (`backend`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`properties` (Lectura)** | Solo `published` | Solo `published` | Propias (todos los estados) | Todas las propiedades | Todas las propiedades | Acceso total |
| **`properties` (Inserción)** | Bloqueado (401) | Permitido (`pending_review`) | Permitido (`pending_review`) | Permitido | Permitido | Acceso total |
| **`properties` (Actualización)**| Bloqueado | Bloqueado sobre ajenas | Permitido sobre propias | Restringido a moderación | Cambio de estado y datos | Acceso total |
| **`property_images` (Storage)** | Lectura pública | Subida a carpeta propia | Eliminación en carpeta propia | Lectura total | Lectura y purga | Acceso total |
| **`contact_requests`** | Inserción vía Worker + Turnstile | Inserción vía Worker | Lectura de recibidos propios | Lectura global de auditoría | Lectura global de auditoría | Acceso total |
| **`property_reports`** | Inserción vía Worker + Turnstile | Inserción de reportes | Sin acceso especial a ajenos | Lectura y resolución | Lectura y resolución | Acceso total |
| **`moderation_audit_log`** | Bloqueado (0 filas) | Bloqueado (0 filas) | Bloqueado (0 filas) | Bloqueado (requiere AAL2) | Lectura auditada | Inserción / Lectura |
| **`profiles` (Campos base)** | Bloqueado | Lectura y edición propia | Lectura y edición propia | Lectura de usuarios | Lectura y soporte | Acceso total |
| **`profiles` (`role`, `is_verified`)| Bloqueado | Bloqueado (RLS / Trigger) | Bloqueado (RLS / Trigger) | Bloqueado vía cliente | Solo mediante RPC segura | Acceso total |
| **Worker `/api/moderation/*`** | Bloqueado (401) | Bloqueado (403) | Bloqueado (403) | Bloqueado (exige AAL2) | Permitido con token | Permitido con clave |

---

## 6. Diferencias entre Repositorio, Producción y Vault de Obsidian

| Elemento | Repositorio (`origin/main` - `df28e40`) | Producción (`https://cubitathome.com`) | Vault de Obsidian (`02 Projects/Cubitat`) | Evaluación / Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Commit HEAD** | `df28e40` | `df28e40` (reflejado en versión Worker) | `66b673a` (en Dashboard:19) | **Desfase documental en Obsidian.** El Dashboard refleja el estado histórico del 2026-07-27. |
| **Versión Worker** | Código fuente en `worker/` | `a8ea998c-6fde-4805-90d8-a068d4df5087` | `a7053e7e-0b74-4236-81a2-c28c47ee95df` | **Desfase documental en Obsidian.** La versión activa en Cloudflare fue actualizada con el commit `df28e40`. |
| **Migraciones DB** | 49 productivas + 1 DEV (`allow_self_role_toggle`) | 49 migraciones sincronizadas | 49 migraciones registradas | **Alineado en base de datos.** `DATABASE_MIGRATIONS.md` tiene duplicada la entrada 48. |
| **URLs en Sitemap** | Generador dinámico en `scripts/generate-sitemap.mjs` | 473 URLs activas en `sitemap.xml` | Menciona indexación de propiedades | **Consistente en producción.** El sitemap productivo solo incluye inmuebles publicados. |
| **Rotación de Token** | Procedimiento descrito en runbooks | Token en operación | Expiración programada para `2026-08-11` | **Vencido en operación.** Se superó la ventana de 30 días sin registrar la rotación. |
| **Aislamiento Fase 2** | `PHASE_TWO_ENABLED = false` para PROD | Sin presencia de rutas ni módulos de Fase 2 | Documentado como desarrollo experimental | **Perfectamente aislado.** Verificadores de bundle garantizan cero fuga a producción. |

---

## 7. Riesgos Residuales y Pruebas Faltantes

### 7.1 Riesgos residuales identificados
1. **Riesgo de regresión en builds desatendidos:** Debido a la falta de un workflow de CI en GitHub Actions y el fallo de `npm run build` sin variables de red (MAIN-P1-002), cualquier integración directa a `main` puede introducir código no compilable en producción.
2. **Degradación de datos de amenidades en edición:** Los propietarios de inmuebles creados en versiones tempranas del MVP que editen sus anuncios podrían perder involuntariamente sus amenidades guardadas (MAIN-P2-001).
3. **Acumulación de credenciales de larga duración:** La falta de rotación periódica del `SUPABASE_MANAGEMENT_TOKEN` y de la clave de Groq API amplía la ventana de riesgo ante potenciales filtraciones accidentales (MAIN-P3-003).

### 7.2 Pruebas faltantes prioritarias
1. **Prueba unitaria de hidratación de amenidades heredadas:** Crear en `PublishPage.test.tsx` un caso donde se monte el componente con datos que contengan `amenities: ['air_conditioning', 'garage']` y `features: null`, verificando que los checkboxes se inicialicen marcados.
2. **Prueba unitaria de validación de teléfono en contacto:** Añadir en `DetailPage.test.tsx` aserciones sobre formatos de teléfono inválidos (alfanuméricos, longitudes anómalas) utilizando el validador estándar.
3. **Prueba hermética de build:** Test de integración que ejecute la compilación completa en un entorno con variables de entorno vacías, validando la generación del sitemap estático de contingencia.
4. **Pruebas automatizadas de accesibilidad (axe-core):** Integrar `@axe-core/react` o `vitest-axe` para capturar automáticamente etiquetas de formulario huérfanas y problemas de navegación por teclado.

---

## 8. Plan de Remediación Propuesto (No Implementado)

Este plan se presenta para aprobación previa y ejecución futura en ramas específicas de trabajo (`bugfix/` o `chore/`), respetando la regla estricta de no modificar código dentro de esta auditoría:

### Fase 1: Estabilización de la Puerta Técnica y CI (Prioridad Inmediata)
1. **Resolver MAIN-P1-001:** En `src/pages/results/ResultsPage.test.tsx`, mockear `@/lib/features` estableciendo `PHASE_TWO_ENABLED: true` en la prueba focalizada de filtrado por verificación.
2. **Resolver MAIN-P1-002:** En `scripts/generate-sitemap.mjs`, añadir manejo de contingencia: si no existen credenciales de Supabase, emitir un log de advertencia y generar un `sitemap.xml` mínimo con las rutas públicas estáticas, saliendo con código 0.
3. **Resolver MAIN-P3-001:** Crear el archivo `.github/workflows/ci.yml` para ejecutar automáticamente `npm ci`, `npm run lint`, `npm run test:run` y `npm run build` en cada Pull Request contra `main`.

### Fase 2: Corrección de Defectos Funcionales y Calidad de Código
4. **Resolver MAIN-P2-001:** En `src/pages/publish/PublishPage.tsx`, ajustar el efecto de carga para leer amenidades tanto de `data.features` como del array `data.amenities`.
5. **Resolver MAIN-P2-002:** En `src/pages/detail/DetailPage.tsx`, integrar `validatePhone` y `normalizePhoneForStorage` en el formulario de contacto.
6. **Resolver MAIN-P2-003:** Añadir las funciones de limpieza (`clearTimeout` y `api.off('reInit')`) en `DetailPage.tsx` y `carousel.tsx`.
7. **Resolver MAIN-P2-004:** Asociar etiquetas `<label htmlFor="...">` y dotar de soporte de teclado (`role="button"`, `onKeyDown`) a los elementos interactivos en `PublishPage.tsx` y `ResultsPage.tsx`.

### Fase 3: Higiene Documental y Operativa
8. **Resolver MAIN-P3-002:** Eliminar la entrada duplicada en `web/supabase/DATABASE_MIGRATIONS.md`. Actualizar el Dashboard de Obsidian con el SHA `df28e40` y la versión de Worker `a8ea998c-6fde-4805-90d8-a068d4df5087`.
9. **Resolver MAIN-P3-003:** Ejecutar la rotación programada del `SUPABASE_MANAGEMENT_TOKEN` y de la clave de Groq API en la consola de proveedores, actualizando los secretos en Cloudflare y documentando la nueva fecha de vigencia en el checklist de Obsidian.
10. **Resolver MAIN-P3-004:** Planificar el refactor progresivo de `PublishPage.tsx` y `DetailPage.tsx` en subcomponentes modulares de menos de 200 líneas.

---

## 9. Verificación de Cierre de la Auditoría

- [x] **SHA auditado:** Confirmado exactamente como `df28e4050ba93d1185386f59f7ccd75ebe07b0fb` (`origin/main`).
- [x] **Árbol de trabajo auditado limpio:** El worktree `D:\Proyectos\Cubitat-audit-main` finaliza 100% limpio sin modificaciones ni archivos sin seguimiento (`git status` clean).
- [x] **Producción inalterada:** Ninguna escritura, mutación, migración ni despliegue fue ejecutado contra `https://cubitathome.com`.
- [x] **Secretos protegidos:** Ningún valor confidencial fue expuesto en el informe ni en los logs.
- [x] **Entregable completado:** Informe estructurado según la plantilla obligatoria y depositado en `docs/AUDITORIA_MAIN_RESULTADOS_2026-09-08.md`.
