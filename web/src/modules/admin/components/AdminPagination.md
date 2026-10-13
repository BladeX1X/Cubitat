# AdminPagination

Componente compartido para navegar listas administrativas paginadas. Mantiene
la página actual y el total visibles, ofrece acceso directo a páginas numeradas,
resume saltos largos con puntos suspensivos y conserva los controles anterior y
siguiente. Los botones siguen los estilos y variantes del Button shadcn local.

Los índices del contrato (`page` y `onPageChange`) empiezan en cero. La
presentación muestra páginas empezando en uno. El componente oculta páginas que
no aportan navegación, deshabilita los extremos y adapta el pie a una columna en
pantallas estrechas.

La paginación sigue siendo responsabilidad de cada módulo: el paginador solo
notifica el nuevo índice, sin consultar datos ni alterar filtros.

## Verificación

`AdminPagination.test.tsx` cubre el acceso numérico, la página activa, la
elipsis en listas extensas, límites de anterior/siguiente y el estado de una
lista que cabe en una sola página.
