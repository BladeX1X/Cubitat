# Filtros escalables de publicaciones en moderación

## Objetivo
Permitir que moderadores encuentren anuncios dentro de catálogos de miles de filas sin cargar todo el catálogo en el navegador.

## Cambio
Agregar filtros por título/ubicación, operación, tipo de inmueble y fecha de publicación. Aplicar selecciones inmediatamente; actualizar la búsqueda de texto tras 350 ms sin nuevas pulsaciones. Los criterios se consultan del lado del servidor antes de limitar la consulta a la página actual y el total refleja las coincidencias.

## Límites
No cambia el esquema de la base, permisos, acciones de moderación ni la consulta especializada de coincidencias pHash. No implica despliegue productivo.

## Criterio de aceptación
Cada filtro se combina con estado y paginación, las páginas conservan el criterio, los controles se pueden limpiar y el total representa el resultado filtrado.
