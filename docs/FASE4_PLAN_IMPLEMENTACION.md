# Fase 4 — Plan de implementación local

## Estado de publicación — 2026-11-05

La decisión vigente del proyecto es llevar la Fase 4 completa a producción. El
paquete de release agrega servicios, reseñas, materiales, beneficios comerciales
manuales (sin cobros) y valoración orientativa. La base de datos productiva se
mantiene intacta hasta que el workflow de release confirme que su historial y
esquema coinciden exactamente con la línea base esperada y aplique únicamente
las ocho migraciones F4 revisadas. El catálogo `20261103180000` permanece
excluido por ser DEV-only. La build, lint y suite local pasan; falta ejecutar
CI, el preflight y la verificación posterior a la publicación.

Esta nota de estado supersede para el alcance de despliegue las frases
históricas del plan que describían F4 como DEV-only; conserva el contexto
original del plan y sus límites de cobros.

Estado: F4-SVC desplegado en DEV; implementación modular en curso
Fuente de alcance: `Propuesta_Cubitat_completa_cliente_actualizada.pdf` (junio de 2026)
Fecha de elaboración: 2026-10-13

## Objetivo

Ampliar Cubitat desde el portal inmobiliario y la red de agentes hacia un
ecosistema de servicios para vivienda: conectar hogares con profesionales y
proveedores de materiales, y preparar líneas de monetización sin introducir
cobros ni compromisos legales/financieros no definidos.

## Descomposición independiente

La Fase 4 se organiza en F4-SVC (directorio), F4-REV (reseñas), F4-MAT
(materiales), F4-BIZ (beneficios B2B), F4-VAL (valoración) y F4-SHELL
(composición). Cada uno tiene datos, rutas, repositorio, pruebas y migraciones
propios; solo comparten contratos de plataforma. Dependencias funcionales:
REV → SVC, BIZ es optativo para SVC/MAT, VAL → lector minimizado de comparables
inmobiliarios; SVC, MAT y VAL pueden funcionar independientemente. Detalle y
criterios: [`FASE4_MODULOS_INDEPENDIENTES.md`](FASE4_MODULOS_INDEPENDIENTES.md).

La primera migración exploratoria se reemplazó para F4-SVC por dos migraciones
DEV versionadas y propias del dominio. Los módulos restantes conservarán esa
separación antes de aplicar sus respectivos cambios.

## Alcance propuesto

### Incluido

1. Directorio público de profesionales del hogar con categoría, descripción,
   zona de cobertura, datos de contacto, galería, reseñas y moderación.
2. Catálogo B2B/B2C de materiales con vendedor, categoría, descripción, precio
   orientativo, ubicación/disponibilidad, fotos, contacto e intención de compra.
3. Herramientas iniciales de monetización: paquetes/beneficios configurables
   para perfiles y publicaciones destacadas, con concesión administrativa y
   fechas de vigencia, sin procesar pagos.
4. Base informativa para una valoración premium basada en comparables internos,
   presentada solo como estimación orientativa cuando haya muestra suficiente.

### Fuera de alcance de esta implementación

- Checkout, pagos, escrow, hipotecas, reservas con depósito o cierre digital.
- Verificación legal/licenciamiento de profesionales o garantías de calidad.
- Logística, envíos, inventario sincronizado y gestión de órdenes.
- Comisiones automáticas, facturación y cobro recurrente.
- Venta de reportes agregados institucionales, Cubitat Index avanzado y
  Diáspora Pro.

## Decisiones funcionales provisionales

- Los perfiles profesionales y productos pasan por revisión antes de ser
  públicos. El distintivo de vendedor verificado existente no se reutiliza como
  certificación de profesional ni de producto.
- Solo usuarios autenticados pueden enviar reseñas o consultas. Se limita a una
  reseña vigente por usuario/profesional, se prohíbe la autorreseña y se ofrece
  denuncia/moderación. Una reseña no afirma que Cubitat certificó el servicio.
- Las consultas se registran para dar trazabilidad, pero no crean una orden ni
  confirman contratación.
- Los precios son declarados por el anunciante y no garantizan disponibilidad.
- Los módulos se implementan primero en local y, con la autorización del
  usuario, se aplican/despliegan individualmente en DEV. Producción queda fuera
  de alcance.

## Hitos y criterios de aceptación

### Hito 0 — Contratos y base de plataforma

- Especificaciones OpenSpec y límites de dependencia por módulo.
- Contratos de Auth, Storage, navegación, logging y moderación sin lógica de
  dominio compartida.
- Una migración aditiva por módulo con constraints, índices, RLS y permisos mínimos.
- Catálogos controlados para categorías/estados y autoría ligada a `auth.uid()`.
- Los visitantes solo leen registros publicados y contenido de reseñas visible.
- Crear/editar/borrar propio limitado por estado; las decisiones de moderación
  exigen autorización administrativa AAL2.

### Hito 1 — F4-SVC: directorio de profesionales (independiente)

- Rutas públicas de listado y detalle con filtros por categoría/provincia.
- Perfil profesional editable por su propietario, con cobertura y galería.
- Solicitud en revisión, estados de carga/vacío/error, contacto e historial de
  moderación.
- No depende de reseñas; su revisión se presta por un adaptador de plataforma.

### Hito 2 — F4-REV: reputación (extensión opcional de SVC)

- Publicación, resumen, denuncia y moderación de reseñas desacoplados del
  directorio; SVC funciona aunque REV esté apagado.
- Solo dependencia de dominio: identificador opaco del profesional.

### Hito 3 — F4-MAT: marketplace de materiales (independiente)

- Catálogo filtrable por categoría, provincia, vendedor y disponibilidad.
- Ficha de producto, imágenes optimizadas y CTA para consulta al vendedor.
- Publicación/moderación de anuncios y estados de disponibilidad.
- Sin carrito, pago, envío ni promesa de reserva.

### Hito 4 — F4-BIZ: monetización B2B (independiente y opcional)

- Entitlements manuales y auditables para plan/visibilidad, con expiración.
- Indicadores de métricas separados de datos personales y sin controles falsos
  de pago.
- SVC y MAT consumen beneficios solo mediante un contrato de lectura.

### Hito 5 — F4-VAL: valoración orientativa (independiente)

- Estimación privada orientativa: comparables publicados, método transparente,
  tamaño de muestra, fecha y advertencia de que no es avalúo profesional.
- No mostrar una estimación si los comparables no alcanzan el mínimo definido.

### Hito 6 — F4-SHELL: integración y revisión local

- Flujos navegables desde la app, accesibles en móvil y con conexiones lentas.
- Documentación técnica, inventario de migraciones y vault actualizados.
- Lint, pruebas automáticas y build locales aprobados; ampliar pruebas por
  módulo cuando avance la implementación desacoplada.
- Despliegue por módulo solo a DEV tras validación; producción fuera de alcance.

## Orden técnico recomendado

1. Definir contratos de plataforma y el registro de módulos opcionales.
2. Separar migraciones y datos por propietario de dominio; prohibir imports o
   consultas directas entre módulos.
3. Construir SVC como primer módulo autónomo y validar en DEV.
4. Añadir REV como extensión optativa de SVC y desplegarla aparte.
5. Construir MAT como módulo autónomo y validar en DEV.
6. Entregar BIZ y VAL como módulos autónomos que integran por contratos.
7. Componer navegación, rutas y moderación en SHELL sin lógica de dominio.
8. Revisar gates, aislamiento, documentación y evidencia de cada entrega DEV.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Perfiles presentados como certificados | Lenguaje explícito; no inferir confianza legal del KYC inmobiliario |
| Reseñas falsas o represalias | Autenticación, unicidad, denuncia, moderación y trazabilidad |
| Producto/precio desactualizado | Fecha de actualización, estado de disponibilidad y consulta directa |
| Riesgo de pagos/regulación | No cobrar ni retener fondos; monetización inicial solo como configuración manual |
| Valoración engañosa | Mediana y comparables visibles; umbral mínimo; aviso de estimación, no avalúo |
| Mezcla con cambios anteriores | Worktree y rama dedicados basados en `origin/main` |
| Promoción accidental | Perfil de despliegue DEV fijado y verificado; no ejecutar flujos productivos |

## Estado

- 2026-10-13: alcance leído y plan local iniciado en la rama
  `feature/phase4-services-marketplace`.
- 2026-10-13: modelo SQL numerado (sin aplicar a ninguna base), puerta local,
  páginas de directorio/catálogo, envío inicial de perfiles/anuncios,
  consultas, reseñas y cola de revisión AAL2 implementados en la rama.
- 2026-10-13: lint, suite (146 archivos, 649 aprobadas, 1 omitida) y build productivo local con sitemap estático pasaron. Avisos de Turnstile/servicio auxiliar no afectaron pruebas. Revisión visual y migración en Supabase local siguen pendientes.
- Pendiente: completar los módulos y recorrer los criterios de aceptación en
  ambiente local. No hay verificación ni publicación en producción.
- 2026-10-13: la fase se desglosó en módulos independientes y contratos en
  `docs/FASE4_MODULOS_INDEPENDIENTES.md`. Esta es la arquitectura objetivo;
  separación de migraciones y puertas de activación individuales quedan como
  tareas de implementación.

## Estado vigente F4-SVC — 2026-10-13

La separación de migraciones y activación ya se completó para SVC. Se aplicaron
en Supabase DEV `20261013120000_phase4_home_services.sql` y
`20261013121000_phase4_services_moderation_lint.sql`. Lint, suite (146 archivos,
650 aprobadas, 1 omitida), build productivo local y `build:phase4-dev` pasaron.
Worker DEV `cubitat1-phase2-dev`, versión
`4fe64cf9-ef2a-4eef-8936-b9cf955b975d`, sirve `/servicios`; la verificación visual
mostró filtros y estado vacío esperado. Producción intacta. Falta recorrido
autenticado de alta/edición, moderación QA y revisión móvil antes del cierre.

## Estado vigente F4-REV — 2026-10-13

F4-REV tiene migración, repositorio, panel de detalle, formularios de reseña,
denuncia/retiro y pestaña administrativa propios. Se aplicó su migración a DEV;
`db lint` y matriz de permisos pasaron. Lint y 147 archivos/653 pruebas pasan;
el build productivo excluye REV y el build `phase4-dev` incluye solo SVC+REV de
Fase 4. Worker DEV `cubitat1-phase2-dev` en `58a87479-0df0-4111-ad0e-5204eb8fdc65`.
El directorio se vio en navegador; el panel de reseñas aún no se probó con una
ficha publicada. No se crearon datos QA. Falta recorrido autenticado y móvil.

Siguiente módulo: F4-MAT, con migración y activación propias en DEV.

## Estado vigente F4-MAT — 2026-10-13

F4-MAT tiene catálogo público, filtros, ficha, consultas privadas, altas,
edición propia y moderación AAL2. La migración
`20261013140000_phase4_materials_marketplace.sql` se aplicó al Supabase DEV
`bknwerqbbysveehcdmzr`; `db lint` no reportó errores. Las tablas tienen RLS,
`anon` no tiene lectura de tabla general ni ejecución de RPCs y las funciones
administrativas validan AAL2. `lint`, 148 archivos/656 pruebas y los builds
productivo y DEV pasan. Worker DEV publicado como
`57b2928f-952e-4af3-802a-4b2fda9d63d2`; GET `/materiales` responde HTTP 200.

F4-MAT Storage implementado y verificado localmente en el lote actual: migración
aditiva `20261013150000_phase4_materials_private_storage.sql`, bucket privado,
subida del propietario, políticas de lectura condicional y URLs firmadas de una
hora. PGlite confirmó rechazo de enlaces externos nuevos y lectura anónima solo
después de publicar. Lint, 150 archivos/663 pruebas (1 omitida), build
productivo y `build:phase4-dev` pasaron; el verificador DEV confirmó que
conserva SVC+REV+MAT. Aún no se aplicó la migración ni se desplegó el Worker.

El turno remoto F4 está bloqueado por el dry-run actual: además de F3 aparecen
nueve migraciones anteriores sin registrar en el historial de DEV. No se usará
`db push` ni se marcarán migraciones aplicadas sin reconciliar esa deriva y
reservar el turno exclusivo. No hay anuncios QA publicados, así que catálogo,
ficha, carga autenticada y moderación no se recorrieron con datos. Producción
permanece intacta. Después del turno F4-MAT, continuar F4-BIZ independiente.

## Estado vigente F4-BIZ — implementación local — 2026-10-13

Implementados el contrato tipado de beneficios activos, el repositorio cliente,
la migración propia `20261013160000_phase4_business_benefits.sql` y un panel
administrativo autónomo. Las tablas de concesiones y auditoría son privadas; la
concesión, revocación y cola requieren AAL2. La RPC de consumo solo devuelve
código y vigencia. No hay FK ni lectura directa de SVC/MAT, pagos ni cobros.

Validación local: lint y suite completa (153 archivos, 671 aprobadas, 1 omitida),
build productivo con exclusión de Fase 4, `build:phase4-dev` conservando
SVC+REV+MAT y sus verificadores pasaron. PGlite comprobó denegación AAL1,
proyección anon mínima, concesión y revocación auditadas. La integración visual
al `AdminPage` queda para F4-SHELL porque es un punto de composición compartido
y no se editó en este lote. Migración y UI no están aplicadas ni verificadas en
DEV; no se abrió turno. Producción intacta.
