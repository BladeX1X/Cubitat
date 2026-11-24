# PropertiesTab

La pestaña `PropertiesTab` presenta la cola paginada de propiedades para moderación y delega la carga/acciones en `useModerationProperties`.

## Búsqueda y filtros

- Busca por texto en título o ubicación, operación, tipo de inmueble y fecha de publicación.
- Operación, tipo y fechas ejecutan la consulta en cuanto se seleccionan. La búsqueda textual espera 350 ms desde la última tecla; `Limpiar` elimina criterios aplicados y borrador.
- El repositorio combina criterios con el estado seleccionado y solicita solo la página actual a Supabase. El total exacto mostrado corresponde al resultado filtrado.
- La búsqueda textual se limita a 100 caracteres y elimina puntuación reservada por el filtro PostgREST.
- La vista `Coincidencias pHash` usa una RPC propia, por lo que no presenta los filtros generales.
- La UI emplea los componentes compartidos `Button`, `Input` y `Select`.
- La consulta general no lee `properties.contact_info`. El repositorio obtiene
  los datos privados de contacto mediante `get_admin_property_contact_details`
  para los IDs de la página. Si falla una consulta complementaria de anunciante,
  contacto o señales de duplicados, las propiedades siguen visibles y se muestra
  un aviso; los fallos se registran sin datos personales.

## Validación

La fecha inicial no puede superar la final; con rango inválido no se envía la consulta y se mantiene visible el aviso. Los tests relacionados están en `PropertiesTab.test.tsx`, `propertiesRepository.filters.test.ts` y `useModerationProperties.test.tsx`.

## Escalabilidad

La paginación ocurre en la consulta del servidor; el navegador no descarga todos los anuncios. Las consultas de texto parcial (`ilike`) y el conteo exacto pueden requerir índices dedicados si el catálogo crece mucho más allá de miles de filas; medir antes de agregar una migración.
