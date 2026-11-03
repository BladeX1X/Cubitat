# AgentGrowthPanel

## Responsabilidad

Compone dentro del dashboard existente la gestión de oportunidades (D). Los
bloques de enlaces/atribución (B/C) y comisiones (E) permanecen ocultos en la
interfaz hasta que el dueño defina sus reglas. Este componente solo presenta
datos y coordina acciones; no accede a tablas.

## Reglas de datos

- El panel no expone enlaces, visitas, contactos atribuidos ni comisiones
  mientras esos módulos esperan definición de negocio.
- El compositor del dashboard no consulta repositorios de referidos ni
  comisiones durante esa pausa; no aprovisiona códigos como efecto secundario.
- Las oportunidades se cargan desde su repositorio; el compositor no contiene
  consultas Supabase.
- Los formularios requieren confirmación de que el prospecto autorizó guardar
  sus datos y recibir seguimiento.
- Los cambios de estado usan `update_agent_lead_status`; los estados
  `converted` y `lost`, y las comisiones, son decisiones administrativas.
- Los datos quedan dentro del entorno local hasta una promoción revisada.

## Interfaz

Incluye estados de carga, error con reintento, vacío, éxito y error de acción;
filtros por tipo/estado e historial de seguimiento de oportunidades; controles
móviles con etiquetas accesibles. El formulario de registro y el listado de
oportunidades comienzan colapsados en desplegables nativos para reducir el
espacio ocupado; abrirlos no dispara consultas adicionales. Los fallos de
módulos ocultos no se muestran en este panel.
Si la base rechaza una creación porque se alcanzó la cuota móvil de 20
oportunidades en 24 horas, el formulario explica el límite y cuándo se abrirá
un nuevo espacio, sin mostrar mensajes internos del backend.
