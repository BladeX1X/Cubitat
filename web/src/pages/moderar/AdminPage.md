# Panel de moderación

## Responsabilidad

`AdminPage` es únicamente el punto de entrada visual de `/moderar`. Conserva el
guard defensivo por rol, el encabezado y la navegación entre secciones. No debe
consultar Supabase ni contener lógica de moderación.

El guard principal de ruta sigue en `CubitatApp`; el guard de esta página se
mantiene como segunda barrera visual. La autorización efectiva continúa
dependiendo de las políticas RLS y de las funciones administrativas del backend.

## Módulos

Cada capacidad vive bajo `src/modules/admin`:

- `properties`: listado, filtros, paginación y moderación de publicaciones.
- `reports`: listado, filtros, paginación y resolución de reportes.
- `metrics`: métricas locales de Supabase y métricas externas disponibles.
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

## Verificación

`AdminPage.architecture.test.ts` protege el límite de 200 líneas, evita acceso
directo a Supabase desde el shell y exige que las tres capacidades existentes
se mantengan en módulos independientes. `AdminPage.test.tsx` cubre el guard y
los flujos visibles principales.
