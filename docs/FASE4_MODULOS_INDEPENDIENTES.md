# Fase 4 — módulos independientes

Estado de release al 2026-11-05: los cinco módulos de negocio se prepararon
para publicación productiva junto con el shell. La aplicación de migraciones y
el Worker siguen condicionados a los workflows protegidos y a los checks de
producción. No se realizan cobros ni se crean datos comerciales reales desde
esta integración.

## Regla de descomposición

Cada módulo tiene su propio alcance, interfaz pública, almacenamiento, permisos,
pruebas y criterio de salida. Solo depende de contratos compartidos de la
plataforma (sesión Supabase/Auth, navegación, diseño, logging y moderación AAL2).
No importa repositorios, tipos internos ni tablas de otro módulo.

Los módulos de negocio se activan por separado. La composición de rutas, menú y
moderación pertenece al shell de Fase 4 y no contiene reglas de negocio. Un
módulo desactivado no debe aportar rutas, enlaces ni chunks al bundle.

## Mapa de módulos

| ID | Módulo | Datos bajo su propiedad | Interfaz pública | Dependencias funcionales |
| --- | --- | --- | --- | --- |
| F4-SVC | Directorio de servicios | Profesionales, zonas, galería, consultas del servicio | Listado, detalle, alta/gestión y consulta | Auth para alta/contacto; plataforma |
| F4-REV | Reputación de servicios | Reseñas, denuncias y decisiones de reseñas | Resumen y reseñas públicas; envío/denuncia autenticados | F4-SVC solo por `provider_id`; Auth y moderación |
| F4-MAT | Marketplace de materiales | Anuncios, fotos, disponibilidad y consultas de materiales | Catálogo, detalle, alta/gestión y consulta | Auth para alta/contacto; plataforma |
| F4-BIZ | Beneficios B2B | Concesiones, vigencias y revocaciones | Capacidades activas consultables por cada módulo anfitrión | Auth admin AAL2; anfitriones optativos F4-SVC/F4-MAT |
| F4-VAL | Valoración orientativa | Parámetros/versionado y ejecuciones de estimación | Solicitud y resultado privado con muestra y método | Lector de comparables inmobiliarios mediante contrato; no depende de SVC/MAT |
| F4-SHELL | Composición de fase | Ningún dato de dominio | Registro de módulos, navegación y puntos de extensión | Contratos de plataforma; integra módulos habilitados sin lógica de dominio |

Auth, Storage, logging, navegación, AAL2 y primitives UI son capacidades de
plataforma, no módulos comerciales de Fase 4. La valoración usa propiedades
residenciales publicadas como fuente de comparables, pero no escribe en el
módulo inmobiliario ni depende de profesionales o materiales.

## Contratos entre módulos

- Cada módulo exporta `routes`, `navigationItems`, `adminPanels` (si aplica),
  `featureKey` y un repositorio público tipado. El shell los registra de forma
  condicional.
- F4-BIZ publica `getActiveBenefits(targetType, targetId, at)` y un panel de
  concesión. Los módulos anfitriones solo consumen códigos de beneficio y no
  consultan ni modifican sus tablas.
- F4-REV acepta únicamente un `providerId` opaco y entrega resúmenes/reseñas
  públicas. F4-SVC no consulta sus tablas directamente.
- F4-VAL consume una interfaz `ComparableSource` que devuelve registros
  minimizados (zona agregada, tipo, operación, área, precio/moneda y fecha),
  nunca propietario, contacto ni dirección precisa. No hay dependencia inversa.
- Moderación es una capacidad de plataforma: cada módulo registra sus tipos,
  acciones permitidas y política de auditoría; la consola solo orquesta esos
  adaptadores.
- Consultas, reseñas, imágenes y beneficios pertenecen al módulo que los crea.
  No compartir tablas genéricas para evitar dependencias de ciclo de vida.

## Despliegue independiente

F4-SVC ya está en `dev-migrations/20261013120000_phase4_home_services.sql` y su
arreglo de lint `dev-migrations/20261013121000_phase4_services_moderation_lint.sql`.
F4-REV, F4-MAT, F4-BIZ y F4-VAL requieren conjuntos propios (`f4_rev`, `f4_mat`,
`f4_biz`, `f4_val`). Cada conjunto declara
prerrequisitos, permisos de reversión y objetos que elimina; ninguna migración
de módulo debe modificar tablas de otro. El shell no requiere migración propia.

Orden permitido: SVC puede vivir solo; REV requiere SVC; MAT puede vivir solo;
BIZ puede vivir solo en su modo de concesión a cuenta y habilita anfitriones
opcionales; VAL requiere solo el adaptador de comparables inmobiliarios. Al
desinstalar un módulo, preservar concesiones/auditoría y datos comerciales según
política de retención, o exigir una operación explícita de archivado; nunca
borrar datos en cascada de otro módulo.

F4-SVC se aplicó solo a Supabase DEV tras revisar su SQL/RLS. Para los módulos
restantes, revisar dependencias, rollback y pruebas antes de cada aplicación.

## Secuencia de entrega por módulo

1. F4-SVC individual: contratos, migración propia, repositorio, UI, moderación,
   pruebas y documentación; validar en DEV antes del siguiente módulo.
2. F4-REV como extensión opcional de F4-SVC; activar solo después de las
   pruebas antiabuso y moderación de reseñas.
3. F4-MAT independiente, con aplicación DEV propia.
4. F4-BIZ independiente; integrar la lectura de beneficios en SVC/MAT mediante
   el contrato, sin acoplar escrituras ni navegación.
5. F4-VAL como producto independiente que puede entregarse sin los otros cuatro
   módulos de negocio.
6. F4-SHELL integra módulos ya aceptados. La integración no bloquea sus builds,
   pruebas ni releases individuales.

## Criterios de independencia verificables

- Build y pruebas de cada módulo pasan con los demás módulos desactivados.
- Al desactivar un módulo desaparecen sus rutas y chunks, y no se rompe el
  arranque ni el menú de los restantes.
- No hay imports de `src/modules/<otro>` ni consultas directas a tablas ajenas;
  las excepciones se reemplazan por contratos documentados.
- Las migraciones se pueden validar en una base limpia con solo sus
  prerrequisitos y sus políticas no abren datos de módulos vecinos.
- La eliminación o fallo de un módulo no bloquea consultas ni navegación de
  otro; el shell muestra degradación local y segura.
- Cada entrega actualiza su spec OpenSpec, documentación del componente,
  handoff, inventario de migraciones y checklist con evidencia local.

## Estado actual

F4-SVC, F4-REV y F4-MAT tienen migraciones base separadas aplicadas en DEV y
están incluidos en el perfil DEV; BIZ/VAL permanecen apagados. El bundle
productivo los excluye. La extensión F4-MAT Storage y F4-BIZ están
implementadas y verificadas localmente; sus migraciones no se aplicaron ni se
desplegaron y requieren turno exclusivo. El Worker DEV conserva la versión
anterior sin Storage/BIZ. Los gates completos de F4-BIZ pasan localmente. Las
nueve migraciones anteriores del historial y la migración F3 siguen pendientes
de reconciliación antes de escrituras F3; no se deben marcar aplicadas sin
probar equivalencia de esquema. F4-BIZ tiene
componente administrativo autónomo; su registro visual corresponde al shell
F4-SHELL. Los recorridos autenticados y móviles de SVC/REV/MAT siguen pendientes
en DEV.
