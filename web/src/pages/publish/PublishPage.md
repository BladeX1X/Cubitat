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

## Recuperacion ante datos locales corruptos — 2026-09-24

- `draftStorage` descarta entradas JSON corruptas de un usuario o del formato
  legado sin bloquear la apertura del formulario ni afectar borradores de otras
  cuentas. El caso queda cubierto por pruebas de regresion para ambos formatos.
- Validado con lint, 114 archivos/480 pruebas y build; desplegado primero en DEV
  y posteriormente integrado en producción mediante el commit aislado `0c9469a`.

## Diagnóstico seguro de errores de publicación — 2026-10-08

- `sanitizeErrorReason` conserva códigos estructurados de PostgREST (`PGRSTxxx`),
  SQLSTATE (`DATABASE_xxxxx`) y estados HTTP válidos para localizar fallos de
  backend sin registrar mensajes, detalles de filas, teléfonos, rutas ni tokens.
- La alerta visible conserva su mensaje genérico; el código técnico queda solo
  en la consola mediante `logSafeEvent`.
- Ante un fallo de escritura posterior a la carga de imágenes, no se borran
  objetos automáticamente por la posibilidad de una respuesta ambigua. Revisar
  la fila y el objeto sintético antes de cualquier limpieza.
- QA DEV del 2026-10-08: el envío único con el bundle actualizado registró
  `PGRST002` tanto al publicar como al cargar propiedades/notificaciones. No es
  un error de validación de los campos. Supabase documenta que PostgREST no pudo
  consultar la base de datos para construir la caché de esquema. El archivo
  `supabase_logs.json` incluyó 41 eventos `PGRST002` y 5 `PGRST003`; este último
  indica timeout al adquirir una conexión del pool. Esto apunta a contención o
  conectividad intermitente entre PostgREST y PostgreSQL, pero aún no identifica
  la consulta o carga que la causó. El proyecto DEV figuraba `ACTIVE_HEALTHY` y
  los esquemas estándar `public`/`graphql_public` existen; ninguna de esas
  señales valida por sí sola el Data API. Consultar logs de Postgres/Supavisor
  antes de otro envío. No se hizo un segundo intento ni limpieza; la subida de la
  imagen del primer envío podría seguir en Storage.
- La segunda exportación, `supabase_logs (1).json`, cubre también el minuto del
  envío fallido: 1,000 filas PostgREST de 19:07:19 a 19:25:56, con 425
  `PGRST002` y 39 `PGRST003`. Hay errores repetidos en el segundo del envío
  (19:07:22), por lo que la falla coincide con una degradación sostenida del API.
  El export no incluye logs de Postgres/Supavisor ni el error interno que impide
  construir la caché de esquema.
- La muestra del 08-Oct-2026 13:27:54–13:28:10 confirma consultas internas
  (configuración, rol y versión PostgreSQL) que también agotan el pool, con
  reconexión anunciada y `db-schemas=public,graphql_public`. No ajustar el
  formulario ni los esquemas expuestos a partir de este error; revisar el origen
  del fallo de conexiones con Postgres/Supavisor.

## Validación

En DEV y en el perfil `phase2-production`, al guardar la publicación el formulario envía solo su ID al endpoint
`/api/phase2/property-image-duplicates`. El Worker autentica al propietario,
lee las URLs almacenadas y calcula los hashes de WebP en el servidor. El cliente
nunca aporta ni decide los hashes. El procesamiento es en segundo plano para no
bloquear la confirmación de publicación.

- La petición de indexación registra de forma segura los estados HTTP distintos
  de `202`; el Worker también registra rechazos de autenticación, límite de uso
  y fallos al consultar la propiedad, únicamente con su estado HTTP.
- Los fallos transitorios al descargar/decodificar una WebP o guardar sus hashes
  se reintentan hasta tres veces con espera acotada. Si se agotan los intentos,
  no se guarda un estado de indexación vacío y el Worker deja un evento agregado
  para investigar el fallo.
- Las URLs de portada de la app usan el proxy del Worker (`/api/supabase/...`);
  el indexador permite esa ruta exacta además del host Supabase del proyecto y
  vuelve a intentar cada 15 minutos registros activos con cero imágenes procesadas.
- Solo se comparan imágenes WebP del bucket `property_images` bajo la carpeta
  del propietario. Las URLs externas, incluidas las imágenes de stock, quedan
  fuera del cálculo para evitar falsos positivos.

Pruebas de lote parcial/total y reintento, lifecycle de recuperación/autoguardado, desmontaje y supresión de resurrección del borrador. Integración del formulario prueba que no se escribe una propiedad cuando falla una foto y que el reintento conserva todas las imágenes.

Pendiente QA física de recarga/cierre en navegadores móviles y Storage real; no equivale a verificación de producción.
