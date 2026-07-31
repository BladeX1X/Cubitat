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

#### Scenario: Mostrar acceso al panel de agente
- GIVEN un usuario autenticado está en el área privada
- WHEN su rol canónico en `profiles` es `agent`
- THEN la navegación MUST mostrar `Panel de Agente`
- AND para cualquier otro rol MUST NOT mostrar ese acceso

#### Scenario: Proteger la ruta directa del panel
- GIVEN un usuario autenticado abre `/panel-agente`
- WHEN su rol no es `agent` o su KYC no es `verified`
- THEN el sistema MUST denegar el panel
- AND MUST NOT cargar propiedades ni metricas privadas del agente

### Requirement: Aislamiento físico de Fase 2
El build productivo MUST excluir los módulos que solo existen en Fase 2 DEV.

#### Scenario: Compilar para producción
- GIVEN Fase 2 solo está habilitada en el servidor Vite DEV con Supabase local
- WHEN se genera el build productivo
- THEN MUST NOT incluir los chunks de panel o perfil público de agente
- AND MUST NOT incluir el repositorio ni la interfaz de moderación KYC
- AND el build MUST fallar si cualquiera de esos módulos vuelve a aparecer
- AND DEV MUST conservar las mismas rutas y capacidades para pruebas locales

### Requirement: Informacion de usuario
El sistema MUST permitir revisar y mantener datos basicos del perfil.

#### Scenario: Ver informacion del perfil
- GIVEN un usuario autenticado en su cuenta
- WHEN visualiza la seccion de informacion de usuario
- THEN el sistema MUST mostrar nombre completo y email de acceso
- AND el email de acceso MUST mostrarse como identificador no editable desde esta pantalla
- AND el sistema MUST indicar si cada dato esta verificado

### Requirement: Tipo de cuenta
El sistema MUST permitir que un perfil existente alterne entre anunciante particular y agente sin recargar la aplicacion.

#### Scenario: Cambiar de anunciante particular a agente
- GIVEN un usuario autenticado con perfil `buyer` y KYC `verified`
- WHEN selecciona `Agente / Inmobiliaria`
- THEN el sistema MUST actualizar solo el rol de su fila existente en `profiles` a `agent`
- AND MUST reflejar el nuevo tipo de cuenta inmediatamente
- AND MUST NOT requerir permiso `INSERT` sobre `profiles`
- AND MUST NOT duplicar el rol en `user_metadata`

#### Scenario: Bloquear agente sin KYC aprobado
- GIVEN un usuario autenticado con perfil `buyer`
- AND su KYC es `unverified`, `pending` o `rejected`
- WHEN intenta seleccionar `Agente / Inmobiliaria`
- THEN la interfaz MUST indicar que necesita una verificacion de identidad aprobada
- AND MUST NOT enviar el cambio de rol
- AND la base de datos MUST rechazar cualquier intento directo de asignar `agent`

#### Scenario: Perder la verificacion como agente
- GIVEN un perfil `agent` con KYC `verified`
- WHEN una operacion interna de KYC cambia su estado a `pending` o `rejected`
- THEN la base de datos MUST degradar el rol a `buyer` en la misma transaccion
- AND MUST mantener la invariante de que todo perfil `agent` tenga KYC `verified`

#### Scenario: Cambiar de agente a anunciante particular
- GIVEN un usuario autenticado con perfil `agent`
- WHEN selecciona `Anunciante Particular`
- THEN el sistema MUST actualizar solo el rol de su fila existente en `profiles` a `buyer`
- AND MUST reflejar el nuevo tipo de cuenta inmediatamente
- AND MUST conservar el bloqueo contra asignar o degradar el rol `admin`

#### Scenario: Proteger el rol administrativo
- GIVEN un usuario autenticado con perfil `admin`
- WHEN abre `/mi-cuenta`
- THEN el sistema MUST NOT mostrar el selector de tipo de cuenta
- AND MUST NOT permitir que la interfaz degrade el rol administrativo
- AND el selector MUST mostrarse unicamente cuando el rol resuelto sea `buyer` o `agent`
- AND el selector MUST estar disponible unicamente cuando Fase 2 este habilitada

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

### Requirement: Metricas de contacto del agente
El sistema MUST derivar las metricas del panel desde datos canonicos del backend.

#### Scenario: Registrar una accion real de contacto
- GIVEN una propiedad publicada
- WHEN un visitante abre la accion de telefono o WhatsApp
- THEN el sistema MUST registrar el canal mediante una RPC
- AND MUST incrementar el agregado persistente de la propiedad
- AND MUST deduplicar el mismo visitante, propiedad, canal y dia
- AND MUST NOT simular el contador en `localStorage`

#### Scenario: Consultar metricas del panel
- GIVEN un agente con KYC aprobado abre su panel
- WHEN carga sus propiedades
- THEN el sistema MUST mostrar los contadores persistidos por propiedad
- AND un buyer, un agente sin KYC o un tercero MUST NOT obtener ese panel

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
- THEN el cliente MUST convertir ambas evidencias localmente a WebP antes de subirlas
- AND MUST limitar el lado más largo a 1600 píxeles conservando la proporción
- AND si falla la conversión MUST NOT subir ningún objeto
- THEN cada archivo MUST almacenarse en el bucket privado bajo la carpeta del propietario
- AND la RPC MUST comprobar que las dos rutas son distintas y que ambos objetos existen
- AND un usuario distinto o anónimo MUST NOT leer las evidencias
- AND si falla el envío parcial, el cliente MUST intentar retirar los objetos huérfanos
