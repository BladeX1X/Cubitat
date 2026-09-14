# PublishPage

Formulario guiado de publicación y edición con ocho pasos, compresión WebP y guardado pendiente de revisión.

## Preferencias estructuradas de permuta — 2026-09-13

- En el paso comercial, `Permuta` permite omitir el valor estimado del inmueble ofrecido y exige seleccionar el tipo de inmueble buscado.
- Provincia, municipio, dormitorios mínimos, área mínima y notas son opcionales. La diferencia admite: ninguna, negociable, pagar hasta o recibir hasta; estas dos últimas exigen un monto positivo en USD.
- El formulario persiste la estructura en `features.exchangePreferences`, la restaura al editar y la conserva completa en IndexedDB mediante el borrador existente.
- La ficha pública y el detalle de moderación comparten una lectura defensiva; datos antiguos o malformados se omiten sin bloquear la vista.

## Integridad de fotos y borradores — 2026-09-12

- `uploadPublicationImages` aborta el lote ante cualquier fallo antes de escribir la propiedad. Conserva los previews originales para reintento y elimina solo rutas nuevas cuya subida terminó correctamente; nunca borra URLs de fotos existentes. Si falla la escritura posterior de la propiedad, no borra objetos por la posibilidad de una respuesta de red ambigua.
- `completeDraftStorage` conserva campos, imágenes WebP, paso y amenidades en IndexedDB. Las claves incluyen usuario y propiedad editada; una publicación nueva usa una clave distinta. Las operaciones de cada clave se serializan para que un borrado no sea deshecho por una escritura pendiente.
- `usePublicationDraft` restaura automáticamente antes de permitir edición y guarda cada cambio confirmado por React sin debounce. Las operaciones ya iniciadas continúan si se desmonta el formulario. El formulario se remonta por identidad para no mezclar estado entre usuarios o propiedades.
- Se mantiene el botón manual y una copia pequeña de campos en localStorage para el banner de Mis publicaciones; el formato antiguo se recupera cuando no existe el borrador completo.
- Un error de almacenamiento se muestra al usuario. El borrador se elimina solamente después de guardar la propiedad. Un fallo al eliminarlo no convierte una publicación ya guardada en un error de publicación.
- La dirección de escritura se conserva para el trigger de privacidad; la moderación recibe solo zona pública. La edición usa `editablePropertyAddress` para recuperar los campos privados autorizados.
- Las coordenadas exactas se envían al guardar y el trigger las separa de la cuadrícula pública. La edición autorizada recupera el punto exacto desde `property_private_coordinates`; los visitantes reciben solamente coordenadas aproximadas.

## Validación

Pruebas de lote parcial/total y reintento, lifecycle de recuperación/autoguardado, desmontaje y supresión de resurrección del borrador. Integración del formulario prueba que no se escribe una propiedad cuando falla una foto y que el reintento conserva todas las imágenes.

Pendiente QA física de recarga/cierre en navegadores móviles y Storage real; no equivale a verificación de producción.
