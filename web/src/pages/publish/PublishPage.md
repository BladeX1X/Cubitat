# PublishPage

El paso de precio conserva cantidad y moneda de forma independiente. Al crear o
editar se puede declarar USD, CUP o MLC; las propiedades antiguas se interpretan
como USD. La interfaz y las fichas muestran la moneda declarada y nunca
convierten el importe automáticamente.

Formulario guiado de publicación y edición con ocho pasos, compresión WebP y guardado pendiente de revisión.

## Preferencias estructuradas de permuta — 2026-09-13

- En el paso comercial, `Permuta` permite omitir el valor estimado del inmueble ofrecido y exige seleccionar el tipo de inmueble buscado.
- Provincia, municipio, dormitorios mínimos, área mínima y notas son opcionales. La diferencia admite: ninguna, negociable, pagar hasta o recibir hasta; estas dos últimas exigen un monto positivo en USD.
- El formulario persiste la estructura en `features.exchangePreferences`, la restaura al editar y la conserva completa en IndexedDB mediante el borrador existente.
- La ficha pública y el detalle de moderación comparten una lectura defensiva; datos antiguos o malformados se omiten sin bloquear la vista.

## Salir sin guardar desde un borrador reanudado — 2026-11-17

- Al reanudar un borrador local y cambiar campos, «Salir sin guardar» espera los autoguardados en curso y restaura la instantánea guardada al entrar. El borrador continúa disponible para reanudarlo; no se elimina ni se escribe la propiedad remota.
- En modo edición de una propiedad existente, la acción sigue eliminando únicamente el borrador local de edición para que al volver se carguen los valores remotos originales.
- El formulario iniciado como propiedad nueva sin borrador previo sigue descartando su borrador transitorio al salir. «Borrar Borrador» conserva su significado explícito de eliminación.

## Integridad de fotos y borradores — 2026-09-12

- `uploadPublicationImages` aborta el lote ante cualquier fallo durante la carga. Conserva los previews originales para reintento y elimina solo rutas nuevas cuya subida terminó correctamente; nunca borra URLs de fotos existentes. Si la escritura posterior recibe un rechazo definitivo de permisos (`42501` o ninguna fila propia actualizada), elimina las rutas nuevas sin referencia y conserva las fotos del borrador local. Ante otros errores no elimina objetos: la respuesta de red podría ser ambigua y la escritura podría haberse confirmado.
- `completeDraftStorage` conserva campos, imágenes WebP, paso y amenidades en IndexedDB. Las claves incluyen usuario y propiedad editada; una publicación nueva usa una clave distinta. Las operaciones de cada clave se serializan para que un borrado no sea deshecho por una escritura pendiente.
- El cargador de fotos comunica cómo seleccionar imágenes sin exponer al anunciante detalles internos de conversión u optimización.
- Las imágenes nuevas, ya optimizadas, se cargan a través de `/api/property-images/upload` con el token de la sesión. El Worker valida propietario, formato WebP y máximo de 5 MiB antes de escribir en `property_images` con credencial privada; las subidas nuevas no usan Storage directamente desde el navegador. Las rutas existentes de la galería se conservan y el lote sigue siendo recuperable si alguna foto falla.
- La zona del cargador también acepta fotos arrastradas; estas pasan por los mismos límites, validación, compresión y guardado que las seleccionadas con el explorador.
- Las previsualizaciones incluyen controles accesibles para mover fotos antes o después; el orden final determina la imagen de portada y el orden guardado en el anuncio.
- La carga de previsualizaciones privadas solo actualiza el arreglo de imágenes cuando cambia un tamaño. Si la miniatura ya tenía el tamaño calculado, conservar la misma referencia de estado evita que el efecto vuelva a ejecutarse en bucle y bloquee el formulario.
- Si falla la lectura inicial del borrador local, el formulario ofrece reintentar; un error transitorio ya no deja la pantalla cargando indefinidamente.
- Si Supabase no puede verificar la sesión al enviar, el formulario informa el problema de conexión sin subir fotos ni intentar guardar la propiedad.
- La precarga opcional del nombre y teléfono también captura errores de conexión; el formulario permanece disponible para completar esos campos manualmente.
- `usePublicationDraft` restaura automáticamente antes de permitir edición y guarda cada cambio confirmado por React sin debounce. Las operaciones ya iniciadas continúan si se desmonta el formulario. El formulario se remonta por identidad para no mezclar estado entre usuarios o propiedades.
- Se mantiene el botón manual y una copia pequeña de campos en localStorage para el banner de Mis publicaciones; el formato por usuario se recupera cuando no existe el borrador completo.
- Un error de almacenamiento se muestra al usuario. El borrador se elimina solamente después de guardar la propiedad. Un fallo al eliminarlo no convierte una publicación ya guardada en un error de publicación.
- Los errores desconocidos de Storage/base de datos se registran de forma saneada y la interfaz muestra texto genérico; solo se conserva el mensaje predefinido y seguro de lote de fotos fallido.
- La dirección de escritura se conserva para el trigger de privacidad; la moderación recibe solo zona pública. La edición usa `editablePropertyAddress` para recuperar los campos privados autorizados.
- Las coordenadas exactas se envían al guardar y el trigger las separa de la cuadrícula pública. La edición autorizada recupera el punto exacto desde `property_private_coordinates`; los visitantes reciben solamente coordenadas aproximadas.
- `PublishPage.integrity.test.tsx` verifica que una edición cargada con coordenadas envía `{ latitude, longitude }` al update; el E2E `address-map.spec.ts` verifica pin, restauración del borrador local, recuperación tras fallo del estilo y uso móvil sin overflow. Esto no sustituye una escritura de extremo a extremo en Supabase DEV.
- Al crear, el payload agrega `user_id` de la sesión autenticada. Al editar, lo omite por completo: el propietario no puede reasignarse desde el formulario y los permisos por columna no reciben una escritura sobre ese campo. Los cambios de contenido siguen pasando el anuncio a `pending_review`.

## Restaurar contacto privado al editar — 2026-11-13

- `properties.contact_info` es una columna heredada que no tiene permiso de lectura para clientes. La consulta del propietario obtiene `name`, `phone` y `email` desde la relación `property_contact_details`, protegida por RLS, y los normaliza al formato del formulario.
- `editablePropertyRepository.test.ts` verifica la selección de esa relación y que los datos privados vuelvan en `contact_info` para hidratar los campos del editor. No cambia las consultas de los catálogos públicos.

## Edición limitada al propietario — 2026-11-13

- El `UPDATE` de una propiedad filtra por su ID y por el usuario autenticado. Solicita la fila actualizada y no ejecuta acciones posteriores de publicación si RLS no devuelve una fila.
- Un rechazo `42501` o una actualización sin fila muestra una explicación para revisar la cuenta propietaria, e informa que los datos y fotos locales se conservan para reintentar.
- La prueba de integridad comprueba el filtro de propietario, el tratamiento de respuesta vacía y que el endpoint de moderación no se invoque después de un rechazo. No verifica las políticas alojadas en DEV ni identifica por sí sola la causa de un `42501` observado allí.

## Reintento de vistas previas privadas — 2026-11-15

- Si una descarga temporal de una foto existente falla, el editor mantiene su referencia privada, avisa junto a la foto y ofrece «Reintentar». Si el reintento tiene éxito, muestra la miniatura y actualiza el tamaño sin cambiar la ruta que se guardará.
- Al quitar la última aparición de una foto, el editor revoca la URL temporal de vista previa y olvida la solicitud en caché. Las referencias duplicadas que sigan en la galería conservan su miniatura.
- `PublishPage.integrity.test.tsx` cubre fallo inicial, recuperación en el segundo intento, conservación de la referencia y liberación de la miniatura al quitarla.

## Limpieza de fotos sin referencia tras rechazo definitivo — 2026-11-14

## Consulta segura al reabrir una publicación — 2026-11-15

- La consulta de edición enumera columnas permitidas y relaciones privadas del propietario. No usa `*`, porque el Data API revoca la lectura de `properties.contact_info` y de otras columnas privadas.
- El nombre/teléfono/correo se hidratan solo desde `property_contact_details`, protegida por RLS; el fallback a `contact_info` fue retirado.
- La prueba de repositorio confirma la proyección exacta. El E2E real con sesión local comprueba reabrir la publicación, ver la foto guardada y recuperar los datos de contacto.

- La prueba de integridad verifica que un rechazo definitivo `42501` limpia solo las fotos nuevas sin referencia, conservando el anuncio y las fotos previas; las respuestas ambiguas no autorizan limpieza automática.

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
- Ante un rechazo definitivo de permisos posterior a la carga, se limpian solo
  los objetos nuevos que aún no tienen referencia en la fila. Ante fallos de
  red u otra respuesta ambigua, se conservan los objetos para no romper una
  escritura que quizá ya se confirmó.
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

`e2e/publish-images.spec.ts` recorre Chromium: sube dos WebP por el endpoint Worker simulado, fuerza el fallo de la segunda, confirma que no se inserta el anuncio, vuelve a la galería para verificar que las dos fotos siguen, reintenta y comprueba que ambas URLs queden en `images` y que la primera sea `cover_image`. Usa Auth/API simuladas y no acredita persistencia real en DEV.

Pendiente QA física de recarga/cierre en navegadores móviles y Storage real; no equivale a verificación de producción.

## Crear un anuncio nuevo con un borrador existente — 2026-11-14

- `/publicar` para una creación nueva comprueba si existe un borrador local y, si existe, pregunta antes de montar el formulario. Esto evita que «Nueva propiedad» restaure y sobrescriba silenciosamente los datos de otra sesión de creación.
- «Continuar borrador» recupera los campos, las fotos y el paso guardado. «Empezar una propiedad nueva» explica que sustituirá el borrador local y lo elimina solo después de esa selección. No afecta anuncios enviados al servidor.
- El acceso explícito para reanudar desde Mis publicaciones (`load_draft=true`) y la edición por ID siguen abriendo directamente el borrador correspondiente.
- Si la lectura del almacenamiento local falla, se bloquea temporalmente el formulario nuevo y se ofrece reintentar para proteger los datos.
- Pruebas de integridad cubren la elección, el inicio limpio, la reanudación y el error recuperable. Desplegado en DEV `cubitat1-phase2-dev` versión `a9b9fc82-a254-46e1-8223-80e2895e42f9`; E2E Chromium 3/3 contra el Worker, con APIs simuladas.

## Aislamiento de borradores sin UID — 2026-11-14

- La clave global heredada `cubitat_publish_draft` no identifica a su propietario. Leerla y asignarla al primer UID autenticado podía mostrar datos de una cuenta anterior en una cuenta distinta del mismo navegador.
- `readPublicationDraft` ahora borra esa clave sin devolver ni migrar su contenido, incluso si la cuenta activa ya tiene un borrador propio. Las claves asociadas a UID permanecen separadas.
- Las pruebas de `draftStorage` cubren descarte seguro y limpieza de la clave global al leer un borrador de usuario. Desplegado en DEV `cubitat1-phase2-dev` versión `3b95bf9f-72dd-4a9d-a6df-db0b0bc1080b`; lint, suite y builds PASS. E2E de publicación 4/4 contra el Worker. Auth/API interceptadas; no hubo escrituras ni cambios en Producción.

## Salir del editor sin guardar — 2026-11-12

La salida desde el encabezado pide confirmar que se descartarán los cambios del formulario. Si se confirma, espera a que terminen los guardados locales en curso, elimina el borrador de esa cuenta/anuncio y solo entonces sale. Si se cancela, el usuario sigue editando; si falla el borrado, conserva el borrador e informa el error. La acción no actualiza la propiedad publicada.

Al editar una publicación, una copia local guardada sin cambios del usuario no puede reemplazar los datos recién leídos del servidor. Los borradores antiguos sin marca de edición se combinan con los datos remotos: los campos vacíos no borran valores y las referencias de fotos se unen sin duplicados. Los borradores con cambios explícitos conservan valores vacíos y el orden/galería elegidos, incluso si se quitaron todas las fotos.

La regresión E2E monta el modo de edición de una propiedad existente, cambia temporalmente la dirección, confirma «Salir sin guardar», vuelve a abrir el mismo anuncio y verifica que la dirección original del servidor aparece de nuevo y que no hubo escrituras a `properties`. El chequeo usa sesión/API simuladas; la confirmación manual autenticada en DEV sigue pendiente.

## Asistente en móvil estrecho — 2026-11-14

`publish-images.spec.ts` recorre los ocho pasos a 320 px: dirección, datos,
especificaciones, descripción, fotos, precio y contacto. En cada paso verifica
que el documento no tenga desbordamiento horizontal. Pasó localmente y contra la
UI Worker DEV; auth y API se simulan y no se envía la publicación.

## Miniaturas privadas al reanudar edición — 2026-11-14

- La lectura de las miniaturas de Storage privado podía dejar el formulario en un bucle de renders: el efecto volvía a escribir un arreglo nuevo aunque el tamaño de la foto no hubiese cambiado. El uploader quedaba inoperable al intentar seleccionar otra foto.
- La actualización ahora conserva el mismo arreglo cuando no hay diferencias. `e2e/edit-property-photo-retry.spec.ts` reanuda la edición en el paso de imágenes, verifica que se conserva una foto privada, añade una imagen WebP y confirma que el guardado conserva ambas referencias y pasa la publicación a `pending_review`.
- La prueba simula sesión, base de datos y Worker; demuestra el flujo de interfaz/payload local, no persistencia real de Storage o Supabase DEV.

Otra regresión de edición envía dos URLs privadas existentes por el flujo de guardado, comprueba que la primera siga como portada, que ambas referencias se conserven y que el estado enviado sea `pending_review`. Usa mocks locales y no confirma una escritura real en DEV.

La edición no incluye `user_id` en el `UPDATE`, mientras que la creación sí incluye la identidad de la sesión en el `INSERT`. Regresiones locales cubren ambos payloads; no confirman por sí solas los permisos alojados de DEV.

El caso mixto también agrega una imagen nueva como `data:` y valida que la URL nueva del Storage mock se agregue después de la existente sin cambiar la portada; no simula una escritura remota real.

### Procesamiento concurrente de fotos — 2026-11-12
La compresión de lotes se serializa. Mientras una selección o arrastre está procesándose, un segundo intento se rechaza con una indicación para esperar; el límite de 20 fotos sigue validándose antes de comprimir. La prueba de integración mantiene pendiente el primer lote y comprueba que el segundo no arranque.

### Subida de fotos por Worker — 2026-11-13

La migración `worker_only_storage_uploads` rechaza subidas de imagen directas desde el navegador. El formulario ahora envía cada WebP al Worker autenticado, que limita la carga, valida su firma y crea una ruta aleatoria dentro de la carpeta del usuario. Si falla una foto, el anuncio no se escribe, el borrador se conserva y solo se limpian las rutas nuevas ya creadas. Pruebas unitarias y de integración local cubren el helper, el Worker, la autenticación de ruta, el rechazo de firmas incorrectas y el reintento. Desplegado al perfil combinado DEV `cubitat1-phase2-dev`, versión `fcef71f7-2ed1-4563-a48d-f0b9901a2988`; home y `/publicar` responden 200, y la ruta de carga sin sesión responde 401. Sigue pendiente el recorrido autenticado real de subir, guardar y reabrir.

### URLs de fotos en bucket privado — 2026-11-13

El bucket `property_images` está marcado como privado. `getPublicUrl()` producía `/object/public/...`, que Storage responde con HTTP 400 para ese bucket. Las imágenes de propiedades ahora se normalizan a `/api/supabase/storage/v1/object/property_images/...`; el Worker las entrega con la clave pública y Storage aplica la política de lectura del objeto. El editor también normaliza referencias antiguas al cargarlas, para que las galerías guardadas vuelvan a mostrarse y sigan siendo editables. En DEV, una URL pública almacenada devolvió 400 y el mismo objeto por el endpoint privado del Worker devolvió 206 con `image/webp`.

La conversión se cubre con pruebas de referencia de portada, galería y lote de carga; URLs externas y firmadas quedan intactas. Desplegado el 2026-11-13 al perfil combinado DEV `cubitat1-phase2-dev`, versión `ca89d47b-2d02-490c-a7ea-c9253e285b30`. Smoke posterior: `/` y bundle principal HTTP 200; un objeto publicado devuelve 206 `image/webp` por el endpoint privado del Worker y la referencia antigua `/object/public/` devuelve 400, como corresponde al bucket privado. `publish-images.spec.ts` y `publish.spec.ts`: 3/3 PASS con servicios remotos simulados. Sigue pendiente publicar una foto nueva autenticado y reabrir el anuncio real.

## Vista previa de fotos existentes en edición — 2026-11-12

- El editor resuelve referencias históricas del bucket privado `property_images` tanto como URL directa de Supabase como ruta del proxy `/api/supabase`. Solo admite rutas de imagen del propietario autenticado y descarga desde el Storage configurado por la aplicación.
- Muestra una URL `blob:` temporal, pero conserva la referencia canónica original al guardar. Si la descarga falla, mantiene la referencia y muestra un fallback sin borrarla.
- El guardado conserva una referencia del proxy solo cuando la ruta canónica coincide con el bucket `property_images` y el propietario autenticado; no intenta convertirla en una foto nueva. Rechaza referencias de otro propietario.
- DEV autenticado: reabrí una propiedad existente; la imagen antes vacía ahora aparece y su tamaño se muestra como 9.7 KB. No guardé el anuncio ni alteré sus datos.
- Desplegado solo a `cubitat1-phase2-dev`, versión `6dce5d5f-4c21-4ae6-9aa7-b928c2db967a`. `/`, `/publicar` y los bundles del editor/preview respondieron HTTP 200. Gates del perfil DEV: lint, 956 pruebas PASS/1 omitida, build y verificadores PASS.
- Pendiente: verificar carga de una foto nueva, guardado exitoso y reapertura posterior. Producción, moderación y Supabase no se modificaron.

### Salida del editor — prueba E2E local — 2026-11-13

`web/e2e/publish.spec.ts` también cubre el flujo del navegador: al cambiar temporalmente la dirección y confirmar «Salir sin guardar», la app vuelve a Mis publicaciones y no emite ninguna escritura REST a `properties`. La prueba usa una sesión y respuestas simuladas; no sustituye la verificación manual autenticada en DEV.

## Mensaje neutro al procesar fotos — 2026-11-13

Mientras una selección de fotos se procesa, el formulario muestra el estado accesible «Preparando las fotos…». No revela detalles internos de compresión ni formatos. La prueba de integración mantiene el proceso pendiente y confirma el texto; el E2E local selecciona dos imágenes y valida miniaturas con tamaño mayor que cero.

- Validación local: lint PASS; suite 212 archivos, 959 pruebas PASS y 1 omitida; build y verificadores PASS; `publish-images.spec.ts` 1/1 PASS.
- La prueba E2E simula los servicios remotos. En DEV sí se verificaron 11/11 portadas existentes en Mis publicaciones, pero falta subir una foto, guardar el anuncio y reabrirlo para confirmar persistencia.
- Cambio aún no desplegado. Producción, datos Supabase y moderación intactos.

### Retest «Salir sin guardar» reforzado — 2026-11-14

Playwright local cubre cancelar y aceptar: cancelar conserva el editor y el cambio local temporal; aceptar elimina el borrador local, vuelve a Mis publicaciones y al reabrir restaura la dirección original del servidor. En ambos caminos se verificó cero escrituras REST a `properties`. La prueba usa APIs simuladas y no reemplaza QA autenticado en DEV.

### Botón de salida del editor en DEV — comprobación de bundle — 2026-11-15

El chunk remoto `PublishPage-DJksUfQ3.js` incluye «Salir sin guardar» y la confirmación para descartar los cambios del formulario. El bundle servido coincide por nombre con el generado localmente. Esto verifica que la interfaz actual se publicó; no demuestra el clic con sesión propietaria ni reemplaza la prueba real, que queda pendiente por inaccesibilidad de la pestaña Chrome compartida.
