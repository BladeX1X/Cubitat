# MaterialListingSubmissionPage

## Responsabilidad

Crear o editar un anuncio propio de materiales y enviar sus cambios a revisión.
Las fotos se cargan por el gateway autenticado de DEV, que escribe en el bucket
privado `material-listings`; el formulario no acepta enlaces arbitrarios para
imágenes nuevas. Las cargas directas desde el navegador están bloqueadas por la
protección de Storage y no se usan.

El formulario comparte el marco visual de publicación con Inmuebles y
Servicios. El paso de ubicación exige provincia y municipio de Cuba y centra
`AddressMap` en el área seleccionada; el botón «Usar mi ubicación» solicita al
navegador permiso explícito y centra el mapa en las coordenadas recibidas. El
punto se puede ajustar con un clic o arrastrando el marcador. Al editar se recupera
desde la RPC del propietario y al guardar se envía junto con los campos del
material. La tabla pública conserva solo la referencia aproximada; la ubicación
exacta queda en `material_private_coordinates`. Si se quita el punto, el
guardado elimina ambas versiones.

## Contrato de archivos

- Máximo 10 imágenes referenciadas por anuncio.
- El gateway limita cada carpeta de anuncio a 20 objetos para permitir
  reemplazos y recuperar cargas huérfanas sin abrir el acceso público.
- WebP, JPEG o PNG de entrada; máximo 5 MiB por archivo. El cliente convierte
  primero a WebP; el Worker vuelve a validar sesión, propietario del anuncio,
  estado, firma WebP y tamaño antes de escribir con la credencial privada. El
  límite del bucket y la protección de base siguen siendo la autoridad final.
- Al seleccionar un lote, convierte las imágenes con el compresor compartido de
  Servicios a WebP (máximo 800×800, calidad 0.70) antes de mostrar miniaturas o
  subirlas. Mantiene el orden elegido y agrega el lote completo o ninguno.
- Mientras prepara las fotos, muestra el estado «Preparando tus fotos…» y bloquea
  el envío. Un fallo de preparación conserva las fotos previamente seleccionadas.
- La ruta `owner_uuid/listing_uuid/object_uuid.webp` solo se puede subir dentro
  de un anuncio propio no archivado. El navegador envía los bytes WebP al
  endpoint `/api/material-photos/<listing_uuid>/upload`; el Worker resuelve al
  usuario por el token de sesión, comprueba propiedad/estado, aplica límite de
  40 cargas por usuario en 10 minutos y 20 objetos por anuncio; escribe el
  objeto con `service_role`.
  La fila almacena la ruta privada, nunca la URL firmada temporal.
- Una carga parcial limpia solo los objetos de ese lote y permite reintentar.
  Si la actualización recibe un rechazo definitivo `42501`, se limpian las
  fotos nuevas sin referencia y se conservan los archivos seleccionados.
- Si la respuesta de actualización es ambigua, las rutas nuevas se conservan
  en el formulario para que el reintento las vuelva a referenciar sin subirlas
  otra vez. Se pide revisar Mis anuncios antes de reintentar, ya que el servidor
  pudo haber confirmado el cambio. La limpieza de fotos antiguas es de mejor
  esfuerzo y no convierte un guardado exitoso en fallo.
- Después de crear el anuncio, su ID se conserva como ruta de edición en la URL.
  Si la página se recarga tras un fallo de Storage, recupera los campos del mismo
  anuncio y evita crear un duplicado; por seguridad del navegador hay que volver
  a seleccionar los archivos después de recargar.
- Al editar, las fotos ya guardadas se muestran con URL temporal solicitada solo
  para rutas que pertenecen al usuario y al anuncio cargado. Si no se pueden
  firmar, el formulario informa cuántas vistas previas faltan sin borrar las
  referencias guardadas.
- El reintento de fotos conserva el mismo anuncio pendiente y vuelve a usar el
  gateway autenticado. El Worker valida la propiedad con la credencial privada,
  porque el cliente no puede consultar directamente `owner_id`; el trigger de
  Storage rechaza cargas directas de usuarios como defensa adicional.
- La creación usa un slug idempotente estable durante la vida del formulario.
  Si el INSERT se confirma en el servidor pero se pierde su respuesta, el
  reintento detecta la colisión y recupera el anuncio solo si el RPC propietario
  devuelve ese slug con estado `pending_review`; no concede permiso de INSERT
  para el ID ni puede adoptar una fila de otra cuenta.
- Las URLs HTTPS heredadas se conservan al editar y no se aceptan como nuevas.

## Accesibilidad y estados

El input anuncia formatos, límite de tamaño, cantidad existente y cantidad
seleccionada; errores y progreso de envío usan texto visible y `role="alert"`.

## Verificación

Validar selección múltiple/tamaño/tipo, conversión y miniaturas WebP, bloqueo del
envío durante la preparación, orden, alta, edición, URLs firmadas solo con filas
publicadas, lectura propia privada, y denegación para otra cuenta y `anon`. El
formulario reutiliza `MultiPhotoUploadField` con Servicios. E2E remoto solo
durante turno exclusivo DEV.

### Recorrido E2E de varias fotos

`web/e2e/material-publish-images.spec.ts` recorre el formulario en Chromium con
una sesión y el gateway/PostgREST simulados. Comprueba que dos imágenes se envían
como bytes WebP al gateway y se guardan en rutas del propietario/anuncio, que un fallo parcial limpia
la primera carga sin guardar referencias, que ambas miniaturas se conservan y
que el reintento actualiza el mismo anuncio con las dos rutas en orden. Este
recorrido valida el cliente y el contrato de llamadas, no la persistencia real
en Supabase DEV.

`materialRepository.create.test.ts` y el caso de reintento de creación en la
prueba del formulario cubren una respuesta de INSERT perdida, la reutilización
del slug tras editar campos y el rechazo de colisiones que el RPC no devuelve
como borradores propios.

`e2e/material-publish-images.spec.ts` también simula una creación confirmada
cuya respuesta se pierde: el anunciante cambia el título, reintenta, el cliente
recupera por RPC el anuncio propio pendiente y actualiza su mismo ID con el nuevo
título. No crea datos reales ni llama a Supabase remoto.

## Publicación guiada — 2026-11-24

La creación y edición recorren cinco pasos: producto/categoría, provincia y
punto aproximado opcional, precio/moneda/disponibilidad/descripción, galería y
contacto. `PublicationStepLayout` es compartido con Servicios e Inmuebles; los
campos, validación de precio, carga de fotos, guardado/reintento y edición siguen
siendo propios del anuncio de materiales. Se conservan las coordenadas privadas.

## Borradores y moneda

Los anuncios nuevos ofrecen «Guardar borrador» y «Salir sin guardar». Se pueden
guardar varios en IndexedDB, aislados por cuenta y tipo `material`, con los
campos, el paso y las fotos seleccionadas; Mis materiales permite reanudarlos o
eliminarlos. Salir sin guardar conserva intacto el último borrador manual.
Materiales admite USD y CUP en el selector y persiste el código en el campo
`currency`; se muestran con las etiquetas «Dólares (USD)» y «Pesos cubanos
(CUP)». Se mantienen códigos históricos adicionales que ya acepta la base.
