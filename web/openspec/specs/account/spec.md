# Proceso de Cuenta

## Purpose
Define la gestion de perfil, verificacion, alertas y navegacion del area privada del usuario.

## Requirements

### Requirement: Acceso al centro de cuenta
El sistema MUST proteger el centro de cuenta para usuarios autenticados.

#### Scenario: Abrir cuenta con sesion
- GIVEN un usuario autenticado
- WHEN abre `/mi-cuenta` o `/cuenta`
- THEN el sistema MUST renderizar el centro de cuenta
- AND MUST mostrar nombre, email, estado de verificacion y datos de contacto
- AND MUST mostrar navegacion hacia favoritos y mis publicaciones

#### Scenario: Abrir cuenta sin sesion
- GIVEN un usuario sin sesion
- WHEN abre `/mi-cuenta` o `/cuenta`
- THEN el sistema MUST abrir el modal de inicio de sesion
- AND despues de autenticarse MUST regresar a la ruta solicitada

### Requirement: Navegacion privada de cuenta
El sistema MUST conectar cuenta, favoritos, mis publicaciones y alertas sin perder sesion ni contexto.

#### Scenario: Navegar dentro del area privada
- GIVEN un usuario autenticado esta en cuenta
- WHEN selecciona favoritos, mis publicaciones o volver a cuenta
- THEN el sistema MUST cambiar de pantalla sin recargar toda la aplicacion
- AND MUST mantener datos de usuario disponibles
- AND MUST proteger cada destino si la sesion expira

### Requirement: Informacion de usuario
El sistema MUST permitir revisar y mantener datos basicos del perfil.

#### Scenario: Ver informacion del perfil
- GIVEN un usuario autenticado en su cuenta
- WHEN visualiza la seccion de informacion de usuario
- THEN el sistema MUST mostrar nombre completo y email de acceso
- AND el email de acceso MUST mostrarse como identificador no editable desde esta pantalla
- AND el sistema MUST indicar si cada dato esta verificado

### Requirement: Informacion de contacto
El sistema MUST permitir configurar datos usados para contactos de anuncios.

#### Scenario: Ver contacto
- GIVEN un usuario autenticado
- WHEN abre la seccion de contacto
- THEN el sistema MUST mostrar email de contacto y telefono o WhatsApp si existen
- AND MUST indicar estado verificado o no verificado
- AND MUST ofrecer accion de verificacion cuando falte telefono validado

#### Scenario: Contacto usado en publicaciones
- GIVEN un usuario tiene telefono o WhatsApp guardado en perfil
- WHEN abre publicar
- THEN el sistema SHOULD prellenar datos de contacto permitidos
- AND MUST permitir corregirlos para una publicacion especifica
- AND MUST normalizar telefono cubano cuando aplique

### Requirement: Alertas de busqueda guardadas
El sistema MUST listar y permitir eliminar alertas de busqueda creadas desde resultados.

#### Scenario: Ver alertas
- GIVEN un usuario tiene alertas guardadas
- WHEN abre el centro de cuenta
- THEN el sistema MUST listar cada alerta con resumen de filtros y fecha de creacion
- AND MUST indicar que el envio automatico por email esta pendiente si no esta activo

#### Scenario: Eliminar alerta
- GIVEN un usuario visualiza una alerta propia
- WHEN selecciona eliminar
- THEN el sistema MUST borrar la alerta asociada al usuario
- AND MUST actualizar la lista sin recargar toda la aplicacion

### Requirement: Sesion expirada en area privada
El sistema MUST manejar expiracion o cierre de sesion mientras el usuario navega areas privadas.

#### Scenario: Sesion expira
- GIVEN un usuario estaba autenticado en cuenta, favoritos o mis publicaciones
- WHEN la sesion deja de ser valida
- THEN el sistema MUST limpiar datos privados en memoria
- AND MUST abrir login o redirigir a inicio
- AND MUST evitar mostrar datos antiguos de otro usuario

### Requirement: Evidencias KYC de identidad
El sistema MUST exigir dos imágenes privadas para crear una solicitud KYC: un documento oficial de identidad y una foto de la persona sosteniendo ese mismo documento.

#### Scenario: Usuario prepara una solicitud KYC completa
- GIVEN un usuario autenticado sin una solicitud pendiente
- WHEN abre el formulario KYC
- THEN MUST poder seleccionar carnet de identidad o pasaporte
- AND MUST adjuntar una imagen del documento
- AND MUST adjuntar otra imagen donde aparezca sosteniendo el documento
- AND el envío MUST permanecer deshabilitado mientras falte cualquiera de las dos imágenes

#### Scenario: Almacenamiento de evidencias KYC
- GIVEN el usuario adjuntó ambas imágenes válidas
- WHEN envía la solicitud
- THEN cada archivo MUST almacenarse en el bucket privado bajo la carpeta del propietario
- AND la RPC MUST comprobar que las dos rutas son distintas y que ambos objetos existen
- AND un usuario distinto o anónimo MUST NOT leer las evidencias
- AND si falla el envío parcial, el cliente MUST intentar retirar los objetos huérfanos
