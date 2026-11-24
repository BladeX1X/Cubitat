# Panel de moderación

## Responsabilidad

`AdminPage` es únicamente el punto de entrada visual de `/moderar`. Conserva el
guard defensivo por rol, el encabezado y la navegación entre secciones. No debe
consultar Supabase ni contener lógica de moderación.

El guard principal de ruta sigue en `CubitatApp`; el guard de esta página se
mantiene como segunda barrera visual. La autorización efectiva continúa
dependiendo de las políticas RLS y de las funciones administrativas del backend.

## MFA administrativo apagado

Por decisión de producto, `ADMIN_MFA_ENABLED` permanece en `false` hasta una
reactivación futura. `AdminMfaGate` deja pasar al contenido sin consultar ni
pedir factores TOTP. El rol `admin` se sigue comprobando en la ruta, Worker y
base de datos. La migración `20261123090000_disable_admin_mfa_requirement.sql`
actualiza el helper `is_admin_aal2()` para conservar el control de rol sin
exigir AAL2 cuando se aplique. Los factores existentes no se eliminan.
Reactivar requiere habilitar el gate en la aplicación y desplegar una migración
que restaure AAL2.

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
  La proyección `admin_moderation_audit_log` usa `security_invoker`; el SELECT
  autenticado no evita RLS y las tablas fuente siguen restringidas al rol admin.
- `kyc`: módulo independiente. En DEV se habilita junto con Fase 2; para
  producción se incorpora únicamente con el perfil explícito
  `npm run build:phase2-kyc`, que define `VITE_KYC_UI_ENABLED=true` sin activar
  agentes, documentos ni alertas de Fase 2.
- `property-verification`: módulo independiente. El perfil
  `npm run build:phase2-documents` habilita solo la sección **Documentos** y el
  panel del propietario; requiere `VITE_SUPABASE_URL` del proyecto productivo
  y su anon key pública. El Worker productivo permite únicamente las RPC de
  envío/revisión de evidencia y lectura del indicador, mientras RLS mantiene
  la comprobación de propietario y rol admin. El verificador de bundle exige destino
  productivo y excluye KYC, agentes, Push/correo y pHash.
- `trust-score`: indicador de confianza privado para moderadores. Cada ficha
  en DEV y `phase2-production` permite consultar el puntaje bajo demanda, sin
  necesidad de una solicitud
  documental; presenta los cuatro factores y su alcance orientativo. No altera
  el anuncio ni lo expone al catálogo público. Otros módulos consumen solo la
  interfaz pública de `src/modules/admin/trust-score`.
- `npm run build:phase2-production` combina KYC, verificación documental,
  indicador Trust Score interno, distintivo de vendedor verificado y señales
  pHash. Exige el proyecto Supabase productivo; el Worker mantiene la decisión
  humana, rol admin para moderación de hashes y no habilita el dispatcher de correo.
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
- La RPC privada `get_admin_property_contact_details` cruza el proxy del Worker solo con sesión autenticada; Supabase aplica además el control de administrador de la función.
- El panel no expone la sección administrativa de beneficios comerciales.
- Moderación manual y reevaluación por IA de propiedades.
- En DEV, advertencias privadas de coincidencia por hash perceptual, con título
  de la publicación relacionada y distancia sobre 64 bits. Son señales para el
  moderador y nunca cambian automáticamente el estado.
- Gestión de reportes.
- Filtros y paginación independientes por sección.
- Métricas de Supabase, Cloudflare y Analytics con errores aislados.
- Contexto del anunciante bajo demanda: antigüedad, publicaciones, reportes y
  señales orientativas que siempre requieren revisión humana.
- Trust Score bajo demanda por ficha, con estado de carga, error recuperable,
  factores explicables y aviso de que no constituye certificación legal.
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
está deshabilitada. `verify-phase2-production-bundle.mjs` inspecciona el build
normal y `verify-kyc-production-bundle.mjs` exige solo los chunks y RPC de KYC,
rechazando agentes, documentos y alertas. `verify-property-documents-production-bundle.mjs`
comprueba el perfil documental separado y su destino de Supabase productivo.
`AdminMfaGate.test.tsx` cubre también que una sesión expirada oculte el
formulario, ejecute el callback de recuperación y mantenga el guard bloqueado
si ese cierre falla.

La acción «Ocultar propiedad» del módulo `reports` llama a
`resolve_property_report` con los IDs del reporte y de la propiedad. La función
exige rol admin, acepta solo reportes pendientes que coincidan con esa propiedad y
pausa el anuncio en la misma transacción. Su migración DEV
`20261115130000_atomic_property_report_resolution.sql` sigue pendiente de
aplicación. `AdminPage.test.tsx` comprueba el nombre y argumentos exactos de la
RPC; no infiere que la acción funcionó por las lecturas iniciales de las tablas.

## Moderación de postulaciones Fase 3

La sección `Postulaciones` se habilita solo en un build DEV explícito con
`VITE_PHASE3_UI_ENABLED=true`. Dentro del guard administrativo, consulta una cola
paginada de solicitudes abiertas con RLS y cuenta total. Los enlaces del CV y
título se solicitan bajo demanda al Worker; no se guardan y se retiran de la
vista a los dos minutos. La pantalla actual es de consulta, sin aprobar,
rechazar ni asignar agentes. La migración debe estar instalada en DEV para que
la lista pueda cargar.
