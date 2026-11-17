# Navegacion y Rutas

## Purpose
Define el comportamiento de rutas, deep links y navegacion protegida.

## Requirements

### Requirement: Marca visible del encabezado
El sistema MUST mostrar el logotipo horizontal de tuGao como identidad visual del encabezado público y en tamaños adaptables a escritorio y móvil.
AND MUST conservar el nombre Cubitat en títulos del producto, rutas y navegación.

### Requirement: Rutas principales
El sistema MUST resolver rutas principales desde carga directa y navegacion interna.

#### Scenario: Abrir ruta directa
- GIVEN un usuario abre una URL directa
- WHEN la ruta corresponde a home, resultados, detalle, publicar, cuenta, favoritos o mis publicaciones
- THEN el sistema MUST inicializar la pantalla correcta
- AND MUST restaurar estado desde path, query string o slug cuando aplique

#### Scenario: Navegacion desde menu movil
- GIVEN un usuario usa el menu movil
- WHEN selecciona Inicio, Favoritos, Publicar, Cuenta, Mis publicaciones o Moderar
- THEN el sistema MUST navegar a la pantalla correspondiente
- AND MUST aplicar el flujo de ruta protegida cuando la opcion requiera sesion
- AND MUST cerrar menus o paneles abiertos para evitar solapamientos

#### Scenario: Operaciones desde el encabezado
- GIVEN un usuario navega desde el encabezado en escritorio o abre las operaciones del menu movil
- WHEN selecciona Comprar, Rentar o Permutar
- THEN el sistema MUST abrir resultados con la operacion venta, alquiler o permuta correspondiente
- AND la accion separada `Publicar gratis` MUST continuar disponible para crear anuncios

#### Scenario: Navegacion en ventanas medianas
- GIVEN el viewport tiene entre 621 y 1180 px de ancho
- WHEN el encabezado cambia a su distribucion compacta
- THEN MUST mantener visibles y utilizables los enlaces principales en una fila propia
- AND MUST permitir desplazamiento horizontal de esa fila si no caben todas las opciones
- AND MUST conservar la marca y las acciones de cuenta y publicacion en la fila superior

#### Scenario: Descubrir la instalacion de la PWA
- GIVEN un usuario navega Cubitat desde el navegador del telefono
- WHEN abre el menu movil y selecciona `Instalar Cubitat`
- THEN el sistema MUST cerrar el menu y mostrar una accion o guia de instalacion
- AND MUST usar el instalador nativo cuando `beforeinstallprompt` este disponible
- AND MUST mostrar instrucciones manuales en iOS o cuando el navegador no exponga el instalador
- AND en iOS MUST identificar la opcion como `Como instalar Cubitat`, explicar los pasos de Safari y no simular una instalacion automatica
- AND MUST detectar iPadOS aunque Safari use un identificador de escritorio
- AND MUST ocultar la opcion cuando Cubitat ya se ejecute en modo PWA
- AND MUST permitir abrir esta guia aunque el aviso automatico se haya descartado antes
- AND el aviso automatico MUST volver a ofrecerse 7 dias despues de seleccionar `Quizas luego`

#### Scenario: Menu movil abierto sobre cualquier pagina
- GIVEN un usuario abre el menu movil desde inicio, resultados o detalle
- WHEN el panel ocupa el viewport disponible
- THEN el sistema MUST bloquear el desplazamiento del contenido de fondo
- AND MUST ocultar la navegacion inferior y las acciones flotantes de la pagina
- AND MUST mantener accesibles mediante scroll las opciones de explorar inmuebles
- AND MUST mostrar los accesos habilitados de Servicios y Materiales al inicio del panel, antes de las opciones de cuenta
- AND SHOULD mostrar completas las acciones de explorar en el viewport inicial de un telefono comun

#### Scenario: Acceso directo móvil a Servicios y Materiales
- GIVEN los catálogos están habilitados y el viewport tiene hasta 620 px
- WHEN se muestra el encabezado móvil
- THEN MUST mostrar botones directos «Servicios» y «Materiales» debajo de la marca sin abrir el menú
- AND cada botón MUST navegar al catálogo correspondiente

#### Scenario: Postulación de agente disponible desde Mi cuenta
- GIVEN la interfaz de Fase 3 está habilitada
- WHEN se renderiza la navegación pública o se abre el menú móvil
- THEN MUST NOT mostrar «Ser agente» como opción de navegación
- AND la acción para postularse MUST estar disponible dentro de Mi cuenta según el estado de la postulación

### Requirement: Alias de cuenta
El sistema MUST aceptar alias publicos razonables para cuenta.

#### Scenario: Abrir `/cuenta`
- GIVEN un usuario abre `/cuenta`
- WHEN esta autenticado
- THEN el sistema MUST mostrar la misma pantalla que `/mi-cuenta`
- AND si no esta autenticado MUST aplicar el flujo protegido de login

### Requirement: Rutas protegidas con retorno
El sistema MUST recordar la ruta protegida solicitada antes de autenticar.

#### Scenario: Login requerido con retorno
- GIVEN un usuario anonimo abre `/publicar`, `/favoritos`, `/mi-cuenta`, `/mis-propiedades`, `/editar/:id` o `/moderar`
- WHEN completa inicio de sesion exitoso
- THEN el sistema MUST regresar a la ruta protegida original
- AND MUST cerrar el modal de login
- AND MUST inicializar el estado de la pantalla de destino

#### Scenario: Ruta protegida no autorizada por rol
- GIVEN un usuario autenticado sin permisos abre una ruta de admin
- WHEN la aplicacion resuelve la pantalla
- THEN el sistema MUST impedir la carga de datos sensibles
- AND MUST mostrar estado seguro, redirigir o pedir permisos adecuados

### Requirement: Detalle con slug SEO
El sistema MUST permitir URLs de detalle legibles y extraer el identificador real.

#### Scenario: Abrir detalle con slug
- GIVEN una URL `/propiedad/:slug-uuid`
- WHEN la aplicacion inicia
- THEN el sistema MUST extraer el UUID final
- AND MUST seleccionar la propiedad correspondiente
- AND si no existe MUST mostrar estado de error o no encontrado

### Requirement: Retorno desde detalle a resultados
El sistema MUST permitir volver a resultados conservando filtros activos cuando el usuario navega desde una tarjeta.

#### Scenario: Volver a resultados
- GIVEN un usuario abre una propiedad desde resultados
- WHEN pulsa volver
- THEN el sistema MUST regresar a `/resultados` con los filtros activos
- AND MUST limpiar la propiedad seleccionada
- AND SHOULD restaurar posicion aproximada cuando sea viable
