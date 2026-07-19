# Autenticación (Auth)

## Purpose
Provee mecanismos de seguridad e inicio de sesión para los usuarios.

## Requirements

### Requirement: Registro de Usuario con Confirmación de Correo Obligatoria
El sistema MUST requerir verificación por correo electrónico para habilitar la cuenta del usuario antes de que este pueda interactuar plenamente (por ejemplo, publicar propiedades).

#### Scenario: Registro exitoso pendiente de confirmación
- GIVEN un usuario no autenticado en el formulario de registro
- WHEN introduce un correo válido, contraseña y hace clic en registrarse
- THEN el sistema MUST crear una cuenta en estado pendiente en Supabase Auth
- AND el sistema MUST enviar un correo con un enlace de verificación
- AND el sistema MUST mostrar una pantalla indicando que debe revisar su bandeja de entrada

### Requirement: Inicio de Sesión y Perfiles
El sistema MUST permitir el acceso seguro mediante credenciales de email y contraseña, asignando roles a través de una tabla de base de datos dedicada.

#### Scenario: Inicio de sesión exitoso con credenciales válidas
- GIVEN un usuario con cuenta activa y confirmada
- WHEN introduce su correo y contraseña correctos en el formulario de inicio de sesión
- THEN el sistema MUST validar las credenciales contra Supabase Auth
- AND el sistema MUST consultar la tabla `profiles` para obtener su rol asignado (ej. 'admin' o 'anunciante')
- AND el sistema MUST generar un token de sesión seguro, persistiendo la sesión si se seleccionó "Recordarme"
- AND el sistema MUST redirigir al usuario a su panel correspondiente

#### Scenario: Login despues de ruta protegida
- GIVEN un usuario anonimo intenta abrir una ruta protegida
- WHEN completa inicio de sesion correctamente
- THEN el sistema MUST cerrar el modal de autenticacion
- AND MUST regresar a la ruta protegida solicitada originalmente
- AND MUST inicializar la pantalla de destino con el usuario autenticado

#### Scenario: Retorno seguro despues de Google OAuth
- GIVEN un usuario inicia Google OAuth desde una ruta interna de Cubitat
- WHEN el proveedor devuelve una sesion valida al callback
- THEN el sistema MUST regresar una sola vez a la ruta interna original
- AND MUST rechazar destinos externos, rutas de autenticacion y destinos expirados
- AND MUST eliminar el destino temporal si OAuth no puede iniciarse

#### Scenario: Intento de inicio de sesión con credenciales inválidas o correo no confirmado
- GIVEN un usuario que intenta ingresar credenciales incorrectas o su correo no ha sido verificado
- WHEN envía el formulario de inicio de sesión
- THEN el sistema MUST denegar el acceso
- AND el sistema MUST mostrar el mensaje "Correo electrónico o contraseña incorrectos" o "Por favor, confirma tu correo electrónico para continuar"

### Requirement: Proteccion contra fuerza bruta
El sistema MUST limitar intentos repetidos de autenticacion y recuperacion para reducir abuso automatizado.

#### Scenario: Demasiados intentos de login por IP
- GIVEN una misma IP realiza multiples intentos de login por contrasena en una ventana corta
- WHEN supera el limite configurado
- THEN el Worker MUST responder con `429`
- AND MUST incluir `Retry-After`
- AND MUST evitar reenviar el intento a Supabase Auth

#### Scenario: Demasiados intentos de login por email
- GIVEN multiples intentos de login apuntan al mismo email normalizado
- WHEN superan el limite configurado por email
- THEN el Worker MUST bloquear temporalmente nuevos intentos para ese email
- AND MUST almacenar el identificador como hash, no como email en texto claro
- AND MUST devolver un mensaje generico sin confirmar si la cuenta existe

#### Scenario: Limitar recuperacion y reenvios
- GIVEN una IP o email solicita repetidamente recuperacion, OTP o reenvio de confirmacion
- WHEN supera el limite configurado
- THEN el Worker MUST responder con `429` o respuesta segura equivalente segun el endpoint
- AND MUST reducir riesgo de enumeracion y spam de correo

### Requirement: Roles y permisos de sesion
El sistema MUST resolver permisos desde la sesion y el perfil del usuario sin confiar en datos manipulables del cliente.

#### Scenario: Cargar rol de usuario autenticado
- GIVEN existe una sesion activa
- WHEN la aplicacion inicia
- THEN el sistema MUST consultar el perfil del usuario
- AND MUST exponer el rol solo para decisiones de interfaz
- AND toda accion sensible MUST validarse nuevamente en backend, base de datos o Worker

#### Scenario: Usuario sin rol intenta accion admin
- GIVEN un usuario autenticado sin rol `admin`
- WHEN intenta acceder a una accion de moderacion o administracion
- THEN el sistema MUST bloquear o redirigir la accion
- AND MUST evitar mostrar datos internos de usuarios, reportes o publicaciones no autorizadas

### Requirement: Segundo factor para administracion
El sistema MUST exigir TOTP verificado y una sesion `aal2` antes de abrir funciones administrativas.

#### Scenario: Administrador sin segundo factor
- GIVEN un usuario con rol administrador y una sesion `aal1`
- WHEN intenta abrir el panel administrativo
- THEN MUST completar enrolamiento o desafio TOTP antes de ver datos administrativos
- AND el cliente MUST NOT persistir ni registrar QR, secreto o codigo TOTP

#### Scenario: Usuario normal
- GIVEN un usuario autenticado sin rol administrador
- WHEN usa funciones propias de su cuenta
- THEN el sistema MUST NOT exigir MFA administrativo

### Requirement: Modal de autenticacion reutilizable
El sistema MUST usar el mismo flujo de login para acciones protegidas en cualquier modulo.

#### Scenario: Accion protegida abre login
- GIVEN un usuario anonimo pulsa publicar, favorito, cuenta, mis publicaciones o crear alerta
- WHEN la accion requiere autenticacion
- THEN el sistema MUST abrir el modal de login
- AND MUST conservar la intencion del usuario cuando sea recuperable
- AND MUST mostrar mensajes claros si la accion no puede completarse despues del login

### Requirement: Recuperación de Acceso y Cierre de Sesión
El sistema MUST proveer flujos seguros para recuperar contraseñas olvidadas e invalidar tokens de sesión al salir.

#### Scenario: Cierre de sesión (Logout)
- GIVEN un usuario autenticado en cualquier pantalla
- WHEN el usuario hace clic en "Cerrar sesión"
- THEN el sistema MUST invalidar el token de autenticación en Supabase Auth
- AND el sistema MUST limpiar el estado de sesión local
- AND el sistema MUST limpiar la cache offline que pueda conservar datos de la sesion anterior
- AND MUST eliminar cualquier borrador legado no asociado a un usuario
- AND el sistema MUST redirigir a la página de inicio (/)

#### Scenario: Recuperación de contraseña
- GIVEN un usuario que olvidó su contraseña
- WHEN introduce su correo en el flujo de recuperación
- THEN el sistema MUST enviar un enlace de recuperación con validez temporal de 15 minutos
- AND el usuario podrá establecer una nueva contraseña segura al hacer clic en dicho enlace

#### Scenario: Confirmacion de correo desde enlace
- GIVEN un usuario recibe el correo de verificacion de Supabase
- WHEN abre el enlace de confirmacion
- THEN el sistema MUST aterrizar en `/auth/callback`
- AND el sistema MUST intercambiar el codigo por una sesion cuando Supabase incluya `code`
- AND el sistema MUST mostrar confirmacion visual antes de continuar al inicio

#### Scenario: Cambio de contrasena desde enlace de recuperacion
- GIVEN un usuario abre el enlace de recuperacion enviado por Supabase
- WHEN aterriza en `/recuperar-contrasena`
- THEN el sistema MUST preparar la sesion temporal de recuperacion
- AND el sistema MUST pedir nueva contrasena y confirmacion
- AND el sistema MUST validar la fortaleza de la contraseña (mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial) y la coincidencia entre ambos campos
- AND el sistema MUST guardar la nueva contrasena mediante Supabase Auth

### Requirement: Autenticación Social (Google OAuth)
El sistema MUST permitir el registro e inicio de sesión rápido utilizando proveedores de identidad social de confianza.

#### Scenario: Inicio de sesión o registro con Google exitoso
- GIVEN un usuario en el modal de inicio de sesión
- WHEN hace clic en el botón "Continuar con Google"
- THEN el sistema MUST redirigir al proveedor OAuth configurado en Supabase
- AND tras la autenticación exitosa, el sistema MUST crear o sincronizar automáticamente el perfil del usuario en la tabla `profiles` con el rol `user` por defecto
- AND el sistema MUST redirigir al usuario al `/auth/callback` para establecer la sesión y finalmente llevarlo a su panel.

#### Scenario: Google solicita elegir la cuenta
- GIVEN un usuario con una o varias sesiones de Google disponibles en el navegador
- WHEN inicia el flujo mediante el boton de Google
- THEN el sistema MUST solicitar al proveedor que muestre el selector de cuenta
- AND MUST evitar elegir silenciosamente la unica cuenta abierta en el dispositivo

### Requirement: Resiliencia de Red y Sesiones (Offline & Refresh)
El sistema MUST reaccionar adecuadamente ante la pérdida de conectividad y expirar/renovar tokens de forma transparente.

#### Scenario: Intento de inicio de sesión sin conexión a Internet (Offline)
- GIVEN un usuario sin conexión de red activa (estado offline en el navegador)
- WHEN intenta enviar el formulario de inicio de sesión o usar Google OAuth
- THEN el sistema MUST evitar el envío de peticiones a la red
- AND el sistema MUST mostrar un mensaje de advertencia visual indicando: "Para iniciar sesión necesitas una conexión a Internet activa"

#### Scenario: Refresco automático y rotación de tokens (Token Rotation)
- GIVEN un usuario autenticado cuya sesión está cerca de expirar
- WHEN la aplicación realiza peticiones o está activa en segundo plano
- THEN el sistema MUST renovar de manera silenciosa el token de sesión (Access Token) mediante el Refresh Token usando `onAuthStateChange`
- AND si el token de refresco ha sido invalidado o expirado, el sistema MUST cerrar la sesión local de forma segura y redirigir al usuario al inicio (`/`) con una notificación visual no invasiva de "Sesión expirada"

