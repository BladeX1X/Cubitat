# SaveMarketplaceListingButton

Botón reutilizable de corazón para guardar perfiles de Servicios y anuncios de
Materiales. Lee su estado de `useSavedMarketplaceListings`, anuncia el título y
el estado mediante etiqueta accesible y, al activarlo, detiene el evento para
no abrir la tarjeta. El proveedor decide si pide iniciar sesión y persiste el
cambio. Se muestra en los perfiles donde estén habilitados Servicios y
Materiales; el Worker correspondiente debe permitir las escrituras
autenticadas a `saved_marketplace_listings` y Supabase aplica el aislamiento
final con RLS.

Si la escritura falla, el corazón vuelve a su estado previo y el control muestra
un aviso accesible con una instrucción para reintentar. Una solicitud de inicio
de sesión se considera atendida por el modal y no genera un error de persistencia.
