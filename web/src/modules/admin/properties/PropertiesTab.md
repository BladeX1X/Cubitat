# PropertiesTab

La pestaña `PropertiesTab` presenta la cola paginada de propiedades para moderación y delega la carga/acciones en `useModerationProperties`.

## Búsqueda y filtros

- Busca por texto en título o ubicación, operación, tipo de inmueble y fecha de publicación.
- Los controles editan un borrador; `Aplicar filtros` ejecuta la consulta y `Limpiar` elimina criterios aplicados y borrador.
- El repositorio combina criterios con el estado seleccionado y solicita solo la página actual a Supabase. El total exacto mostrado corresponde al resultado filtrado.
- La búsqueda textual se limita a 100 caracteres y elimina puntuación reservada por el filtro PostgREST.
- La vista `Coincidencias pHash` usa una RPC propia, por lo que no presenta los filtros generales.
- La UI emplea los componentes compartidos `Button`, `Input` y `Select`.

## Validación

La fecha inicial no puede superar la final. Los tests relacionados están en `PropertiesTab.test.tsx`, `propertiesRepository.filters.test.ts` y `useModerationProperties.test.tsx`.

## Escalabilidad

La paginación ocurre en la consulta del servidor; el navegador no descarga todos los anuncios. Las consultas de texto parcial (`ilike`) y el conteo exacto pueden requerir índices dedicados si el catálogo crece mucho más allá de miles de filas; medir antes de agregar una migración.
