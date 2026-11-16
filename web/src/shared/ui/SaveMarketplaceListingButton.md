# SaveMarketplaceListingButton

Botón reutilizable de corazón para guardar perfiles de Servicios y anuncios de
Materiales. Lee su estado de `useSavedMarketplaceListings`, anuncia el título y
el estado mediante etiqueta accesible y, al activarlo, detiene el evento para
no abrir la tarjeta. El proveedor decide si pide iniciar sesión y persiste el
cambio. En esta fase se muestra únicamente en el perfil `phase34-dev`, ya que
la tabla asociada existe solo en la migración de Supabase DEV.

Si la escritura falla, el corazón vuelve a su estado previo y el control muestra
un aviso accesible con una instrucción para reintentar. Una solicitud de inicio
de sesión se considera atendida por el modal y no genera un error de persistencia.
