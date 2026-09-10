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
