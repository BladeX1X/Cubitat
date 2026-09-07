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
- GIVEN un usuario selecciona archivos de imagen (máximo 20 imágenes)
- WHEN el sistema procesa los archivos
- THEN el sistema MUST redimensionar las imágenes a una resolución máxima de 800px de ancho para optimizar ancho de banda
- AND el sistema MUST convertirlas y comprimirlas a formato WebP con calidad 0.70
- AND el sistema MUST mostrar previsualizaciones ordenadas permitiendo reordenar y eliminar imágenes
- AND el sistema MUST subir las imágenes optimizadas a la carpeta correspondiente en Supabase Storage

### Requirement: Condiciones Comerciales y Contacto
El sistema MUST capturar precios, tipo de moneda (USD, CUP, MLC) y contacto del anunciante antes de enviar el anuncio, adaptándose al flujo especial de permutas.

#### Scenario: Completar precio y contacto
- GIVEN un usuario en el paso comercial
- WHEN selecciona la moneda (USD, CUP o MLC) e ingresa el precio
- THEN el sistema MUST validar que el precio sea positivo
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
- AND el sistema MUST habilitar un campo obligatorio para describir detalladamente qué busca a cambio de su propiedad (ej. "Busco apartamento de 2 habitaciones en Vedado")

### Requirement: Moderación asistida por IA (Groq)
El sistema MUST procesar de forma asíncrona todo nuevo anuncio enviado a través de la API `/api/ai-moderate` usando IA para moderar texto e imágenes.

#### Scenario: Anuncio aprobado por IA
- GIVEN un usuario envía una publicación completa con texto e imágenes
- WHEN el Cloudflare Worker llama a la API de Groq con el modelo Llama 4
- THEN la IA MUST analizar si cumple las normas (sin contenido ofensivo, spam o imágenes inapropiadas)
- AND si el análisis es positivo, la IA retornará el estado `ai_approved`
- AND el sistema actualizará automáticamente el anuncio a `published` en base de datos haciéndolo público de inmediato

#### Scenario: Anuncio rechazado por IA o derivado a revisión manual
- GIVEN un anuncio sospechoso de spam, fraude, lenguaje ofensivo o con imágenes inapropiadas
- WHEN la IA detecta la infracción
- THEN retornará el estado `ai_rejected` junto con el motivo del rechazo
- AND el anuncio quedará oculto en estado `rejected` notificando al propietario
- AND si hay problemas de conexión con Groq, la API key está ausente o la respuesta es ambigua, el sistema MUST dejar el anuncio en `pending_review` para revisión manual del administrador

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

#### Scenario: Visualización de banner de borrador en Dashboard
- GIVEN un usuario con sesión activa ingresa a su panel de usuario
- WHEN el sistema detecta que existe un borrador local no guardado en base de datos
- THEN el sistema MUST mostrar un banner destacado con la opción: "Tienes un borrador de publicación pendiente. ¿Deseas reanudarlo?"
- AND si el usuario hace clic, MUST cargar los datos en el formulario de publicación y borrar la alerta.

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
- AND MUST conservar imagenes existentes que no fueron eliminadas
- AND MUST mostrar confirmacion de actualizacion

### Requirement: Mis publicaciones del anunciante
El sistema MUST permitir al anunciante administrar sus propios anuncios sin acceder a anuncios de otros usuarios.

#### Scenario: Listar mis publicaciones
- GIVEN un usuario autenticado con anuncios propios
- WHEN abre `/mis-propiedades`
- THEN el sistema MUST listar solo propiedades asociadas a ese usuario
- AND MUST mostrar estado, fecha, operacion, precio y acciones disponibles
- AND MUST representar sin errores los borradores remotos con estado `draft`

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
