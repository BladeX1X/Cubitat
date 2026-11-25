# MarketplaceListingDetail

## Responsabilidad

Provee una estructura de detalle compartida entre Servicios y Materiales para
reutilizar navegación, compartir, guardar, galería y distribución adaptable.
Cada página inyecta sus datos y secciones específicas para evitar presentar los
campos de una categoría como si fueran de otra.

## Diseño

- Barra superior con regreso, compartir y acción de favorito.
- Breadcrumb y hero en dos columnas: datos del anuncio y galería original con
  controles accesibles cuando hay más de una foto.
- La galería del hero incluye Fotos y Mapa. Abren un visor modal compartido:
  Fotos permite navegar todas las imágenes y sincroniza la selección con el
  carrusel del hero; Mapa muestra la zona aproximada declarada por el anuncio
  sin una tarjeta de texto superpuesta. La etiqueta de ubicación permanece como
  nombre accesible del mapa.
- En móvil, galería arriba, datos debajo y acciones compactas solo con icono.
- Debajo del hero, secciones específicas y formulario lateral que pasa a una
  columna normal en pantallas estrechas.
- Servicios presenta categoría, cobertura, municipios y fecha de actualización.
- Materiales presenta categoría, precio declarado, disponibilidad y ubicación,
  además de una nota para confirmar inventario con el vendedor.
- Los formularios de contacto de Servicios y Materiales comparten el diseño de
  la tarjeta de Comprar: encabezado, fecha de actualización, campo de mensaje y
  botón de consulta. Cada categoría conserva su texto y envío propios.
- Las fichas admiten un pie compartido con recomendaciones y presentan el
  reporte del anuncio adaptado al tipo de publicación.

## Navegación y accesibilidad

Los controles de galería reutilizan `CatalogCardGallery`; cada imagen conserva
su cargador/fallback original. Compartir usa el menú del dispositivo y copia el
enlace como alternativa. Regresar mantiene las rutas `/servicios` y
`/materiales`; los formularios mantienen los flujos de consulta existentes.
El visor bloquea el scroll de fondo y se cierra con Escape, el botón de cierre
o al pulsar el fondo. Los mapas muestran una referencia provincial porque no
se guarda ni se expone una coordenada exacta de dirección o atención.
Los botones superiores ofrecen objetivos táctiles de al menos 44 px, y de
48 px en dispositivos táctiles.

## Verificación

Las pruebas de cada página abren el detalle, comprueban secciones específicas,
el formulario, flechas y puntos con varias fotos y el regreso al catálogo. La
prueba del visor comprueba las pestañas, sincronización de foto y cierre con
Escape.
