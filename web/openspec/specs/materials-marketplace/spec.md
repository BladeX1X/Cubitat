# Catálogo de materiales de construcción

## Propósito

Conectar compradores con comercios y vendedores de materiales para vivienda
mediante anuncios, disponibilidad declarada y consultas directas.

## Requisitos

### Catálogo

- **WHEN** un visitante explora o filtra por categoría/provincia
- **THEN** ve solamente anuncios `published` con disponibilidad activa
- **AND** cada ficha indica vendedor, descripción, precio/moneda declarados,
  zona y última actualización
- **AND** no se presenta el precio ni el inventario como garantía contractual

### Publicación

- **GIVEN** un vendedor autenticado
- **WHEN** crea o modifica un anuncio
- **THEN** el anuncio requiere revisión antes de hacerse público
- **AND** solo el propietario puede editarlo
- **AND** imágenes usan Storage privado hasta aprobarse y reglas de tamaño/tipo
  (bucket privado, WebP/JPEG/PNG, máximo 5 MiB por archivo y 10 por anuncio)
- **AND** solo se emiten URLs firmadas para objetos referenciados por anuncios
  publicados y disponibles; propietario/admin AAL2 pueden leer objetos privados

### Consulta

- **WHEN** una persona autenticada contacta al vendedor desde una ficha
- **THEN** se registra una consulta privada asociada al anuncio
- **AND** la consulta no crea una orden, reserva, pago ni garantía de inventario
- **AND** solamente el remitente, el vendedor propietario y administración pueden
  leerla según permisos

### Exclusiones

- El catálogo no incluye carrito, checkout, cobros, escrow, logística ni órdenes.
- No se publican datos de contacto personales salvo que el vendedor los exponga
  voluntariamente en su anuncio.

## Contrato de imágenes

- `material-listings` es un bucket privado. Las rutas tienen la forma
  `<owner_uuid>/<listing_uuid>/<object_uuid>.<webp|jpg|png>`.
- El propietario sube solo a un anuncio propio no archivado. La base rechaza
  referencias recién añadidas que no apunten a un objeto existente del bucket.
- Se limitan las referencias del anuncio a 10; Storage permite hasta 20 objetos
  por carpeta de anuncio para soportar reemplazos y limpieza de cargas huérfanas.
- La lectura pública de Storage requiere que el objeto esté en `photo_urls` de
  un anuncio publicado y no agotado. La app crea URLs firmadas de una hora al
  renderizar el catálogo/ficha; Storage privado nunca se configura como bucket
  público ni se almacena la URL firmada en la fila.
- Los enlaces HTTPS previos a esta migración se conservan si ya están en la fila,
  pero no se admiten como imágenes nuevas. Su migración a Storage se hará sin
  borrado automático de archivos anteriores.
