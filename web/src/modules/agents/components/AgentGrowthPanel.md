# AgentGrowthPanel

## Responsabilidad

Compone dentro del dashboard existente la gestión de oportunidades (D) y el
enlace para atribuir nuevas cuentas por registro de correo. Las visitas,
contactos atribuidos y comisiones permanecen ocultos y desactivados. Este
componente coordina acciones mediante repositorios; no accede a tablas.

## Reglas de datos

- El agente verificado puede crear/recuperar explícitamente un código único y
  copiar el enlace de registro; cargar el panel no aprovisiona códigos.
- El enlace atribuye solo cuentas nuevas creadas por registro de correo. No
  registra visitas, contactos atribuidos ni comisiones.
- La RPC de aprovisionamiento solo está disponible a `authenticated`; el servidor
  comprueba rol/KYC y rechaza enlaces pausados sin reactivarlos.
- El compositor no consulta repositorios de visitas, contactos atribuidos ni
  comisiones durante esa pausa.
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
