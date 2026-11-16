# MultiPhotoUploadField

Campo compartido para seleccionar varias fotos ya optimizadas y fotos guardadas
en el formulario de publicación de Materiales y Servicios.

- Recibe archivos nuevos (`files`) y fotos existentes con su referencia y URL
  de vista previa (`existingPhotos`). No valida ni sube archivos: cada pantalla
  mantiene sus reglas y su lógica de Storage.
- Presenta miniaturas, orden de selección, la primera foto como portada y una
  acción accesible para quitar cada archivo o referencia existente.
- Informa el límite de cantidad y tamaño; durante la carga muestra «Preparando tus fotos…» sin exponer formatos ni procesamiento interno.
- Crea y revoca URLs locales de vista previa al cambiar la selección.
