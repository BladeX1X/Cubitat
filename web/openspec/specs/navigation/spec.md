# Navegacion y Rutas

## Purpose
Define el comportamiento de rutas, deep links y navegacion protegida.

## Requirements

### Requirement: Rutas principales
El sistema MUST resolver rutas principales desde carga directa y navegacion interna.

#### Scenario: Abrir ruta directa
- GIVEN un usuario abre una URL directa
- WHEN la ruta corresponde a home, resultados, detalle, publicar, cuenta, favoritos o mis publicaciones
- THEN el sistema MUST inicializar la pantalla correcta
- AND MUST restaurar estado desde path, query string o slug cuando aplique

#### Scenario: Navegacion desde menu movil
- GIVEN un usuario usa el menu movil
- WHEN selecciona Inicio, Favoritos, Vender, Cuenta, Mis publicaciones o Moderar
- THEN el sistema MUST navegar a la pantalla correspondiente
- AND MUST aplicar el flujo de ruta protegida cuando la opcion requiera sesion
- AND MUST cerrar menus o paneles abiertos para evitar solapamientos

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
