### Requirement: Filtrado escalable de publicaciones
La lista de propiedades de moderación MUST aplicar los criterios de búsqueda en el servidor antes de paginar y MUST devolver el total que coincide con esos criterios.

#### Scenario: Moderador acota miles de publicaciones
- GIVEN un moderador consulta una lista administrativa extensa
- WHEN aplica texto de título/ubicación, operación, tipo de inmueble o fechas
- THEN el servidor MUST combinar los criterios con el estado seleccionado
- AND MUST devolver únicamente la página solicitada y el total coincidente
- AND MUST conservar criterios aplicados al cambiar de página
- AND la interfaz MUST permitir cambiar, limpiar y reconocer los filtros activos
- AND MUST aplicar selección de operación, tipo y fechas inmediatamente
- AND MUST aplicar búsqueda textual tras una pausa breve al escribir, sin consultar por cada tecla
- AND MUST validar que la fecha inicial no sea posterior a la fecha final
- AND MUST evitar consultas automáticas cuando el rango de fechas sea inválido
- AND la vista de coincidencias pHash MUST conservar su consulta especializada
