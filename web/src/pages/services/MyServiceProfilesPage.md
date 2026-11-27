# MyServiceProfilesPage

## Responsabilidad

Lista los perfiles propios y sus estados usando exclusivamente la RPC
`get_my_home_service_providers`. Permite crear y editar perfiles pendientes,
rechazados o pausados; los publicados son de solo lectura hasta definir el flujo
de edición que los devuelva a moderación.

## Reglas

- El servidor determina propiedad y estado editable; el cliente no manda `owner_id`.
- Rechazados y pausados vuelven a revisión al guardarse; el mensaje de éxito lo
  presenta como envío a revisión.
- La vista requiere sesión y nunca lista perfiles de otras cuentas.
- La pantalla maneja carga, error, vacío y reintento.
- La gestión se integra en `AccountLayout`, con `Mis servicios` seleccionado y
  acceso a Cuenta, Favoritos, Mis publicaciones y Mis materiales cuando están
  habilitados. Los roles agente/admin conservan también el acceso al Panel de
  Agente en esta vista.
- Reutiliza `AccountListingsFrame` para coincidir con Mis publicaciones:
  encabezado destacado, contador, creación, filtros de estado y cuadrícula de
  tarjetas responsive. Las tarjetas muestran categoría, ubicación, descripción
  e imagen cuando está disponible.
- Los perfiles publicados permanecen de solo lectura; los demás estados
  editables mantienen la acción Editar.

## Verificación

Las pruebas de página verifican la interfaz compartida, conteo y filtro de
publicados. Probar con dos cuentas distintas que cada una solo ve sus perfiles,
además de estados pendientes/rechazados/pausados y rechazo seguro de un ID ajeno.
