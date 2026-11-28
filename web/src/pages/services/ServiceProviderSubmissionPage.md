# ServiceProviderSubmissionPage

## Responsabilidad

Crear o editar un perfil profesional y enviarlo a revisión con una galería de
fotos de trabajos. Los datos de contacto son voluntarios y el perfil no se
presenta como licencia o certificación.

El formulario comparte el marco visual de publicación con Inmuebles y
Materiales. En el paso de zona se seleccionan provincia y municipio de Cuba
para centrar `AddressMap`; «Usar mi ubicación» solicita permiso del navegador y
centra el mapa en el punto recibido. Ese municipio se incluye en la cobertura;
las zonas adicionales pueden escribirse separadas por comas. El punto se puede
ajustar en el mapa y al editar se recupera
desde la RPC del propietario y al guardar se envía junto con los campos del
perfil. La tabla pública conserva solo la referencia aproximada; la ubicación
exacta queda en `home_service_private_coordinates`. Si se quita el punto, el
guardado elimina ambas versiones.

## Flujo de fotografías

- Acepta seleccionar varias imágenes por tanda, hasta 10 referencias por
  perfil; cada archivo original debe ser JPEG, PNG o WebP y pesar hasta 5 MiB.
- Las imágenes se convierten al seleccionarlas a WebP de hasta 800×800 px,
  con límite de 40 megapíxeles y calidad 0.70; el formulario muestra sus
  miniaturas, orden y portada, y permite quitar elementos individuales.
- Las fotos nuevas se suben en orden al bucket privado `home-service-photos`.
  Después se guardan sus rutas, no las URLs firmadas, en la galería del perfil.
- Al editar perfiles antiguos, se conservan las rutas privadas de tres segmentos
  en `home-service-profiles`; el catálogo firma esas referencias desde el bucket
  heredado. Las nuevas cargas continúan usando el bucket y formato actuales.
- El propietario autenticado conserva lectura privada de sus fotos heredadas; el
  catálogo solo puede leer las que siga referenciando un perfil publicado. El
  bucket heredado no admite nuevas cargas.
- En una edición se conservan los enlaces HTTPS heredados y fotos privadas no
  quitadas. Las fotos quitadas solo se eliminan de Storage después de guardar;
  la política de Storage impide borrar las que aún estén referenciadas.
- Una carga parcial limpia únicamente sus objetos nuevos. Después de un rechazo
  definitivo de permisos (`42501`), limpia solo las fotos nuevas sin referencia
  y conserva la selección preparada para reintentar. Ante una respuesta de red
  ambigua, conserva los objetos. Si se reintenta en el mismo formulario, reutiliza
  sus rutas y el mismo ID del perfil; si el primer INSERT ya se confirmó en la
  base de datos, el conflicto de ID se resuelve actualizando ese borrador propio.
  La migración DEV concede `INSERT` sobre `id` como permiso de columna para el
  UUID estable; no concede `INSERT` sobre toda la tabla y RLS sigue validando
  dueño y estado pendiente.
  Así no vuelve a subir las fotos ni crea otro perfil. Aún se recomienda revisar
  Mis perfiles si se abandonó el formulario antes de reintentar.
- La limpieza de fotos antiguas se ejecuta después del guardado y es de mejor
  esfuerzo; un fallo de red al limpiar no transforma un perfil ya guardado en
  un error de publicación.
- El catálogo firma temporalmente fotos referenciadas por perfiles publicados;
  el propietario puede ver las suyas privadas mientras edita.

El envío se desactiva mientras las fotos se preparan y rechaza un submit
prematuro para no crear/actualizar el perfil antes de completar la galería.
El formulario se remonta al cambiar de usuario, descartando datos de contacto,
galería y campos de la sesión anterior.

## Borradores locales

Los perfiles nuevos ofrecen «Guardar borrador» y «Salir sin guardar». Cada
borrador se guarda en IndexedDB bajo el usuario y tipo `service`, conserva los
campos, paso actual y fotos seleccionadas, y se puede reanudar o eliminar desde
Mis perfiles. Se admiten varios borradores por cuenta. Salir sin guardar no
modifica ni elimina la última versión guardada; la edición de perfiles remotos
mantiene su flujo de guardado y no usa estos borradores locales.

## Verificación

Probar selección múltiple, orden/portada, límite de 10, conversión y miniaturas,
fallo parcial y reintento, edición sin pérdida de referencias y lectura privada
solo por propietario/admin AAL2 o desde una fila publicada. El E2E
`service-publish-images.spec.ts` simula un INSERT confirmado cuya respuesta se
pierde y verifica que el reintento reutilice ID y fotos; no valida escritura real
en Supabase.

## Publicación guiada — 2026-11-24

La creación y edición recorren cuatro pasos: datos del profesional/servicio,
provincia y zonas de cobertura con punto aproximado opcional, galería y contacto.
El marco compartido `PublicationStepLayout` muestra el avance y valida los
obligatorios del paso activo antes de avanzar. El envío, carga de fotos,
actualización y reintentos permanecen en este formulario; las coordenadas siguen
siendo privadas y el directorio no las expone como dirección exacta.

La creación admite varios borradores locales por usuario y la acción de salida
descarta solo los cambios posteriores al último guardado manual. El ciclo se
cubre en `service-publish-images.spec.ts`. El perfil de servicio no tiene un
campo de precio ni moneda en el modelo actual.

Después de enviar o editar, el botón de éxito «Volver a mis perfiles» usa un
destino separado del botón de salida del formulario: siempre abre Mis servicios,
incluso cuando la entrada vino de «Publicar gratis».
