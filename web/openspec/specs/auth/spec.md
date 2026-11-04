# Autenticación (Auth)

## Purpose
Provee mecanismos de seguridad e inicio de sesión para los usuarios.

## Requirements

### Requirement: Rotacion coordinada del secreto Turnstile
La operacion de rotacion MUST sincronizar el secreto nuevo del widget compartido
con el Worker verificador y con Auth de Supabase DEV y produccion.

#### Scenario: Rotar el secreto compartido
- GIVEN una persona operadora ya autenticada en Wrangler y con un token Supabase
  autorizado para actualizar Auth en ambos proyectos
- WHEN ejecuta el script de rotacion e introduce el secreto nuevo en el prompt
  oculto
- THEN MUST actualizar `TURNSTILE_SECRET_KEY` en `turnstile-siteverify-cubitat`
- AND MUST establecer CAPTCHA habilitado, proveedor `turnstile` y el secreto
  nuevo en Auth de DEV `bknwerqbbysveehcdmzr` y produccion
  `tohjzoncoosvjbjcakdl`
- AND MUST NOT aceptar el secreto como argumento, registrarlo o persistirlo en
  archivos
- AND MUST informar por destino si la sincronizacion fue parcial sin revelar
  credenciales ni cuerpos de respuesta del proveedor
- AND una ejecucion parcial MUST poder reintentarse con el mismo secreto nuevo

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
- THEN `AuthCallbackPage` MUST ser el unico responsable de intercambiar el codigo PKCE
- AND el cliente Supabase MUST NOT intercambiar automaticamente el mismo codigo desde la URL
- AND el sistema MUST regresar una sola vez a la ruta interna original
- AND MUST rechazar destinos externos, rutas de autenticacion y destinos expirados
- AND MUST eliminar el destino temporal si OAuth no puede iniciarse

#### Scenario: Recuperación de contraseña con token portable
- GIVEN un usuario abre el enlace de recuperación en cualquier navegador o dispositivo
- WHEN el enlace contiene `token_hash` y `type=recovery`
- THEN el cliente Auth único MUST verificar el token con `verifyOtp`
- AND MUST guardar la sesión resultante en el almacenamiento compartido de Auth
- AND el formulario solo se habilita si esa misma sesión es válida
- AND OAuth conserva PKCE y el intercambio del callback sigue siendo manual
- AND la inicialización de la app MUST NOT crear un segundo cliente Auth con la misma `storageKey`

#### Scenario: Intento de inicio de sesión con credenciales inválidas o correo no confirmado
- GIVEN un usuario que intenta ingresar credenciales incorrectas o su correo no ha sido verificado
- WHEN envía el formulario de inicio de sesión
- THEN el sistema MUST denegar el acceso
- AND el sistema MUST mostrar el mensaje "Correo electrónico o contraseña incorrectos" o "Por favor, confirma tu correo electrónico para continuar"

### Requirement: Proteccion contra fuerza bruta
El sistema MUST limitar intentos repetidos de autenticacion y recuperacion para reducir abuso automatizado.

#### Scenario: Politica de contrasena coherente en cliente y servidor
- GIVEN un usuario registra una cuenta o cambia su contrasena
- WHEN envia una nueva clave
- THEN el cliente y Supabase Auth MUST exigir al menos 8 caracteres
- AND MUST exigir mayuscula, minuscula, numero y simbolo
- AND la validacion de registro y recuperacion MUST usar una unica politica compartida
- AND Supabase Auth MUST rechazar la clave aunque se evada la validacion del navegador

#### Scenario: Frecuencia minima de correos Auth
- GIVEN una cuenta solicita confirmacion, recuperacion u otro correo Auth
- WHEN intenta repetir el envio antes de 1 minuto
- THEN Supabase Auth MUST aplicar la frecuencia minima configurada
- AND el Worker MUST conservar sus limites adicionales por IP y hash del correo

#### Scenario: CAPTCHA unido a registro y recuperacion
- GIVEN un usuario completa Turnstile para registrarse o recuperar su contrasena
- WHEN el frontend invoca Supabase Auth
- THEN MUST incluir el token como `captchaToken` en esa misma operacion Auth
- AND MUST NOT consumir el token previamente mediante una verificacion separada
- AND un token ausente, invalido, reutilizado o expirado MUST impedir que Supabase Auth procese la solicitud
- AND tras un fallo el widget MUST renovarse para impedir la reutilizacion del token consumido

#### Scenario: CAPTCHA unido a login con contrasena
- GIVEN un usuario no autenticado introduce correo y contrasena
- WHEN intenta iniciar sesion mediante Supabase Auth
- THEN MUST completar Turnstile antes de enviar credenciales
- AND MUST incluir el token como `captchaToken` dentro de `signInWithPassword`
- AND si falta el token MUST mostrar una solicitud de verificacion sin llamar a Supabase Auth

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

#### Scenario: Reenvío de confirmación protegido sin enumerar cuentas
- GIVEN una persona solicita reenviar la confirmación de correo
- WHEN envía el formulario
- THEN el cliente MUST pedir un token Turnstile nuevo con la acción `resend-confirmation`
- AND el Worker MUST limitar a 5 solicitudes por IP cada 10 minutos y 3 por hash SHA-256 del correo cada hora
- AND el Worker MUST validar el token en Turnstile para cuentas ya confirmadas, y Supabase Auth MUST validarlo para cuentas pendientes
- AND el token MUST ser menor o igual a 2048 caracteres y no MUST registrarse
- AND para cuentas pendientes, si Supabase Auth rechaza explícitamente el token como `captcha_failed`, el Worker MUST liberar de forma idempotente la reserva de cuota por correo
- AND solicitudes denegadas por exceder el cupo MUST NOT seguir incrementando el contador durante esa ventana
- AND tras cualquier respuesta del endpoint el widget MUST renovarse
- AND el endpoint MUST devolver la misma respuesta genérica para dirección desconocida, cuenta confirmada, fallos de entrega y caída del verificador
- AND los logs MUST excluir correo, token, claves e identificadores de cuenta

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

La única excepción temporal MUST estar activada por una migración explícita con
fecha de expiración en la base. La excepción MUST aplicar solo a perfiles admin,
exponer su vencimiento al panel y dejar de funcionar automáticamente al expirar,
sin eliminar ni desverificar factores TOTP.

#### Scenario: Administrador sin segundo factor
- GIVEN un usuario con rol administrador y una sesion `aal1`
- WHEN intenta abrir el panel administrativo
- THEN MUST completar enrolamiento o desafio TOTP antes de ver datos administrativos
- AND el cliente MUST NOT persistir ni registrar QR, secreto o codigo TOTP

#### Scenario: Excepción temporal de producción
- GIVEN existe un override de MFA administrativo con vencimiento futuro
- WHEN un administrador accede al panel con sesión `aal1`
- THEN el panel y las operaciones administrativas permiten acceso solo mientras el override siga vigente
- AND el panel informa la fecha de vencimiento
- AND la base y el Worker MUST comprobar el mismo vencimiento en cada operación sensible
- AND tras la expiración MUST volver a exigir AAL2 sin depender de una nueva publicación
- AND el factor TOTP de la cuenta MUST permanecer inscrito y verificado
- AND una sesión `aal1` de usuario no administrador MUST continuar bloqueada

#### Scenario: Usuario normal
- GIVEN un usuario autenticado sin rol administrador
- WHEN usa funciones propias de su cuenta
- THEN el sistema MUST NOT exigir MFA administrativo

#### Scenario: Sesión expirada durante el desafío administrativo
- GIVEN un administrador intenta verificar TOTP y Supabase responde que la sesión ya no existe
- WHEN la interfaz muestra el estado de sesión expirada
- THEN MUST ocultar el formulario TOTP que ya no puede completar la verificación
- AND MUST ofrecer la acción "Cerrar sesión e iniciar nuevamente"
- AND al confirmar MUST limpiar la sesión y la caché local mediante el flujo central de cierre
- AND MUST regresar al inicio y abrir el login sin mostrar datos administrativos
- AND si la recuperación falla MUST conservar el panel bloqueado y mostrar un error seguro

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
- AND el sistema MUST confirmar el correo con `token_hash` y `type=signup` cuando el enlace use el formato portable
- AND el sistema MUST intercambiar el codigo por una sesion cuando Supabase incluya `code` por compatibilidad
- AND el sistema MUST mostrar confirmacion visual antes de continuar al inicio
- AND el sistema MUST mostrar un error seguro en espanol si Supabase devuelve un fallo tecnico de PKCE, OTP o token

#### Scenario: Cambio de contrasena desde enlace de recuperacion
- GIVEN un usuario abre el enlace de recuperacion enviado por Supabase
- WHEN aterriza en `/recuperar-contrasena`
- THEN el sistema MUST preparar la sesion temporal de recuperacion
- AND el sistema MUST pedir nueva contrasena y confirmacion
- AND si la cuenta tiene MFA activo y Supabase requiere `aal2`, el sistema MUST pedir el codigo TOTP antes de guardar
- AND el sistema MUST validar la fortaleza de la contraseña (mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial) y la coincidencia entre ambos campos
- AND el sistema MUST guardar la nueva contrasena mediante Supabase Auth
- AND el sistema MUST mostrar un mensaje seguro en espanol en vez del error tecnico `AAL2 session is required`

#### Scenario: Contraseña conocida en filtraciones
- GIVEN un usuario intenta registrarse o establecer una nueva contraseña
- WHEN la contraseña aparece en el corpus de Pwned Passwords
- THEN el Worker MUST rechazar la operación antes de enviarla a Supabase Auth
- AND MUST consultar el corpus mediante k-anonimato enviando solo los primeros 5 caracteres del SHA-1
- AND MUST NOT registrar, persistir ni enviar la contraseña o su hash completo
- AND si el corpus no está disponible MUST conservar la política fuerte configurada en Supabase sin revelar datos sensibles

### Requirement: Autenticación Social (Google OAuth)
El sistema MUST permitir el registro e inicio de sesión rápido utilizando proveedores de identidad social de confianza.

#### Scenario: Inicio de sesión o registro con Google exitoso
- GIVEN un usuario en el modal de inicio de sesión
- WHEN hace clic en el botón "Continuar con Google"
- THEN el sistema MUST redirigir al proveedor OAuth configurado en Supabase
- AND tras la autenticación exitosa, el sistema MUST crear o sincronizar automáticamente el perfil del usuario en la tabla `profiles` con el rol `buyer` por defecto
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

#### Scenario: Controles de sesión disponibles en el plan actual
- GIVEN Cubitat opera con el plan Free de Supabase
- WHEN se revisa la configuración de sesiones
- THEN el JWT MUST conservar una expiración de 1 hora
- AND la rotación de refresh tokens MUST permanecer habilitada con intervalo de reutilización de 10 segundos
- AND los timeouts por duración o inactividad MUST quedar documentados como bloqueo de plan, no simulados como una garantía de servidor

### Requirement: Observabilidad segura de autenticación
El Worker MUST conservar diagnósticos operativos sin persistir datos de autenticación ni identificadores de usuario.

#### Scenario: Registro estructurado de un fallo de proveedor
- GIVEN un proveedor externo devuelve un error durante un flujo de autenticación
- WHEN el Worker registra el incidente
- THEN MUST emitir un evento estructurado con un nombre y campos previamente permitidos
- AND MUST NOT registrar correos, URLs, parámetros de consulta, tokens, identificadores, cuerpos de respuesta ni objetos de error crudos

#### Scenario: Solicitud de autenticación procesada por el Worker
- GIVEN una solicitud atraviesa una ruta de autenticación o callback
- WHEN Cloudflare genera telemetría del Worker
- THEN los logs automáticos de invocación MUST permanecer deshabilitados
- AND los eventos propios seguros MUST permanecer disponibles para diagnóstico

