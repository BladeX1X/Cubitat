# useSavedMarketplaceListings

El proveedor de esta función mantiene favoritos de Servicios y Materiales para
el usuario autenticado. Carga IDs desde `saved_marketplace_listings`, persiste
altas y bajas con estado optimista y revierte la interfaz si Supabase falla.
El estado visible queda asociado al UID que lo cargó; al cambiar de cuenta,
los favoritos anteriores se ocultan de inmediato. Lecturas que compiten con
una escritura se descartan y se vuelven a consultar; una escritura tardía de
otra cuenta no puede restaurar sus IDs ni revertir los de la sesión nueva.
Invitados reciben el prompt compartido de inicio de sesión. No guarda datos de
contacto. Mientras Auth resuelve la sesión, conserva el estado de carga; si no
puede leer los IDs guardados, expone un error recuperable y `retryLoad` en vez
de representar la consulta fallida como una lista vacía. `enabled` permite
mantenerla apagada en perfiles sin la migración. El release incorpora una
migración canónica para producción y una migración forward que elimina los
permisos amplios concedidos por los privilegios por defecto del esquema; la
tabla permite a `authenticated` solo lectura, alta y baja propias. Habilitar los
Worker de producción permite las escrituras autenticadas a esta tabla; la
política RLS conserva el aislamiento por UID. Los perfiles productivos se
habilitan en el mismo release coordinado con la aplicación y la verificación
de las migraciones.

## Verificación

`useSavedMarketplaceListings.test.tsx` cubre reintento de lectura y sesión,
aislamiento cuando una baja de la cuenta anterior falla después de cambiar de
cuenta, y reconciliación de una lectura antigua que termina antes de una alta.
