# Diseño

## Casos de uso

1. Un admin aprueba u oculta una propiedad y ve después quién actuó, qué cambió,
   el motivo y la fecha.
2. Un admin elimina una propiedad y la evidencia sobrevive sin depender de una
   clave foránea a la fila eliminada.
3. El Worker termina una revisión IA mediante un RPC reservado a `service_role`
   y el evento queda identificado como automatización.
4. Una persona no administradora no puede leer ni falsificar eventos.

## Datos

`property_moderation_audit` será append-only y almacenará solo datos mínimos:
identificador y propietario de la propiedad, título acotado, actor derivado de
la sesión, tipo/fuente de acción, estados anterior/nuevo, mensajes de moderación,
campos modificados y timestamp. No guardará la fila completa, contacto,
ubicación, tokens ni metadatos de sesión.

No tendrá claves foráneas hacia propiedades o usuarios: la evidencia debe
sobrevivir eliminaciones y cascadas. Tendrá índices por propiedad/fecha,
actor/fecha y estado nuevo/fecha.

## Escritura atómica e inmutabilidad

Un trigger `AFTER UPDATE OF status, moderation_message OR DELETE` insertará el
evento en la misma transacción. Si la auditoría falla, también falla la acción.
El actor se obtiene de `auth.uid()`, `auth.role()` y `is_admin()`; nunca del
payload del cliente.

RLS permitirá únicamente `SELECT` a administradores. No existirán políticas de
escritura. Un segundo trigger rechazará `UPDATE` y `DELETE` incluso cuando una
operación normal use `service_role`.

## Moderación IA confiable

`set_property_ai_moderation_trusted` solo será ejecutable por `service_role`,
validará estados permitidos y fijará marcadores locales de fuente/proveedor para
el trigger. El Worker usará `SUPABASE_SERVICE_ROLE_KEY`, comprobará
`response.ok` y nunca expondrá esa clave al navegador.

## Módulo administrativo

`src/modules/admin/audit-log` tendrá tipos, repositorio, hook y vista propios.
La vista manejará carga, error, vacío, filtros y paginación. `AdminPage` solo
añadirá una entrada de navegación y renderizará el módulo; no consultará datos.

En móvil, los eventos se presentan como tarjetas apiladas; en pantallas amplias
pueden ampliar su distribución sin depender de una tabla horizontal.

## Casos borde

- Estado y motivo sin cambios: no crear evento.
- Propiedad eliminada: conservar identificador, propietario y título mínimo.
- Perfil del actor eliminado: mostrar identificador o “Sistema”.
- Red lenta/error RLS: estado de error aislado con reintento.
- Trigger defectuoso: bloquear la mutación y mostrar el error; no aceptar una
  acción sin evidencia.
- Reintento IA: cada transición real genera un evento independiente.

## Rollback

En producción, una migración posterior podrá desactivar primero el trigger de
captura conservando tabla y datos. No se eliminará la bitácora sin exportación y
aprobación de retención/legal.

