# AgentGrowthPanel

## Responsabilidad

Es la sección central del panel privado para captar nuevos usuarios mediante
el enlace personal de registro. Coordina la lectura, creación y copia del enlace
con el repositorio de referidos; no accede directamente a tablas.

## Reglas de datos

- Al cargar el panel, recupera el código activo propio y reconstruye el enlace
  compartible sin aprovisionarlo ni reactivarlo.
- Crear un enlace sigue requiriendo la acción explícita del agente; la carga del
  panel es de solo lectura.
- El enlace atribuye cuentas nuevas creadas mediante registro por correo.
- La RPC valida rol y KYC en el servidor y rechaza enlaces pausados sin
  reactivarlos.
- La sección «Usuarios captados» obtiene un agregado mediante
  `get_own_agent_acquisition_metrics()`. La RPC exige agente/admin verificado y
  devuelve solo la cantidad atribuida al agente autenticado, sin datos de cuenta.
- Las altas se cuentan desde que el ledger de atribución está activo. Si no se
  pueden leer, se muestra un error con reintento y no se inventa un cero.
- El conteo de usuarios con plan pagado queda como «Aún no disponible» hasta que
  existan suscripciones y pagos confirmados; nunca se deriva de clics.
- Esta vista no consulta ni presenta oportunidades, publicaciones, visitas,
  contactos atribuidos ni comisiones.
- Muestra carga, error de lectura con reintento, enlace listo y resultado de
  copia con controles táctiles accesibles.
