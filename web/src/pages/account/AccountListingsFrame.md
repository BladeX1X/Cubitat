# AccountListingsFrame

## Responsabilidad

Comparte el marco visual de gestión de publicaciones usado por las pantallas de
Cuenta: encabezado destacado, panel de contenido, contador, botón de creación,
filtros accesibles con conteos y área de estados/listado.

## Reglas

- Servicios y Materiales conservan sus propios datos, estados, tarjetas y
  restricciones de edición.
- Las etiquetas de filtro reflejan el conteo del estado y deshabilitan estados
  vacíos, salvo el filtro general.
- El listado se adapta a una, dos o tres columnas según el ancho disponible.
- La navegación de escritorio y móvil sigue siendo responsabilidad de
  `AccountLayout`.

## Verificación

`MyServiceProfilesPage.test.tsx` y `MyMaterialListingsPage.test.tsx` comprueban
el uso del marco, los conteos, la creación y el filtrado por estado.
