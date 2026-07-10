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

### Requirement: Imagenes optimizadas
El sistema MUST aceptar imagenes de la propiedad y optimizarlas antes de persistirlas.

#### Scenario: Subir imagenes
- GIVEN un usuario selecciona archivos de imagen
- WHEN el sistema recibe los archivos
- THEN el sistema MUST limitar la cantidad maxima permitida
- AND el sistema MUST comprimir y convertir imagenes a WebP cuando sea posible
- AND el sistema MUST mostrar previsualizaciones ordenadas
- AND el sistema MUST permitir eliminar imagenes antes de publicar

### Requirement: Precio y contacto
El sistema MUST capturar condiciones comerciales y contacto del anunciante antes de publicar.

#### Scenario: Completar precio y contacto
- GIVEN un usuario llega a los pasos finales
- WHEN ingresa precio, email y telefono o WhatsApp
- THEN el sistema MUST validar formato de telefono
- AND para permutas MAY omitir precio monetario
- AND el sistema MUST impedir publicar si falta contacto requerido

### Requirement: Guardado y recuperacion de borrador
El sistema MUST proteger el progreso del usuario mediante borradores locales y manuales.

#### Scenario: Guardar borrador
- GIVEN un usuario esta completando una publicacion
- WHEN modifica campos del formulario
- THEN el sistema SHOULD persistir el borrador localmente
- AND el usuario MUST poder guardar manualmente el borrador
- AND al volver con `load_draft=true` el sistema MUST ofrecer recuperar el borrador

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

#### Scenario: Editar publicacion propia
- GIVEN un anunciante ve una publicacion propia
- WHEN pulsa editar
- THEN el sistema MUST abrir `/editar/:id`
- AND MUST cargar datos existentes en el formulario
- AND MUST validar autorizacion antes de guardar cambios

#### Scenario: Pausar o retirar publicacion propia
- GIVEN un anunciante decide dejar de mostrar un anuncio
- WHEN ejecuta la accion de pausa, ocultar o eliminar si existe
- THEN el sistema MUST confirmar la accion antes de aplicarla
- AND MUST actualizar el estado visible de la publicacion
- AND MUST impedir que el anuncio siga apareciendo en resultados si queda no publicado

### Requirement: Estados de publicacion
El sistema MUST manejar estados de anuncio de forma consistente entre resultados, detalle, cuenta y moderacion.

#### Scenario: Propiedad publicada
- GIVEN una propiedad tiene estado `published`
- WHEN se cargan resultados o detalle
- THEN el sistema MUST incluirla en la experiencia publica si cumple filtros

#### Scenario: Propiedad pausada u oculta
- GIVEN una propiedad tiene estado `paused`, `hidden`, `draft` o equivalente no publico
- WHEN se cargan resultados publicos
- THEN el sistema MUST excluirla
- AND el propietario o admin MAY verla en areas privadas segun permisos
