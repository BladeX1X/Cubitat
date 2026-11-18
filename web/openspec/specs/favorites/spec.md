# Proceso de Favoritos

## Purpose
Define el comportamiento de guardado, consulta y retiro de propiedades, servicios y materiales favoritos.

## Requirements

### Requirement: Guardar propiedad
El sistema MUST permitir guardar propiedades desde catalogo, detalle y previews donde exista la accion.

#### Scenario: Usuario autenticado guarda propiedad
- GIVEN un usuario autenticado viendo una propiedad
- WHEN pulsa el boton de guardar
- THEN el sistema MUST persistir el favorito asociado al usuario y propiedad
- AND MUST actualizar el estado visual del boton
- AND MUST evitar duplicados para la misma propiedad y usuario

#### Scenario: Usuario anonimo intenta guardar
- GIVEN un usuario sin sesion viendo una propiedad
- WHEN pulsa guardar
- THEN el sistema MUST abrir una invitacion o modal de login
- AND despues de autenticarse SHOULD completar o permitir completar la accion solicitada

#### Scenario: La sesión todavía se está comprobando
- GIVEN el catálogo ya muestra tarjetas pero la consulta de sesión no ha terminado
- WHEN el usuario intenta guardar una propiedad
- THEN el botón MUST permanecer deshabilitado y anunciar que se está comprobando la sesión
- AND MUST NOT abrir el prompt de inicio de sesión ni enviar una escritura hasta conocer el resultado
- WHEN la sesión se resuelve
- THEN el botón MUST habilitar la acción normal para usuarios autenticados o anónimos

#### Scenario: Guardar desde preview de mapa
- GIVEN un usuario ve una preview de propiedad en el mapa cuando exista accion de guardar
- WHEN pulsa guardar
- THEN el sistema MUST aplicar el mismo flujo de favorito que en catalogo y detalle
- AND MUST mantener al usuario en la vista de mapa

#### Scenario: Usuario anonimo guarda desde mapa a pantalla completa
- GIVEN un usuario sin sesion ve una preview dentro del mapa a pantalla completa
- WHEN pulsa el boton de favorito
- THEN la invitacion de inicio de sesion MUST renderizarse por encima del mapa
- AND al continuar el modal de autenticacion MUST permanecer por encima del mapa
- AND ambos modales MUST montarse directamente en `document.body`

### Requirement: Consultar favoritos
El sistema MUST mostrar una pagina privada con propiedades guardadas.

Cuando la cuenta tenga favoritos de Servicios o Materiales habilitados, `/favoritos`
MUST ofrecer filtros locales para Todos, Propiedades, Servicios y Materiales.
Cambiar el filtro MUST actualizar las tarjetas visibles y el conteo sin navegar a
otro catálogo ni recargar la página. El filtro activo MUST exponerse con
`aria-pressed`; si una categoría no tiene elementos, MUST mostrarse un estado
vacío para esa categoría y el usuario MUST poder regresar a Todos.

#### Scenario: Abrir favoritos
- GIVEN un usuario autenticado
- WHEN abre `/favoritos`
- THEN el sistema MUST mostrar las propiedades guardadas
- AND cada propiedad MUST conservar acciones principales de ver detalle y contactar
- AND si no existen favoritos MUST mostrar un estado vacio con accion para ver mas propiedades
- AND la ilustracion decorativa del estado vacio MUST permanecer fuera del arbol accesible

#### Scenario: Filtrar favoritos por tipo
- GIVEN el usuario tiene favoritos de más de una categoría
- WHEN selecciona Propiedades, Servicios o Materiales
- THEN `/favoritos` MUST conservar la ruta y mostrar solo elementos de esa categoría
- AND MUST actualizar el conteo visible y marcar el filtro activo
- WHEN selecciona Todos
- THEN MUST volver a mostrar juntos sus favoritos guardados

#### Scenario: Error al cargar favoritos
- GIVEN un usuario autenticado abre `/favoritos` y falla la consulta
- WHEN la carga termina
- THEN el sistema MUST mostrar un error recuperable en lugar del estado vacío
- AND MUST permitir reintentar la consulta

#### Scenario: Favorito guardado mientras hay una lectura pendiente
- GIVEN la lista de favoritos aún se está cargando
- WHEN el usuario guarda o quita una propiedad antes de que termine esa lectura
- THEN una respuesta anterior a la escritura MUST NOT deshacer el cambio visible
- AND el sistema MUST volver a consultar el conjunto después de completar la escritura

#### Scenario: Lectura de favoritos responde antes que la escritura
- GIVEN el usuario inicia una escritura optimista y luego actualiza Favoritos
- WHEN la lectura devuelve una instantánea anterior mientras la escritura sigue pendiente
- THEN el cambio optimista MUST permanecer visible
- AND el sistema MUST reconciliarlo con una lectura nueva al terminar la escritura

#### Scenario: Doble clic en el mismo favorito
- GIVEN una escritura para guardar o quitar una propiedad sigue pendiente
- WHEN el usuario vuelve a pulsar el mismo control
- THEN el sistema MUST evitar enviar una segunda escritura simultánea para esa cuenta y propiedad

#### Scenario: Sesión cambia durante la lectura o escritura de favoritos
- GIVEN hay una lectura o escritura pendiente para una cuenta
- WHEN la sesión cambia a otra cuenta
- THEN las respuestas anteriores MUST NOT borrar, reemplazar ni reportar error sobre los favoritos de la cuenta nueva

#### Scenario: Error al comprobar sesión de favoritos
- GIVEN falla la consulta inicial de sesión por un problema de conexión
- WHEN el usuario abre `/favoritos`
- THEN el sistema MUST mostrar un mensaje de recuperación en lugar de quedarse cargando
- AND MUST permitir volver a consultar sesión y favoritos

#### Scenario: Favorito ya no publicado
- GIVEN una propiedad guardada fue pausada, eliminada u ocultada
- WHEN el usuario abre favoritos
- THEN el sistema SHOULD ocultarla o marcarla como no disponible
- AND MUST evitar navegar a detalle publico inexistente sin estado de error claro

### Requirement: Quitar favorito
El sistema MUST permitir retirar propiedades guardadas sin romper el contexto actual.

#### Scenario: Quitar desde favoritos
- GIVEN un usuario esta en `/favoritos`
- WHEN quita una propiedad guardada
- THEN el sistema MUST eliminar la relacion de favorito
- AND MUST retirar la tarjeta de la lista
- AND si la lista queda vacia MUST mostrar estado vacio

#### Scenario: Quitar desde tarjeta de resultados
- GIVEN un usuario guardo una propiedad
- WHEN vuelve a pulsar el boton de favorito en resultados o detalle
- THEN el sistema MUST eliminar el favorito
- AND MUST actualizar el icono sin duplicar solicitudes innecesarias

### Requirement: Guardar servicios y materiales en DEV
El perfil `phase34-dev` MUST permitir guardar perfiles de servicio y anuncios de materiales con el mismo control visual y autenticación compartida, usando `saved_marketplace_listings` con aislamiento por usuario.

La interfaz de catálogo, el proveedor de estado compartido y la pantalla `/favoritos` MUST habilitarse según las banderas F4-SVC/F4-MAT activas, sin depender del nombre de modo de Vite.

El proxy del Worker DEV MUST permitir `POST` y `DELETE` en esa tabla solo cuando la solicitud lleve una sesión autenticada; la política RLS sigue siendo la autoridad final sobre el usuario y el anuncio.

#### Scenario: Guardar un servicio o material
- GIVEN un usuario autenticado está en el catálogo de Servicios o Materiales
- WHEN pulsa el corazón de una tarjeta
- THEN el botón MUST actualizarse y persistir solo el ID del anuncio y el usuario
- AND pulsarlo de nuevo MUST quitar el favorito
- GIVEN un usuario anónimo
- WHEN pulsa el corazón
- THEN se MUST abrir el prompt compartido de inicio de sesión
- AND no MUST mostrarse un error de persistencia hasta que haya una sesión
- AND el mensaje del prompt MUST referirse a favoritos de forma general y no solo a propiedades o inmuebles

#### Scenario: Permisos de la tabla de favoritos de catálogo
- GIVEN se despliega `saved_marketplace_listings` en un proyecto con permisos por defecto del esquema
- WHEN se aplican las migraciones de favoritos
- THEN `authenticated` MUST conservar solo `SELECT`, `INSERT` y `DELETE`
- AND MUST NOT poder actualizar o reasignar la fila a otra cuenta
- AND `anon` y `service_role` MUST NOT recibir acceso a la tabla
- AND las políticas RLS MUST limitar lectura, alta y baja al UID de la sesión

#### Scenario: Guardar favorito a través del proxy DEV
- GIVEN un usuario autenticado guarda o quita un favorito de Servicio o Material
- WHEN la solicitud pasa por `/api/supabase`
- THEN el Worker DEV MUST reenviar `POST` y `DELETE` a `saved_marketplace_listings`
- AND MUST conservar el encabezado de autorización de la sesión
- WHEN la misma escritura llega sin sesión autenticada
- THEN el Worker MUST responder `403` sin reenviarla a Supabase

#### Scenario: Error al guardar un servicio o material
- GIVEN una escritura de favorito falla por conexión o permisos
- WHEN el guardado termina
- THEN el botón MUST volver a su estado anterior
- AND MUST mostrar un aviso accesible para reintentar

#### Scenario: Cambio de cuenta mientras se actualiza un favorito de catálogo
- GIVEN una escritura o lectura de favoritos está pendiente para una cuenta
- WHEN Auth cambia a otra cuenta y la petición anterior termina o falla
- THEN los favoritos anteriores MUST NOT aparecer en la cuenta nueva
- AND una respuesta de lectura anterior MUST NOT reemplazar el estado optimista ni la lectura más reciente
- AND un fallo de escritura de la cuenta anterior MUST NOT revertir favoritos de la cuenta nueva

#### Scenario: Consultar favoritos de marketplace
- GIVEN el usuario abre Favoritos en DEV
- WHEN existen perfiles o anuncios guardados y publicados
- THEN la pantalla MUST mostrar conjuntamente propiedades, servicios y materiales guardados
- AND los servicios/materiales pausados, retirados o no disponibles MUST quedar fuera de los resultados públicos
- WHEN falla la consulta de favoritos
- THEN la pantalla MUST mostrar un error recuperable y una acción de reintento, nunca el estado vacío

#### Scenario: Guardar, abrir y quitar un favorito de catálogo
- GIVEN un usuario autenticado está en el catálogo de Servicios o Materiales
- WHEN guarda un anuncio
- THEN su corazón MUST reflejar el estado guardado
- AND la relación MUST quedar vinculada al usuario y al tipo/ID correctos
- WHEN abre Favoritos
- THEN el anuncio MUST aparecer en la lista
- WHEN quita el anuncio desde Favoritos
- THEN MUST desaparecer y la lista MUST mostrar el estado vacío si no quedan otros favoritos
