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

