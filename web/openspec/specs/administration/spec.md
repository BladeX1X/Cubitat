# Proceso de Administracion y Moderacion

## Purpose
Define las capacidades internas para revisar usuarios, anuncios y reportes.

## Requirements

### Requirement: Acceso restringido
El sistema MUST limitar la administracion a usuarios con rol autorizado.

#### Scenario: Usuario sin rol admin abre moderacion
- GIVEN un usuario autenticado sin rol `admin`
- WHEN intenta abrir `/moderar`
- THEN el sistema MUST impedir el acceso
- AND MUST mostrar una respuesta segura o redirigir sin exponer datos internos

#### Scenario: Admin abre moderacion
- GIVEN un usuario autenticado con rol `admin`
- WHEN abre `/moderar`
- THEN el sistema MUST mostrar herramientas de revision disponibles
- AND MUST cargar datos necesarios de forma controlada

#### Scenario: Usuario anonimo abre moderacion
- GIVEN un usuario sin sesion
- WHEN intenta abrir `/moderar`
- THEN el sistema MUST abrir login o redirigir a inicio
- AND MUST evitar cualquier consulta de datos administrativos

### Requirement: Sesion administrativa elevada
El sistema MUST validar rol administrador y `aal2` en interfaz, Worker, RPC y RLS para funciones sensibles.

#### Scenario: Admin en AAL1 intenta saltarse el guard
- GIVEN una sesion valida de administrador con `aal1`
- WHEN consulta datos privados, metricas o bitacora, o intenta moderar contenido
- THEN el backend MUST denegar la operacion

#### Scenario: Admin en AAL2
- GIVEN una sesion valida de administrador con `aal2`
- WHEN accede al panel o ejecuta una accion de moderacion permitida
- THEN el sistema MUST autorizarla conforme a las politicas restantes

#### Scenario: RPC heredada de moderacion retirada
- GIVEN un cliente anonimo, autenticado o administrador con cualquier AAL
- WHEN intenta ejecutar `set_property_ai_moderation(uuid, property_status, text)`
- THEN el backend MUST denegar EXECUTE incluso mediante la API directa de Supabase
- AND el Worker MUST conservar exclusivamente `set_property_ai_moderation_trusted` para automatizacion con `service_role`
- AND la moderacion humana MUST conservar las politicas existentes de admin AAL2

### Requirement: Gestion de publicaciones
El sistema MUST permitir revisar estado y calidad de anuncios.

#### Scenario: Revisar publicacion
- GIVEN existe una propiedad publicada o pendiente
- WHEN un admin la revisa
- THEN el sistema MUST mostrar datos principales, propietario, contacto y estado
- AND el admin SHOULD poder cambiar estado cuando la interfaz lo permita
- AND toda accion sensible SHOULD quedar auditable

#### Scenario: Ocultar publicacion desde moderacion
- GIVEN un admin revisa una publicacion sospechosa o incumplidora
- WHEN elige ocultarla e indica motivo
- THEN el sistema MUST actualizar el estado a no publico
- AND MUST guardar o mostrar el motivo de moderacion cuando exista campo disponible
- AND MUST retirar la propiedad de resultados publicos

#### Scenario: Eliminar publicacion desde moderacion
- GIVEN un admin confirma eliminar una publicacion
- WHEN ejecuta la accion destructiva
- THEN el sistema MUST pedir confirmacion explicita
- AND MUST eliminar o marcar como eliminada la propiedad segun politica de datos
- AND MUST actualizar listas administrativas y publicas

#### Scenario: Moderacion evita acciones accidentales
- GIVEN una accion cambia visibilidad o elimina informacion
- WHEN el admin pulsa la accion
- THEN el sistema MUST requerir confirmacion
- AND SHOULD registrar razon, usuario admin, fecha y propiedad afectada cuando la infraestructura lo soporte

### Requirement: Gestion de reportes
El sistema MUST permitir analizar reportes de propiedades sospechosas.

#### Scenario: Revisar reporte
- GIVEN existe un reporte de propiedad
- WHEN un admin abre la vista de moderacion
- THEN el sistema MUST mostrar motivo, comentarios, propiedad asociada y fecha
- AND el admin SHOULD poder marcarlo como revisado o tomar accion sobre la propiedad

#### Scenario: Reporte referencia propiedad inexistente
- GIVEN existe un reporte sobre una propiedad eliminada o no disponible
- WHEN el admin abre moderacion
- THEN el sistema MUST mostrar el reporte sin romper la vista
- AND SHOULD indicar que la propiedad asociada no esta disponible

### Requirement: Gestion de usuarios
El sistema MUST permitir revisar usuarios solo a roles autorizados y con exposicion minima de datos.

#### Scenario: Admin revisa usuario
- GIVEN un admin abre una vista de usuarios o detalle de anunciante
- WHEN se cargan datos del usuario
- THEN el sistema MUST mostrar solo datos necesarios para operacion y moderacion
- AND MUST proteger emails, telefonos y metadatos sensibles contra acceso no autorizado

#### Scenario: Accion sobre usuario
- GIVEN un admin detecta abuso de un usuario
- WHEN la interfaz soporte pausar, marcar o escalar el usuario
- THEN el sistema MUST confirmar la accion
- AND SHOULD registrar razon y fecha
- AND MUST evitar aplicar cambios a usuarios fuera del alcance autorizado

### Requirement: Revision KYC con doble evidencia
El sistema MUST permitir que únicamente un administrador en AAL2 compare el documento de identidad con la foto de la persona sosteniéndolo.

#### Scenario: Admin revisa una solicitud completa
- GIVEN existe una solicitud KYC pendiente con las dos evidencias privadas
- WHEN un administrador en AAL2 abre la pestaña KYC
- THEN MUST recibir URLs firmadas de corta duración para ambas imágenes
- AND MUST visualizar las dos evidencias con etiquetas diferentes
- AND MAY aprobar o rechazar la solicitud

#### Scenario: Solicitud incompleta o evidencia ausente
- GIVEN falta la ruta o el objeto de cualquiera de las dos evidencias
- WHEN el administrador intenta aprobar la solicitud
- THEN la interfaz MUST deshabilitar la aprobación
- AND la RPC MUST rechazar la aprobación aunque se invoque directamente

### Requirement: Retención mínima de evidencias KYC procesadas
El sistema MUST eliminar el documento y la selfie privados cuando hayan transcurrido 24 horas desde la aprobación o 1 hora desde el rechazo, conservando únicamente el registro mínimo de auditoría.

#### Scenario: Solicitud recién aprobada
- GIVEN una solicitud KYC completa acaba de ser aprobada
- WHEN el Cron de retención se ejecuta antes de cumplir 24 horas
- THEN MUST conservar ambas evidencias privadas
- AND MUST evitar reclamar la solicitud para borrado

#### Scenario: Solicitud aprobada hace 24 horas
- GIVEN una solicitud KYC aprobada conserva ambas evidencias y ya cumplió 24 horas
- WHEN el Cron DEV ejecuta la retención con credenciales `service_role`
- THEN MUST reclamar la solicitud de forma atómica
- AND MUST eliminar documento y selfie mediante la API de Storage
- AND MUST sustituir ambas rutas por `NULL`
- AND MUST registrar la fecha de purga sin borrar el estado, usuario ni fechas de auditoría

#### Scenario: Solicitud rechazada hace menos de 1 hora
- GIVEN una solicitud KYC fue rechazada y todavía no ha cumplido 1 hora
- WHEN el Cron de retención se ejecuta
- THEN MUST conservar ambas evidencias privadas
- AND MUST evitar reclamar la solicitud para borrado

#### Scenario: Solicitud rechazada hace 1 hora
- GIVEN una solicitud KYC rechazada conserva ambas evidencias y ya cumplió 1 hora
- WHEN el Cron DEV ejecuta la retención con credenciales `service_role`
- THEN MUST eliminar documento y selfie mediante el mismo flujo seguro de Storage
- AND MUST conservar la fila mínima de auditoría con estado `rejected`

#### Scenario: Borrado de Storage falla
- GIVEN una solicitud elegible fue reclamada
- WHEN la API de Storage no confirma el borrado
- THEN MUST conservar las rutas en la base de datos
- AND MUST permitir un reintento seguro sin exponer rutas o credenciales en logs

#### Scenario: Cliente intenta ejecutar la retención
- GIVEN un usuario anónimo, autenticado o administrador AAL2
- WHEN invoca directamente las RPC de retención
- THEN el backend MUST denegar la operación
- AND MUST reservarla exclusivamente para `service_role`

### Requirement: Auditoria y trazabilidad
El sistema MUST dejar trazabilidad atómica de acciones administrativas sensibles.

#### Scenario: Registrar accion administrativa
- GIVEN un admin oculta, elimina o modifica estado de una publicacion
- WHEN la accion se completa
- THEN el sistema MUST registrar admin, entidad afectada, accion, razon y timestamp en la misma transacción
- AND MUST mostrar errores si no se pudo completar la accion

#### Scenario: La evidencia permanece inmutable
- GIVEN existe un evento de moderación registrado
- WHEN cualquier cliente intenta modificarlo o eliminarlo
- THEN el sistema MUST rechazar la operación
- AND MUST conservar el evento aunque la propiedad o el actor ya no existan

#### Scenario: Usuario no administrador consulta la bitácora
- GIVEN un usuario anónimo o autenticado sin rol admin
- WHEN consulta eventos de moderación
- THEN el sistema MUST devolver cero filas o denegar la operación de forma segura

#### Scenario: Admin consulta la bitácora
- GIVEN un administrador autorizado abre la sección Bitácora
- WHEN existen eventos de moderación
- THEN el sistema MUST mostrar acción, propiedad, actor, transición, motivo y fecha
- AND MUST manejar carga, error, vacío, filtros y paginación de forma aislada
- AND MUST conservar una presentación legible en móvil sin desplazamiento horizontal obligatorio

### Requirement: Métricas administrativas
El sistema MUST limitar las métricas operativas al administrador y representar cada proveedor de forma independiente.

#### Scenario: Admin consulta métricas
- GIVEN un usuario autenticado con rol `admin`
- WHEN abre la pestaña de métricas
- THEN el cliente MUST enviar su sesión al endpoint interno `/api/metrics`
- AND MUST mostrar carga mientras sincroniza
- AND MUST mostrar los valores disponibles sin convertir datos ausentes en mediciones reales

#### Scenario: Proveedor de métricas no configurado
- GIVEN Cloudflare, Google Analytics o Supabase no tiene credenciales operativas
- WHEN el endpoint devuelve un error parcial para ese proveedor
- THEN el panel MUST conservar las métricas locales disponibles
- AND MUST mostrar un estado vacío o no configurado solo en la tarjeta afectada
- AND MUST permitir reintentar la consulta

#### Scenario: Sesión administrativa inválida
- GIVEN la sesión del administrador expiró o el endpoint responde `401` o `403`
- WHEN se consultan las métricas
- THEN el panel MUST mostrar un error seguro
- AND MUST evitar mostrar métricas administrativas como si fueran válidas

#### Scenario: Google Analytics en tiempo real
- GIVEN la cuenta de servicio tiene rol `Lector` en la propiedad GA4
- WHEN el administrador consulta las métricas
- THEN el Worker MUST autenticar mediante OAuth de servidor a servidor
- AND MUST consultar `runRealtimeReport` con la métrica `activeUsers`
- AND MUST mantener la clave privada exclusivamente como secreto del servidor

### Requirement: Moderacion asistida por IA
El sistema MAY usar revision automatica para ayudar al admin sin reemplazar la decision humana en acciones destructivas.

#### Scenario: Analisis automatico de publicacion
- GIVEN existe una publicacion nueva o editada
- WHEN el sistema ejecuta moderacion automatica
- THEN SHOULD evaluar texto, imagenes y datos de contacto contra politicas configuradas
- AND SHOULD marcar riesgos para revision humana
- AND MUST evitar publicar decisiones irreversibles sin control humano cuando el riesgo sea ambiguo

#### Scenario: Worker aplica el resultado automático
- GIVEN el Worker completó un análisis válido
- WHEN actualiza el estado de moderación IA
- THEN MUST usar un RPC exclusivo de `service_role`
- AND MUST comprobar la respuesta remota antes de considerar la operación completada
- AND MUST registrar el evento como automatización sin aceptar un actor enviado por el cliente

#### Scenario: Admin espera una reevaluación
- GIVEN un admin solicita Reevaluar con IA para una publicación
- WHEN el Worker procesa la moderación en segundo plano
- THEN la tarjeta MUST mostrar el resultado nuevo sin recargar la página completa
- AND la interfaz MUST limitar la espera automática a la publicación reevaluada
- AND MUST informar si el resultado no llega dentro del tiempo de espera

### Requirement: Arquitectura modular del panel
El sistema MUST mantener cada capacidad administrativa aislada para que pueda evolucionar sin modificar las demás.

#### Scenario: La página coordina módulos administrativos
- GIVEN existen las secciones de propiedades, reportes y métricas
- WHEN se renderiza `AdminPage`
- THEN la página MUST limitarse al guard, encabezado, navegación y selección de sección
- AND MUST delegar datos, estados asíncronos, acciones y presentación a módulos independientes bajo `src/modules/admin`
- AND MUST conservar el lazy loading y los guards existentes de `/moderar`

#### Scenario: Una sección falla de forma aislada
- GIVEN una consulta de propiedades, reportes o métricas falla
- WHEN el módulo representa el error
- THEN MUST mostrar un estado seguro y permitir reintentar su propia consulta
- AND MUST evitar compartir estado de carga o error con otra sección administrativa

#### Scenario: La refactorización conserva el comportamiento
- GIVEN el panel anterior permite listar y moderar propiedades, gestionar reportes y consultar métricas
- WHEN las capacidades se extraen a módulos
- THEN MUST conservar las mismas acciones, confirmaciones, filtros, paginación y respuestas visibles
- AND MUST mantener tipos estrictos sin introducir `any`

### Requirement: Contexto operativo del anunciante
El sistema MUST ofrecer al administrador contexto mínimo y verificable sobre el anunciante sin exponer datos sensibles innecesarios.

#### Scenario: Admin abre el detalle de una propiedad
- GIVEN un administrador revisa una propiedad
- WHEN abre su detalle
- THEN el sistema MUST cargar bajo demanda la antigüedad de la cuenta, el resumen de publicaciones y los reportes asociados a sus anuncios
- AND MUST representar estados de carga, error y ausencia de datos sin bloquear el resto del detalle
- AND MUST evitar mostrar tokens, credenciales, metadatos de sesión o nuevos datos de contacto

#### Scenario: El anunciante presenta señales de riesgo
- GIVEN existen reportes pendientes, rechazos repetidos o una cuenta reciente
- WHEN el contexto se resume
- THEN el sistema MUST mostrar señales determinísticas y explicables
- AND MUST evitar decisiones automáticas irreversibles sobre el usuario o sus anuncios

#### Scenario: El contexto permanece modular
- GIVEN el contexto del anunciante es una capacidad administrativa independiente
- WHEN se integra en el detalle de propiedad
- THEN MUST vivir bajo `src/modules/admin/advertiser-context`
- AND MUST encapsular sus consultas, estado asíncrono, reglas derivadas y presentación
- AND MUST recibir únicamente el identificador del anunciante desde el módulo de propiedades

### Requirement: Navegación directa en listas administrativas
El sistema MUST permitir que el moderador abra directamente una página concreta
de resultados en las listas administrativas paginadas.

#### Scenario: Moderador navega una lista extensa
- GIVEN una sección administrativa contiene varias páginas de resultados
- WHEN el moderador consulta la paginación
- THEN MUST ver números de página y la página activa claramente identificada
- AND MUST poder saltar a un número de página directamente
- AND MUST conservar navegación anterior/siguiente y un control compacto para rangos largos
- AND MUST anunciar la navegación de forma accesible y adaptarse a pantallas estrechas
- AND MUST delegar la carga al módulo actual sin alterar sus filtros

### Requirement: Filtrado escalable de publicaciones
La lista de propiedades de moderación MUST aplicar los criterios de búsqueda en el servidor antes de paginar y MUST devolver el total que coincide con esos criterios.

#### Scenario: Moderador acota miles de publicaciones
- GIVEN un moderador consulta una lista administrativa extensa
- WHEN aplica texto de título/ubicación, operación, tipo de inmueble o fechas
- THEN el servidor MUST combinar los criterios con el estado seleccionado
- AND MUST devolver únicamente la página solicitada y el total coincidente
- AND MUST conservar criterios aplicados al cambiar de página
- AND la interfaz MUST permitir aplicar, limpiar y reconocer los filtros activos
- AND MUST validar que la fecha inicial no sea posterior a la fecha final
- AND la vista de coincidencias pHash MUST conservar su consulta especializada
