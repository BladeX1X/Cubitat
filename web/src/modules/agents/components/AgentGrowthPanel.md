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
- Esta vista no consulta ni presenta oportunidades, publicaciones, visitas,
  contactos atribuidos ni comisiones.
- Muestra carga, error de lectura con reintento, enlace listo y resultado de
  copia con controles táctiles accesibles.

## Métricas futuras

Los conteos de registros atribuidos y usuarios con un plan pagado requieren
fuentes confiables del servidor y confirmación de pagos. No deben inferirse de
visitas ni mostrarse como cero hasta que esos datos estén disponibles.
