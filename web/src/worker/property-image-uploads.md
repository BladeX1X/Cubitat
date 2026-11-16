# Subida de fotos de propiedades

`POST /api/property-images/upload` es el único camino para subir nuevas fotos de propiedades después de activar la política `worker_only_storage_uploads`.

- El Worker verifica el token Supabase y toma el ID de propietario de la respuesta de Auth; el cliente no elige la carpeta.
- Se acepta solo `image/webp`, con firma RIFF/WEBP y máximo de 5 MiB. El Worker limita la lectura del cuerpo y aplica cuota por usuario.
- El objeto se guarda en `property_images/<auth-user-id>/<uuid>.webp` mediante la credencial privada del Worker. La ruta aleatoria evita sobrescrituras.
- La respuesta solo contiene la ruta canónica. El cliente guarda la URL del endpoint privado de Storage a través del proxy de la aplicación; no usa `/object/public/`, porque el bucket es privado.
- No se envía la clave privada al navegador. Las referencias ya guardadas se conservan sin volver a subirlas.
- Las solicitudes `POST /storage/v1/object/sign/...` solo generan URL firmadas para lectura; usan el límite general de peticiones y no consumen la cuota de 40 subidas cada 10 minutos.

Las pruebas `property-image-uploads.test.ts` cubren la validación y el almacenamiento; `worker.test.ts` cubre el recorrido autenticado y el rechazo antes de escribir cuando la sesión no es válida. La prueba del cliente está en `pages/publish/uploadPropertyImage.test.ts`.

El flujo aún requiere validación autenticada en DEV: cargar una foto, guardar el anuncio y volver a abrirlo para confirmar persistencia. Una prueba local con fetch simulado no acredita ese paso remoto.
