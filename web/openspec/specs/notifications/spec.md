# Especificacion: Notificaciones dentro de Cubitat

## Abrir el destino de una notificacion

### Escenario: notificacion con destino interno

- **GIVEN** una persona autenticada tiene una notificacion con `action_path`
- **WHEN** pulsa la notificacion desde la campana
- **THEN** la notificacion se marca como leida
- **AND** Cubitat navega en la misma PWA al contenido o seccion que origino el aviso

### Escenario: notificacion antigua sin destino

- **GIVEN** una notificacion creada antes de incorporar `action_path`
- **WHEN** la persona pulsa la notificacion
- **THEN** la notificacion se marca como leida sin provocar una navegacion invalida

### Escenario: destino no seguro

- **GIVEN** una notificacion contiene una ruta externa, relativa o malformada
- **WHEN** la persona pulsa la notificacion
- **THEN** Cubitat rechaza la navegacion y no abandona su propio origen

## Destinos por tipo

- Las coincidencias de alertas de busqueda abren la propiedad coincidente.
- Los avisos de contacto abren la propiedad y su seccion de contacto.
- Los cambios de estado de una publicacion abren `Mis publicaciones`.

## Notificaciones push por dispositivo

### Escenario: aislamiento de cuenta y entregas en vuelo

- **GIVEN** A tiene una suscripcion y una entrega reclamada en un navegador compartido
- **WHEN** cierra sesion o entra B, incluso sin conectividad
- **THEN** se invalida primero el permiso local de mostrar avisos y se cancela la suscripcion
- **AND** el estado activo se confirma con el servidor para la cuenta actual
- **AND** un endpoint nunca cambia de propietario; B debe crear una suscripcion nueva
- **AND** cada envio y actualizacion requiere un lease vigente y propietarios coincidentes
- **AND** el service worker descarta avisos de un endpoint distinto o sin vinculacion local activa

### Escenario: activar push en un navegador compatible

- **GIVEN** una persona autenticada usa un navegador compatible
- **WHEN** pulsa `Activar notificaciones` y concede el permiso del sistema
- **THEN** Cubitat registra el service worker y una suscripcion push asociada a su cuenta
- **AND** la configuracion indica que las notificaciones estan activas en ese dispositivo

### Escenario: conservar el gesto de activacion en Android

- **GIVEN** Chrome Android exige que la suscripcion push nazca del toque de la persona
- **WHEN** la pantalla de cuenta prepara la clave VAPID y el service worker antes de mostrar la accion disponible
- **THEN** al conceder el permiso Cubitat solicita inmediatamente la suscripcion al navegador
- **AND** solo despues envia la suscripcion autenticada al servidor

### Escenario: recuperar la configuracion push

- **GIVEN** la clave VAPID y el service worker se prepararon correctamente
- **WHEN** falla la consulta de una suscripcion anterior
- **THEN** Cubitat conserva la preparacion y permite activar desde el siguiente toque
- **AND** si la preparacion misma falla, muestra una accion de reintento que nunca queda inerte

### Escenario: iPhone o iPad sin instalar

- **GIVEN** una persona abre Cubitat en iOS o iPadOS fuera del modo standalone
- **WHEN** consulta la configuracion de notificaciones
- **THEN** Cubitat explica que primero debe agregarse a la pantalla de inicio
- **AND** no solicita permiso antes de una accion explicita de la persona

### Escenario: permiso bloqueado

- **GIVEN** el sistema ha denegado el permiso de notificaciones
- **WHEN** la persona consulta la configuracion
- **THEN** Cubitat explica que debe habilitarlo desde los ajustes del dispositivo
- **AND** no vuelve a invocar automaticamente el dialogo del sistema

### Escenario: desactivar un dispositivo

- **GIVEN** la cuenta tiene push activo en el dispositivo actual
- **WHEN** pulsa `Desactivar`
- **THEN** Cubitat elimina la suscripcion del servidor y del navegador
- **AND** las suscripciones de otros dispositivos permanecen activas

### Escenario: entrega en segundo plano

- **GIVEN** una notificacion interna nueva tiene entregas push pendientes
- **WHEN** se ejecuta el despachador programado
- **THEN** el Worker envia una entrega independiente a cada dispositivo suscrito
- **AND** reintenta fallos temporales hasta tres veces
- **AND** elimina las suscripciones que el proveedor declara expiradas

### Escenario: tocar una notificacion push

- **GIVEN** el service worker muestra una notificacion con un `action_path` interno valido
- **WHEN** la persona toca la notificacion
- **THEN** Cubitat enfoca una ventana existente o abre una nueva en ese destino
- **AND** rechaza rutas externas, relativas o malformadas
