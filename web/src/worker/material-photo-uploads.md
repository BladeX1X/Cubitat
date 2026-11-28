# Gateway de fotos de Materiales

`POST /api/material-photos/<listing_uuid>/upload` es la única ruta de carga de
fotos nuevas de Materiales en DEV y producción. Recibe un cuerpo binario `image/webp` de
hasta 5 MiB y un token de sesión. El Worker valida el token y consulta
`can_upload_material_photo` con el JWT del vendedor. La base verifica propiedad
y estado sin exponer `owner_id` por el Data API. Después, el Worker crea un
nombre UUID de servidor y guarda el objeto en `material-listings` con la
credencial privada.

La ruta tiene límite de 40 cargas por usuario cada 10 minutos y 20 objetos por
anuncio. El Worker revalida el límite por anuncio porque la credencial privada
omite RLS; si no puede consultar el contenido de la carpeta, falla sin guardar.
La comprobación de propiedad no usa `service_role` para leer `owner_id`.
Las respuestas no exponen errores internos de Supabase. El cliente guarda solo
la ruta privada devuelta por el Worker; URLs firmadas siguen limitadas a lectura.

El trigger DEV `guard_cubitat_storage_upload()` rechaza cargas directas de
`authenticated` con `Cubitat Storage uploads must use the trusted gateway.` La
prueba real de 2026-11-15 encontró precisamente ese rechazo en el upload directo
anterior. También detectó que el gateway recibía 403 al seleccionar `owner_id`
con la credencial de servidor; se corrigió para consultar el RPC anterior con
el JWT autenticado y reservar `service_role` para Storage. Por eso el navegador
no debe invocar `storage.from(...).upload()` para este bucket.
