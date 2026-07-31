# Panel de moderación

## Responsabilidad

`AdminPage` es únicamente el punto de entrada visual de `/moderar`. Conserva el
guard defensivo por rol, el encabezado y la navegación entre secciones. No debe
consultar Supabase ni contener lógica de moderación.

El guard principal de ruta sigue en `CubitatApp`; el guard de esta página se
mantiene como segunda barrera visual. La autorización efectiva continúa
dependiendo de las políticas RLS y de las funciones administrativas del backend.

## Recuperación de sesión MFA expirada

`AdminMfaGate` distingue `session_not_found` de un TOTP inválido. Cuando la
sesión ya no existe, oculta el formulario que no puede completarse y muestra
`Cerrar sesión e iniciar nuevamente`.

La acción no accede directamente a Supabase desde `AdminPage`: propaga
`onSessionExpired` hasta `CubitatApp`, que reutiliza el cierre central para
limpiar Auth, caché offline y borrador legado, volver a `/` y abrir el login.
Si el callback falla, el guard permanece bloqueado, no muestra datos
administrativos y ofrece reintentar con un mensaje seguro.

## Módulos

Cada capacidad vive bajo `src/modules/admin`:

- `properties`: listado, filtros, paginación y moderación de publicaciones.
- `reports`: listado, filtros, paginación y resolución de reportes.
- `metrics`: métricas locales de Supabase y métricas externas disponibles.
- `advertiser-context`: resumen de actividad y señales explicables del
  anunciante, cargado únicamente al expandir una publicación. Recibe solo el
  identificador del usuario y no ejecuta mutaciones.
- `audit-log`: consulta paginada y de solo lectura de cambios/eliminaciones de
  propiedades. Encapsula filtros, estado asíncrono, formateo y tarjetas
  mobile-first sin depender de los módulos de propiedades, reportes o métricas.
- `kyc`: capacidad exclusiva de Fase 2/DEV. Su importación es lazy y queda
  detrás de `import.meta.env.DEV`, por lo que Vite elimina del build productivo
  tanto la interfaz como el repositorio de moderación KYC.
- `components`: estados, diálogo de aviso y paginación compartidos solo por el
  dominio administrativo.
- `core`: tipos, constantes, errores y formateadores sin acceso a datos.

Cada sección se divide en tres capas:

1. `*Repository.ts`: consultas y mutaciones remotas.
2. `use*.ts`: estado asíncrono, acciones y mensajes de error.
3. `*Tab.tsx` y componentes: presentación e interacción.

## Regla para nuevas funciones

Una función administrativa nueva debe crear su propio directorio bajo
`src/modules/admin/<feature>`. No debe añadir consultas, mutaciones ni estados a
`AdminPage`, ni reutilizar el estado interno de propiedades, reportes o métricas.
Los componentes compartidos se extraen solo cuando existe una interfaz estable
y no contienen reglas específicas de otro módulo.

## Comportamiento conservado

- Acceso restringido para roles distintos de `admin`.
- Moderación manual y reevaluación por IA de propiedades.
- Gestión de reportes.
- Filtros y paginación independientes por sección.
- Métricas de Supabase, Cloudflare y Analytics con errores aislados.
- Contexto del anunciante bajo demanda: antigüedad, publicaciones, reportes y
  señales orientativas que siempre requieren revisión humana.
- Bitácora administrativa con filtros por acción/origen, búsqueda de propiedad,
  orden estable y estados de carga, error y vacío aislados.

## Verificación

`AdminPage.architecture.test.ts` protege el límite de 200 líneas, evita acceso
directo a Supabase desde el shell y exige que las tres capacidades existentes
se mantengan en módulos independientes. `AdminPage.test.tsx` cubre el guard y
los flujos visibles principales.
El contexto del anunciante añade pruebas unitarias para sus reglas, estados de
carga/error y contrato de integración sin acceso directo a Supabase desde
`PropertyDetails`.
La bitácora añade pruebas de repositorio, hook, formateadores, tarjetas y shell;
la prueba arquitectónica impide que importe detalles internos de otros módulos.
La regresión de aislamiento comprueba además que KYC no aparece cuando Fase 2
está deshabilitada. `verify-phase2-production-bundle.mjs` inspecciona el
artefacto y hace fallar el build si reaparece `KycModerationTab` o la RPC
`review_kyc_request`.
`AdminMfaGate.test.tsx` cubre también que una sesión expirada oculte el
formulario, ejecute el callback de recuperación y mantenga el guard bloqueado
si ese cierre falla.
