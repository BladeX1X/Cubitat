# Proceso de Publicacion

## Purpose
Define el flujo completo para crear, editar, guardar y publicar anuncios de propiedades.

## Requirements

### Requirement: Acceso autenticado a publicacion
El sistema MUST requerir una sesion valida para iniciar, continuar o editar una publicacion.

#### Scenario: Usuario no autenticado intenta publicar
- GIVEN un usuario sin sesion
- WHEN intenta abrir `/publicar`
- THEN el sistema MUST abrir el modal de inicio de sesion
- AND el sistema MUST conservar la ruta solicitada
- AND despues de iniciar sesion MUST regresar a `/publicar`

#### Scenario: Usuario no verificado intenta publicar
- GIVEN un usuario autenticado sin email confirmado o perfil incompleto cuando la politica lo requiera
- WHEN intenta publicar
- THEN el sistema MUST impedir el envio final
- AND MUST explicar que dato o verificacion falta
- AND MUST permitir completar perfil o reintentar verificacion

#### Scenario: Usuario autenticado abre publicar
- GIVEN un usuario autenticado
- WHEN abre `/publicar`
- THEN el sistema MUST mostrar el formulario de publicacion en el primer paso disponible
- AND el sistema MUST mostrar progreso del flujo
- AND el sistema MUST permitir salir sin perder un borrador guardado

#### Scenario: Recorrer el asistente desde un teléfono estrecho
- GIVEN un usuario autenticado abre `/publicar` con un viewport de 320 píxeles
- WHEN recorre los ocho pasos, incluidos mapa, selección de imagen, precio y contacto
- THEN el documento MUST permanecer dentro del ancho visible, sin desplazamiento horizontal
- AND cada paso MUST conservar sus controles visibles y operables

#### Scenario: Fallo al verificar sesión durante el envío
- GIVEN el usuario confirma la publicación
- WHEN la consulta de sesión falla o devuelve un error de autenticación
- THEN el formulario MUST explicar que no pudo confirmar la sesión y permitir reintentar
- AND MUST NOT subir imágenes ni escribir la propiedad

#### Scenario: Fallo de almacenamiento al enviar
- GIVEN la sesión está verificada y falla la subida de imágenes o la escritura de la propiedad
- WHEN el formulario informa del fallo
- THEN MUST conservar el borrador y explicar cómo reintentar
- AND MUST NOT mostrar mensajes, códigos o detalles internos del backend

#### Scenario: Rechazo definitivo de permisos después de subir fotos
- GIVEN el Worker completó la carga de fotos nuevas y la escritura de la propiedad recibe SQLSTATE `42501` o confirma que no actualizó una fila del propietario
- WHEN el formulario informa del rechazo
- THEN MUST eliminar solo las fotos nuevas de este intento que aún no tienen una referencia guardada
- AND MUST conservar las fotos del borrador local para permitir reintentar
- AND MUST conservar cualquier foto anterior que ya tuviera la propiedad
- BUT ante errores de red o respuestas ambiguas MUST conservar los objetos, porque la escritura podría haberse confirmado en el servidor

#### Scenario: Reintentar una publicación después de una subida parcial
- GIVEN una publicación nueva contiene varias fotos y una carga falla después de que otra haya terminado
- WHEN se informa que no se pudieron subir todas las fotos
- THEN MUST NOT insertar la propiedad
- AND MUST conservar todas las fotos seleccionadas y los datos del anuncio para el reintento
- AND al reintentar MUST subir el lote completo y guardar todas sus referencias en la galería y portada correspondiente

### Requirement: Captura de direccion y ubicacion
El sistema MUST capturar la ubicacion necesaria para publicar sin exponer direccion exacta publicamente.

#### Scenario: Completar direccion inicial
- GIVEN un usuario en el paso de direccion
- WHEN ingresa calle, provincia, municipio y barrio
- THEN el sistema MUST validar los campos obligatorios
- AND el sistema MUST habilitar el paso siguiente solo si los datos minimos son validos
- AND el mapa MUST centrarse en la zona cuando existan provincia y municipio

#### Scenario: Privacidad de direccion exacta
- GIVEN el anunciante ingresa direccion exacta para ubicar el inmueble
- WHEN la propiedad se publica
- THEN el sistema MUST persistir solo los datos necesarios para operacion interna
- AND la vista publica MUST mostrar ubicacion aproximada o zona
- AND MUST evitar exponer calle exacta sin una decision explicita de producto

### Requirement: Datos generales y especificaciones
El sistema MUST capturar operacion, tipo de inmueble, dormitorios, banos, area, parqueo y caracteristicas relevantes.

#### Scenario: Completar datos tecnicos
- GIVEN un usuario en los pasos de informacion general y especificaciones
- WHEN selecciona tipo, operacion y atributos tecnicos
- THEN el sistema MUST actualizar el estado del formulario
- AND el sistema MUST prevenir valores invalidos o negativos
- AND el sistema MUST mostrar contadores o ayudas cuando existan limites

#### Scenario: Capturar atributos solicitados por compradores
- GIVEN un usuario publica una vivienda
- WHEN selecciona amenidades como piscina o patio y, para apartamentos, un piso o nivel
- THEN el sistema MUST persistir esos atributos junto con la publicacion
- AND la ficha publica SHOULD mostrar el piso o nivel cuando exista
- AND las amenidades seleccionadas MUST quedar disponibles en el detalle de la propiedad

### Requirement: Imagenes optimizadas
El sistema MUST aceptar imagenes de la propiedad y optimizarlas en el cliente antes de subirlas al almacenamiento de Supabase.

#### Scenario: Subir y optimizar imagenes
- GIVEN un usuario selecciona o arrastra archivos de imagen (máximo 20 imágenes)
- WHEN el sistema procesa los archivos
- THEN el sistema MUST redimensionar las imágenes a una resolución máxima de 800px de ancho para optimizar ancho de banda
- AND el sistema MUST convertirlas y comprimirlas a formato WebP con calidad 0.70
- AND el sistema MUST mostrar previsualizaciones ordenadas con controles para reordenar y eliminar imágenes
- AND el sistema MUST subir las imágenes optimizadas a la carpeta correspondiente en Supabase Storage
- AND las cargas nuevas MUST enviarse por el Worker con sesión autenticada, que valida WebP y tamaño antes de escribir usando credenciales del servidor
- AND el navegador MUST NOT escribir objetos nuevos directamente en Storage

#### Scenario: Editar una propiedad con fotos privadas existentes
- GIVEN el propietario abre o reanuda la edición de una propiedad con fotos existentes en Storage privado
- WHEN se cargan sus miniaturas o añade fotos nuevas
- THEN el formulario MUST permanecer interactivo y no repetir actualizaciones de estado sin cambios
- AND MUST conservar las referencias existentes al guardar junto con las imágenes nuevas
- AND los cambios de contenido MUST dejar la propiedad en revisión

#### Scenario: Reintentar una descarga privada de portada ante un fallo temporal
- GIVEN la portada privada pertenece a una propiedad del usuario autenticado
- WHEN Storage devuelve un error de red, HTTP 408, 429 o 5xx al descargarla
- THEN el sistema MUST reintentar la descarga una vez
- AND MUST NOT reintentar un rechazo de permisos u otro error permanente 4xx
- AND MUST seguir mostrando un placeholder seguro si el reintento también falla

### Requirement: Condiciones Comerciales y Contacto
El sistema MUST capturar precios, tipo de moneda (USD, CUP, MLC) y contacto del anunciante antes de enviar el anuncio, adaptándose al flujo especial de permutas.

#### Scenario: Completar precio y contacto
- GIVEN un usuario en el paso comercial
- WHEN selecciona la moneda (USD, CUP o MLC) e ingresa el precio
- THEN el sistema MUST validar que el precio sea positivo
- AND MUST guardar la moneda seleccionada junto al importe sin conversión
- AND al editar MUST recuperar la moneda guardada, interpretando registros históricos como USD
- AND las tarjetas y la ficha pública MUST presentar el código de moneda del importe
- AND el sistema MUST requerir al menos un canal de contacto válido (teléfono o WhatsApp)

#### Scenario: Usar un teléfono de cualquier país
- GIVEN un anunciante completa los datos de contacto
- WHEN ingresa un número telefónico internacional de 7 a 15 dígitos
- THEN el sistema MUST aceptar números de cualquier país
- AND MUST permitir el prefijo internacional con `+` o `00`
- AND MUST permitir separadores legibles como espacios, guiones y paréntesis
- AND MUST NOT exigir verificación por SMS o WhatsApp

#### Scenario: Selección de Permuta
- GIVEN un anunciante que selecciona "Permuta" como tipo de operación
- WHEN completa el formulario
- THEN el sistema MUST permitir omitir el precio monetario
- AND el sistema MUST requerir el tipo de inmueble que busca, incluyendo la opción de tipo indiferente
- AND el sistema MUST permitir indicar provincia, municipio, dormitorios mínimos, área mínima y notas adicionales
- AND el sistema MUST permitir declarar si no existe diferencia de dinero, si es negociable, si pagaría hasta un monto o si espera recibir hasta un monto
- AND cuando la diferencia tenga un sentido definido, el monto positivo en USD MUST ser obligatorio
- AND el sistema MUST persistir estos datos estructurados dentro de `features.exchangePreferences`

#### Scenario: Recuperar preferencias de permuta
- GIVEN una permuta guardada o un borrador local con preferencias estructuradas
- WHEN el anunciante vuelve a abrirla para editar
- THEN el formulario MUST hidratar todos los campos de lo que busca y la diferencia de dinero
- AND los datos MUST conservarse en el autoguardado del borrador
- AND datos antiguos o malformados MUST NOT impedir abrir el formulario o la ficha

### Requirement: Moderación asistida por IA (Groq)
El sistema MUST procesar de forma asíncrona todo nuevo anuncio enviado a través de la API `/api/ai-moderate` usando IA para moderar texto e imágenes.

#### Scenario: Anuncio aprobado por IA
- GIVEN un usuario envía una publicación completa con texto e imágenes
- WHEN el Cloudflare Worker llama a la API de Groq con el modelo multimodal configurado
- THEN la IA MUST analizar si cumple las normas (sin contenido ofensivo, spam o imágenes inapropiadas)
- AND si el análisis es positivo, la IA retornará el estado `ai_approved`
- AND el sistema actualizará automáticamente el anuncio a `published` en base de datos haciéndolo público de inmediato

#### Scenario: Anuncio rechazado por IA o derivado a revisión manual
- GIVEN un anuncio sospechoso de spam, fraude, lenguaje ofensivo o con imágenes inapropiadas
- WHEN la IA detecta la infracción
- THEN retornará el estado `ai_rejected` junto con el motivo del rechazo
- AND el anuncio quedará oculto en estado `rejected` notificando al propietario
- AND si hay problemas de conexión con Groq, la API key está ausente o la respuesta es ambigua, el sistema MUST dejar el anuncio en `pending_review` para revisión manual del administrador
- AND los mensajes visibles MUST NOT exponer errores internos, identificadores de modelos ni detalles técnicos del proveedor
- AND el modelo MUST poder cambiarse mediante configuración del Worker sin modificar la lógica de moderación

### Requirement: Guardado y recuperacion de borrador
El sistema MUST proteger el progreso del usuario mediante borradores locales automáticos y manuales.

#### Scenario: Guardar borrador
- GIVEN un usuario esta completando una publicacion
- WHEN modifica campos del formulario
- THEN el sistema SHOULD persistir el progreso en `localStorage` o `IndexedDB` automáticamente en tiempo real
- AND el usuario MUST poder guardar manualmente el borrador
- AND al volver con `load_draft=true` el sistema MUST ofrecer recuperar el borrador
- AND la clave local MUST quedar asociada al identificador del usuario autenticado
- AND otro usuario que use el mismo navegador MUST NOT recuperar ese borrador

#### Scenario: Crear una propiedad cuando ya existe un borrador local
- GIVEN el anunciante elige crear una propiedad nueva y existe un borrador sin terminar en este dispositivo
- WHEN abre `/publicar` sin `load_draft=true`
- THEN el sistema MUST ofrecer continuar el borrador o empezar una propiedad nueva antes de cargar sus datos en el formulario
- AND MUST NOT restaurar ni sobrescribir el borrador hasta que el usuario elija una opción
- AND al empezar otra propiedad MUST explicar que el borrador local será reemplazado y eliminarlo solo después de la elección explícita
- AND al continuar MUST restaurar sus campos, fotos y paso guardados

#### Scenario: Reintentar la recuperación del borrador
- GIVEN la lectura del borrador local falla de forma transitoria
- WHEN el formulario informa que no pudo recuperar los datos
- THEN el usuario MUST poder reintentar la lectura sin salir ni borrar el borrador
- AND ante un reintento exitoso MUST volver al paso y a los datos guardados

#### Scenario: Salir de un borrador guardado sin perderlo
- GIVEN el usuario reanuda un borrador local existente y hace cambios en esta sesión
- WHEN elige «Salir sin guardar» y confirma
- THEN el sistema MUST esperar a que terminen las escrituras locales en curso
- AND MUST restaurar la instantánea que existía al abrir el borrador
- AND MUST mantener disponible el borrador para reanudarlo después
- AND MUST NOT crear, actualizar ni eliminar una propiedad remota
- WHEN el usuario cancela la confirmación
- THEN el formulario MUST permanecer abierto y conservar los cambios de esta sesión

#### Scenario: Visualización de banner de borrador en Dashboard
- GIVEN un usuario con sesión activa ingresa a su panel de usuario
- WHEN el sistema detecta que existe un borrador local no guardado en base de datos
- THEN el sistema MUST mostrar un banner destacado con la opción: "Tienes un borrador de publicación pendiente. ¿Deseas reanudarlo?"
- AND si el usuario hace clic, MUST cargar los datos en el formulario de publicación y borrar la alerta.

#### Scenario: Mostrar portada de un borrador local en Mis publicaciones
- GIVEN existe un borrador local con fotos guardadas en IndexedDB
- WHEN el anunciante abre `/mis-propiedades`
- THEN la tarjeta del borrador MUST mostrar su primera foto local como portada
- AND si el borrador no tiene una imagen disponible MUST mostrar el placeholder de forma accesible
- AND MUST NOT solicitar una URL remota para una foto almacenada como dato local

#### Scenario: No asignar borradores antiguos sin propietario
- GIVEN el navegador contiene la clave heredada global `cubitat_publish_draft` sin un UID asociado
- WHEN cualquier usuario autenticado abre Publicar o Mis publicaciones
- THEN MUST NOT mostrar, copiar ni asociar ese contenido al usuario actual
- AND MUST eliminar la clave global sin propietario para impedir que otra cuenta la reciba después
- AND MUST conservar intactos los borradores guardados bajo la clave del UID activo

#### Scenario: Borrador no debe sobrescribir edicion remota
- GIVEN un usuario abre una propiedad existente para editar
- WHEN existe un borrador local antiguo
- THEN el sistema MUST distinguir entre borrador nuevo y edicion existente
- AND MUST pedir confirmacion antes de cargar datos locales sobre datos remotos

#### Scenario: Descartar borrador
- GIVEN existe un borrador local
- WHEN el usuario decide descartarlo
- THEN el sistema MUST limpiar el almacenamiento local asociado
- AND el formulario MUST volver a un estado inicial controlado

### Requirement: Envio de publicacion
El sistema MUST crear o actualizar el anuncio en Supabase y dejarlo en el estado esperado.

#### Scenario: Publicar anuncio nuevo
- GIVEN un usuario autenticado completo todos los campos requeridos
- WHEN confirma la publicacion
- THEN el sistema MUST insertar la propiedad en la base de datos
- AND MUST asociarla al usuario autenticado
- AND MUST guardar las imagenes y `contact_info`
- AND MUST mostrar confirmacion de exito

#### Scenario: Editar anuncio existente
- GIVEN un usuario propietario abre `/editar/:id`
- WHEN modifica datos y guarda
- THEN el sistema MUST actualizar solo la propiedad autorizada
- AND MUST omitir `user_id` del payload de actualización; el dueño se determina por la sesión y no puede reasignarse desde el formulario
- AND MUST filtrar la actualización por ID de publicación y por el usuario autenticado
- AND MUST confirmar que la actualización devolvió una fila antes de iniciar moderación o mostrar éxito
- AND si RLS no devuelve una fila MUST explicar que hay que confirmar la cuenta propietaria, conservando los datos locales para reintentar
- AND MUST enviar el anuncio editado a `pending_review`
- AND MUST conservar imagenes existentes que no fueron eliminadas
- AND MUST conservar amenidades existentes que el formulario actual no pueda editar
- AND MUST hidratar las casillas conocidas desde `amenities` cuando falte su valor en `features`
- AND MUST mostrar confirmacion de actualizacion
- AND MUST confirmar que la fila devuelta corresponde al ID y usuario autenticado antes de iniciar acciones posteriores
- AND si RLS no devuelve una fila MUST informar que se confirme la cuenta propietaria y conservar los datos locales para reintentar

#### Scenario: Recuperar contacto privado al editar
- GIVEN el contacto del anuncio se guarda en `property_contact_details` y su columna heredada `properties.contact_info` no es legible desde el Data API
- WHEN el propietario abre `/editar/:id`
- THEN el sistema MUST leer nombre, teléfono y correo desde la relación privada protegida por RLS
- AND MUST cargar esos valores en el formulario del propietario
- AND la consulta MUST enumerar las columnas permitidas y MUST NOT solicitar `properties.*` ni `properties.contact_info`
- AND MUST NOT exponerlos en consultas públicas de catálogo

#### Scenario: Añadir una foto al editar
- GIVEN una propiedad propia con fotos privadas existentes
- WHEN el propietario agrega una foto y guarda la edición
- THEN el sistema MUST subir la foto nueva al Storage privado y guardar su URL junto a las existentes
- AND MUST conservar la primera foto existente como portada si el propietario no reordena la galería
- AND MUST enviar la propiedad a `pending_review`
- AND si la carga de la foto nueva falla MUST NOT actualizar la propiedad ni descartar el borrador

### Requirement: Mis publicaciones del anunciante
El sistema MUST permitir al anunciante administrar sus propios anuncios sin acceder a anuncios de otros usuarios.

#### Scenario: Listar mis publicaciones
- GIVEN un usuario autenticado con anuncios propios
- WHEN abre `/mis-propiedades`
- THEN el sistema MUST listar solo propiedades asociadas a ese usuario
- AND MUST mostrar estado, fecha, operacion, precio y acciones disponibles
- AND MUST representar sin errores los borradores remotos con estado `draft`

#### Scenario: Filtrar mis publicaciones por estado
- GIVEN un usuario tiene anuncios publicados, en revisión, rechazados, borradores u ocultos
- WHEN selecciona un estado en el filtro de `/mis-propiedades`
- THEN MUST mostrar solo anuncios que pertenecen a ese grupo de estado
- AND MUST mostrar el conteo de cada grupo y mantener accesible el motivo de rechazo en las publicaciones rechazadas
- AND MUST permitir volver a la lista completa sin recargar la página

#### Scenario: Editar publicacion propia
- GIVEN un anunciante ve una publicacion propia
- WHEN pulsa editar
- THEN el sistema MUST abrir `/editar/:id`
- AND MUST cargar datos existentes en el formulario
- AND MUST validar autorizacion antes de guardar cambios

#### Scenario: Bloquear edición de una publicación ajena
- GIVEN un usuario autenticado conoce el identificador de una publicación ajena
- WHEN abre directamente `/editar/:id`
- THEN el sistema MUST comprobar la propiedad antes de cargar los datos
- AND MUST impedir que el formulario muestre información de la publicación ajena
- AND MUST regresar a una ruta segura sin ejecutar escrituras

#### Scenario: Pausar o retirar publicacion propia
- GIVEN un anunciante decide dejar de mostrar un anuncio
- WHEN ejecuta la accion de pausa, ocultar o eliminar si existe
- THEN el sistema MUST confirmar la accion antes de aplicarla
- AND MUST actualizar el estado visible de la publicacion
- AND MUST impedir que el anuncio siga apareciendo en resultados si queda no publicado

#### Scenario: Propietario oculta y restaura sin cambios
- GIVEN una publicación propia está `published`
- WHEN el propietario la oculta
- THEN MUST pasar a `owner_hidden` y salir de resultados públicos
- AND solo el mismo propietario MUST poder devolverla a `published`

#### Scenario: Propietario edita una publicación oculta
- GIVEN una publicación propia está `owner_hidden`
- WHEN el propietario modifica contenido y guarda
- THEN MUST pasar a `pending_review`
- AND MUST ejecutar nuevamente la moderación IA antes de reaparecer

#### Scenario: Moderación oculta y restaura
- GIVEN un administrador oculta una publicación pública con motivo
- WHEN confirma la acción
- THEN MUST pasar a `paused`
- AND solo el administrador MAY devolver una fila `paused` a `published`
- AND el administrador MUST NOT publicar una fila `owner_hidden`

### Requirement: Estados de publicacion
El sistema MUST manejar estados de anuncio de forma consistente entre resultados, detalle, cuenta y moderacion.

#### Scenario: Propiedad publicada
- GIVEN una propiedad tiene estado `published`
- WHEN se cargan resultados o detalle
- THEN el sistema MUST incluirla en la experiencia publica si cumple filtros

#### Scenario: Propiedad pausada u oculta
- GIVEN una propiedad tiene estado `paused`, `owner_hidden`, `hidden`, `draft` o equivalente no publico
- WHEN se cargan resultados publicos
- THEN el sistema MUST excluirla
- AND el propietario o admin MAY verla en areas privadas segun permisos

#### Scenario: Salir de una edición sin guardar los cambios
- GIVEN una propiedad publicada con un borrador local de edición
- WHEN el usuario elige «Salir sin guardar» y confirma
- THEN el sistema MUST esperar a que terminen los guardados locales en curso
- AND MUST borrar solo el borrador del usuario/anuncio activo antes de salir
- AND MUST mantener intacta la propiedad publicada
- AND cuando vuelve a abrir el anuncio MUST mostrar los datos remotos originales, sin reaplicar el borrador descartado
- WHEN el usuario cancela la confirmación
- THEN el editor MUST permanecer abierto y el borrador conservarse

#### Scenario: Recuperar un borrador local al editar una publicación
- GIVEN el propietario abre una publicación y el servidor devuelve sus datos, contactos e imágenes
- WHEN existe un borrador local para esa publicación
- THEN una instantánea local sin cambios explícitos MUST NOT reemplazar los datos del servidor
- AND un borrador heredado sin marca de edición MUST combinar los valores no vacíos y las fotos locales sin duplicar ni ocultar las fotos remotas
- AND un borrador marcado como editado por el usuario MUST restaurar sus valores exactos, incluidos campos vacíos y una galería intencionalmente vacía

### Scenario: Agregar fotos mientras otro lote se procesa
- GIVEN un lote de fotos está en compresión
- WHEN el usuario intenta agregar otra selección o arrastre
- THEN el sistema MUST impedir que ambos lotes actualicen la galería en paralelo
- AND MUST indicar que espere a que termine el procesamiento actual
- AND MUST conservar el límite total de 20 fotos

### Scenario: Previsualizar fotos existentes al editar
- GIVEN el propietario abre una publicación con fotos privadas cuya referencia es URL directa de Supabase o la ruta proxy de la aplicación
- WHEN el editor carga la galería
- THEN MUST descargar la foto desde el Storage configurado usando la sesión autenticada del propietario
- AND MUST mostrar una vista previa temporal sin cambiar la referencia canónica que se guardará
- AND MUST rechazar rutas de otro propietario o que no pertenezcan al bucket esperado
- AND si Storage no entrega la imagen MUST conservar su referencia y mostrar un fallback sin borrarla

#### Scenario: Guardar referencias de fotos existentes detrás del proxy
- GIVEN una foto existente se representa mediante una ruta `/api/supabase/.../property_images/<propietario>/<foto>.webp`
- WHEN el propietario guarda la edición
- THEN MUST conservar esa referencia si pertenece al propietario autenticado
- AND MUST NOT intentar convertir la ruta en un archivo de imagen nuevo
- AND MUST rechazar referencias del bucket que pertenezcan a otro propietario

#### Scenario: Mostrar fotos del bucket privado en anuncios publicados
- GIVEN una imagen de propiedad almacenada en `property_images`, cuyo bucket es privado
- WHEN la aplicación la muestra en una tarjeta, galería o editor
- THEN MUST solicitarla por el endpoint privado `/api/supabase/storage/v1/object/property_images/<propietario>/<archivo>`
- AND MUST NOT usar la ruta pública `/object/public/` para ese bucket
- AND MUST conservar las URLs externas de imágenes sin alterarlas

#### Scenario: Reintentar una vista previa privada que no cargó
- GIVEN el propietario edita una propiedad con fotos privadas existentes
- WHEN falla una descarga temporal de una foto desde el Storage privado
- THEN MUST conservar la referencia canónica de la galería
- AND MUST indicar que esa foto no pudo cargarse y ofrecer un reintento individual
- WHEN el reintento puede descargar la foto
- THEN MUST mostrar la vista previa y conservar la misma referencia canónica

### Scenario: Crear una propiedad cuando existe un borrador local
- GIVEN el usuario inicia `/publicar` para crear una propiedad y existe un borrador local sin terminar
- WHEN la pantalla comprueba el borrador
- THEN MUST ofrecer continuar el borrador o empezar una propiedad nueva antes de mostrar o guardar datos del formulario
- AND continuar MUST restaurar campos, fotos y paso guardados
- AND empezar una propiedad nueva MUST explicar que reemplazará el borrador local y eliminarlo solo tras la elección explícita
- AND MUST NOT modificar publicaciones ya enviadas al servidor
- WHEN el usuario elige reanudar un borrador desde Mis publicaciones o editar una propiedad
- THEN MUST abrir directamente los datos guardados que corresponden a esa acción
