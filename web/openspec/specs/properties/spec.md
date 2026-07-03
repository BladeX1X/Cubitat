# Ficha del Inmueble y Publicación (Properties)

## Purpose
Permite visualizar la información detallada de un inmueble, contactar al anunciante y publicar propiedades con soporte offline y optimizaciones de imágenes.

## Requirements

### Requirement: Detalle del Inmueble en Pantalla Completa
El sistema MUST mostrar la ficha técnica extendida del inmueble ocupando todo el ancho de la pantalla cuando un usuario selecciona una propiedad del listado.

#### Scenario: Apertura de la ficha detallada
- GIVEN un usuario en la página de resultados `/resultados`
- WHEN hace clic sobre una tarjeta de propiedad (excluyendo los botones de carrusel y favoritos)
- THEN el sistema MUST ocultar el listado/catálogo de resultados
- AND el sistema MUST renderizar la vista de detalle `<PropertyDetail />` a pantalla completa con toda la información técnica

### Requirement: Publicación de Inmueble y Guardado de Borradores (Offline)
El sistema MUST permitir la creación de anuncios de propiedades guardando borradores automáticamente en el navegador para prevenir desconexiones y soportar hasta 20 imágenes.

#### Scenario: Guardado automático de borrador local
- GIVEN un anunciante completando el formulario de publicación
- WHEN introduce información o añade fotos
- THEN el sistema MUST guardar automáticamente el estado del formulario en `localStorage` o `IndexedDB` en tiempo real
- AND si el anunciante recarga la página o se desconecta, el sistema MUST restaurar el borrador al abrir el formulario

#### Scenario: Carga de fotos optimizada con compresión en Frontend
- GIVEN un anunciante seleccionando imágenes para la propiedad (máximo 20)
- WHEN añade archivos al selector de imágenes
- THEN el sistema MUST comprimir y convertir las imágenes al formato WebP en el frontend antes de iniciar la subida
- AND el sistema MUST subir las imágenes optimizadas a Supabase Storage, ahorrando ancho de banda al usuario

### Requirement: Lazy Loading en Catálogo
El sistema MUST optimizar la carga de imágenes en las tarjetas para mitigar la lentitud de conexiones móviles.

#### Scenario: Carga diferida de imágenes (Lazy Loading)
- GIVEN el catálogo de resultados de propiedades
- WHEN las tarjetas de propiedades se desplazan hacia la vista (viewport)
- THEN el sistema MUST cargar las imágenes correspondientes de forma diferida (lazy load) utilizando el atributo `loading="lazy"` o un componente de intersección
### Requirement: Controles tactiles accesibles en tarjetas de propiedad
El sistema MUST mantener controles tactiles suficientemente grandes en las tarjetas del catalogo para que puedan usarse con comodidad en movil.

#### Scenario: Acciones sobre imagen y guardado en movil
- GIVEN un usuario navegando el catalogo de propiedades desde un viewport movil
- WHEN visualiza una tarjeta con galeria de imagenes y accion de guardar
- THEN las flechas de galeria MUST tener un area interactiva minima de `44x44 px`
- AND el boton de guardar/favorito MUST tener un area interactiva minima de `44x44 px`
- AND las flechas de galeria MUST permanecer visibles en viewport movil aunque no exista estado `hover`
- AND en escritorio las flechas MAY permanecer discretas y aparecer al pasar el cursor para reducir ruido visual
