# MaterialListingSubmissionPage

## Responsabilidad

Crear o editar un anuncio propio de materiales y enviar sus cambios a revisión.
Las fotos se suben directamente al bucket privado `material-listings`; el
formulario no acepta enlaces arbitrarios para imágenes nuevas.

## Contrato de archivos

- Máximo 10 imágenes referenciadas por anuncio.
- Storage limita cada carpeta de anuncio a 20 objetos para permitir reemplazos
  y recuperar cargas huérfanas sin abrir el acceso público.
- WebP, JPEG o PNG; máximo 5 MiB por archivo. El cliente da feedback temprano;
  límites de MIME/tamaño del bucket y políticas RLS son la autoridad final.
- La ruta `owner_uuid/listing_uuid/object_uuid.ext` solo se puede subir dentro de
  un anuncio propio no archivado. La fila almacena la ruta privada, nunca la URL
  firmada temporal.
- Si la subida o actualización falla después de crear el anuncio, queda en
  revisión sin las fotos fallidas y la pantalla permite reintentar la carga.
- Las URLs HTTPS heredadas se conservan al editar y no se aceptan como nuevas.

## Accesibilidad y estados

El input anuncia formatos, límite de tamaño, cantidad existente y cantidad
seleccionada; errores y progreso de envío usan texto visible y `role="alert"`.

## Verificación

Validar selección/tamaño/tipo, alta, edición, URLs firmadas solo con filas
publicadas, lectura propia privada, y denegación para otra cuenta y `anon`.
E2E remoto solo durante turno exclusivo DEV.
