# MyMaterialListingsPage

## Responsabilidad

Lista los anuncios propios usando la RPC `get_my_material_listings`, muestra su
estado y permite editar los que no están archivados.

## Reglas

- La pantalla distingue carga, error, vacío y lista cargada.
- Un error inicial no se presenta además como una lista vacía.
- El propietario puede reintentar la lectura; si una actualización posterior
  falla, la lista previamente cargada sigue visible junto al error.
- Los anuncios archivados no se pueden editar desde esta pantalla.
- La propiedad se determina en el servidor; el cliente no envía `owner_id`.
- La gestión se integra en `AccountLayout`, con `Mis materiales` seleccionado y
  acceso a Cuenta, Favoritos, Mis publicaciones y Mis servicios cuando están
  habilitados. Los roles agente/admin conservan también el acceso al Panel de
  Agente en esta vista.

## Verificación

`e2e/my-marketplace-listings.spec.ts` valida estados y política de edición con
una API simulada, incluido un error inicial seguido de recuperación. La
propiedad de datos y la persistencia deben verificarse aparte contra Supabase.
