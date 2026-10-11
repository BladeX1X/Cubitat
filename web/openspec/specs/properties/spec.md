# Ficha del Inmueble y Publicación (Properties)

## Purpose
Permite visualizar la información detallada de un inmueble, contactar al anunciante y publicar propiedades con soporte offline y optimizaciones de imágenes.

## Requirements

### Requirement: Dirección privada separada de la zona pública
- GIVEN una publicación nueva o antigua contiene calle y número en `location`
- WHEN se guarda o se migra el registro
- THEN la dirección íntegra MUST conservarse en una tabla privada con RLS de propietario
- AND `properties.location` MUST contener solamente municipio y provincia reconocidos por el catálogo, o `Cuba` si no se reconoce ninguna zona
- AND la respuesta REST pública, la ficha, las tarjetas y los metadatos MUST NOT exponer la dirección privada
- AND editar MUST recuperar el texto privado íntegro, sin adivinar divisiones de calles o barrios ambiguos
- AND guardar dirección y propiedad MUST ser una única transacción, incluso para clientes antiguos.

### Requirement: Coordenadas públicas aproximadas
- GIVEN una publicación contiene coordenadas seleccionadas por el anunciante
- WHEN se guarda o migra el registro
- THEN las coordenadas exactas MUST conservarse solamente en una tabla privada con RLS de propietario
- AND `properties.coordinates` MUST contener una posición aproximada en una cuadrícula de al menos 0.02 grados
- AND clientes públicos y cachés anteriores MUST aproximar las coordenadas antes de renderizar mapas
- AND el mapa de detalle MUST mostrar una zona aproximada sin marcador de domicilio exacto
- AND editar MUST recuperar las coordenadas privadas autorizadas para el propietario.

### Requirement: Detalle del Inmueble en Pantalla Completa
El sistema MUST mostrar la ficha técnica extendida del inmueble ocupando todo el ancho de la pantalla cuando un usuario selecciona una propiedad del listado.

#### Scenario: Apertura de la ficha detallada
- GIVEN un usuario en la página de resultados `/resultados`
- WHEN hace clic sobre una tarjeta de propiedad (excluyendo los botones de carrusel y favoritos)
- THEN el sistema MUST ocultar el listado/catálogo de resultados
- AND el sistema MUST renderizar la vista de detalle `<PropertyDetail />` a pantalla completa con toda la información técnica

#### Scenario: Mostrar preferencias de una permuta
- GIVEN una propiedad de permuta contiene `features.exchangePreferences`
- WHEN un visitante abre su ficha
- THEN el sistema MUST mostrar qué tipo de inmueble busca el anunciante
- AND MUST mostrar zona, mínimos, notas y diferencia de dinero únicamente cuando correspondan
- AND una preferencia ausente o malformada MUST NOT romper la ficha

#### Scenario: Detalle desde preview de mapa
- GIVEN un usuario selecciona una propiedad en el mapa movil
- WHEN pulsa `Ver detalle` en la preview
- THEN el sistema MUST navegar a la URL de detalle de esa propiedad
- AND MUST usar slug SEO cuando sea posible

### Requirement: Publicación de Inmueble y Guardado de Borradores (Offline)
El sistema MUST permitir la creación de anuncios de propiedades guardando borradores automáticamente en el navegador para prevenir desconexiones y soportar hasta 20 imágenes.

#### Scenario: Guardado automático de borrador local
- GIVEN un anunciante completando el formulario de publicación
- WHEN introduce información o añade fotos
- THEN el sistema MUST guardar automáticamente el estado del formulario en `localStorage` o `IndexedDB` en tiempo real
- AND si el anunciante recarga la página o se desconecta, el sistema MUST restaurar el borrador al abrir el formulario

#### Scenario: Recuperación íntegra y aislada
- GIVEN un usuario con un borrador nuevo o una edición sin terminar
- WHEN abre de nuevo el mismo formulario, sin requerir parámetros especiales en la URL
- THEN MUST restaurar automáticamente campos, paso y fotos desde IndexedDB antes de habilitar la edición
- AND MUST aislar cada borrador por usuario y propiedad editada y conservar compatibilidad con borradores locales anteriores
- AND MUST impedir que una lectura tardía o un cambio de cuenta sobrescriba datos de otro formulario
- AND MUST mostrar un error si el dispositivo no puede guardar los cambios

#### Scenario: Fallo total o parcial de fotos
- GIVEN fotos seleccionadas, incluidas imágenes existentes de una edición
- WHEN falla cualquier subida a Storage
- THEN MUST impedir guardar la propiedad y mostrar éxito
- AND MUST conservar fotos y campos para reintento
- AND MUST limpiar únicamente objetos nuevos confirmados de ese lote, nunca fotos originales
- AND WHEN todas las fotos y la propiedad se guardan correctamente MUST eliminar el borrador correspondiente sin que el autoguardado lo recree

#### Scenario: Publicacion protegida por propietario
- GIVEN un usuario intenta editar una propiedad
- WHEN la propiedad no pertenece al usuario
- THEN el sistema MUST impedir guardar cambios
- AND MUST mostrar error seguro o redirigir

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

### Requirement: Reporte de Propiedades Sospechosas
El sistema MUST permitir a cualquier usuario (autenticado o anónimo) reportar un anuncio sospechoso, fraudulento o con información incorrecta mediante un modal de informe estructurado.

#### Scenario: Reportar una propiedad sospechosa
- GIVEN un usuario visualizando la ficha detallada de una propiedad
- WHEN hace clic en el botón "Reportar propiedad sospechosa"
- THEN el sistema MUST desplegar un modal que contenga motivos predefinidos de reporte y un área de texto para comentarios adicionales
- AND al enviar el formulario de reporte, el sistema MUST registrar el incidente en la base de datos de Supabase (`public.property_reports`)
- AND el sistema MUST mostrar un mensaje de confirmación al usuario y cerrar el modal.

#### Scenario: Reporte anonimo con datos minimos
- GIVEN un usuario anonimo reporta una propiedad
- WHEN envia motivo y comentario opcional
- THEN el sistema MUST registrar el reporte sin requerir cuenta si la politica lo permite
- AND SHOULD capturar metadatos minimos antifraude sin exponerlos publicamente

#### Scenario: Reporte autenticado compatible con RLS
- GIVEN un usuario autenticado reporta una propiedad publicada
- WHEN el sistema inserta el reporte
- THEN `reporter_id` MUST contener el identificador del usuario autenticado
- AND un reporte anonimo MUST conservar `reporter_id` nulo
- AND si la insercion o Turnstile falla el widget MUST renovarse para permitir un reintento seguro

#### Scenario: Reporte protegido contra bypass de Turnstile
- GIVEN un usuario anonimo o autenticado envia un reporte
- WHEN el formulario se procesa
- THEN el navegador MUST enviar el token y los datos al Worker principal de Cubitat
- AND el Worker MUST validar `hostname` y `action` antes de persistir el reporte
- AND el identificador del reportante autenticado MUST derivarse de una sesion validada por el servidor
- AND el navegador MUST NOT insertar directamente en `public.property_reports`

### Requirement: Normalizacion de contacto de propiedad
El sistema MUST resolver informacion de contacto desde datos de propiedad y fallback controlado.

#### Scenario: Contact info faltante
- GIVEN una propiedad no tiene `contact_info` completo
- WHEN se renderiza tarjeta o detalle
- THEN el sistema MUST usar fallback seguro si existe
- AND MUST ocultar acciones que no tengan datos suficientes

### Requirement: Propiedades publicas filtradas por estado
El sistema MUST consultar y renderizar solo propiedades publicas en experiencias publicas.

#### Scenario: Cargar propiedades publicas
- GIVEN la aplicacion carga propiedades desde Supabase
- WHEN se renderiza home, resultados o detalle publico
- THEN MUST usar solo propiedades con estado publicable
- AND MUST ignorar borradores, pausadas u ocultas salvo en areas privadas autorizadas

#### Scenario: Completar propiedades relacionadas sin repetir anuncios
- GIVEN una ficha pública con menos de tres propiedades relacionadas en la misma provincia
- WHEN el sistema consulta anuncios adicionales del mismo tipo y operación
- THEN MUST excluir la propiedad actual y las ya seleccionadas mediante una lista UUID válida para PostgREST
- AND MUST completar la sección sin provocar respuestas `400`

### Requirement: Metadatos Open Graph Dinámicos en Servidor Perimetral (Edge)
El sistema MUST servir metadatos de redes sociales (Open Graph y Twitter Cards) pre-procesados en el servidor perimetral para crawlers (como Telegram, WhatsApp o Facebook) que no ejecutan JavaScript del lado del cliente.

#### Scenario: Obtener vista previa de una propiedad en redes sociales
- GIVEN un crawler o bot de red social solicitando la URL de una propiedad `/propiedad/:slug-uuid`
- WHEN la petición llega a Cloudflare Edge
- THEN el sistema MUST interceptar la petición mediante un Worker script
- AND el sistema MUST consultar de forma asíncrona los datos de la propiedad (título, descripción, imagen y precio) desde la base de datos de Supabase
- AND el sistema MUST reescribir dinámicamente las etiquetas `<meta property="og:*">` y `<meta name="twitter:*">` en el flujo HTML usando `HTMLRewriter` antes de enviarlo al cliente.

#### Scenario: Invalidar HTML de propiedad tras un despliegue
- GIVEN el Worker genera HTML dinamico para una propiedad
- WHEN se despliega una nueva version del Worker y de los assets estaticos
- THEN la respuesta HTML MUST usar `no-cache, no-store, must-revalidate`
- AND el Worker MUST evitar conservar ese documento en la Cache API manual
- AND la siguiente solicitud MUST generar HTML que referencie los assets vigentes

### Requirement: Skeletons de Carga con Shimmer (UX Premium)
El sistema MUST mostrar skeletons de carga animados (shimmer) en lugar de layouts vacíos o spinners genéricos para reducir el layout shift y mejorar la experiencia de usuario percibida.

#### Scenario: Carga de la ficha de detalle de propiedad
- GIVEN un usuario navegando hacia la vista detallada de una propiedad `/propiedad/:slug-uuid`
- WHEN la información del inmueble está cargando
- THEN el sistema MUST renderizar un skeleton que simule la estructura exacta de la ficha (rejilla de fotos, líneas de texto para el título y descripción, círculos para las estadísticas rápidas y tarjeta lateral de contacto)
- AND los elementos del skeleton MUST incluir una animación de barrido de luz degradada (shimmer) continua.

### Requirement: Distintivo público de vendedor verificado en Fase 2 DEV
- GIVEN una propiedad publicada en el entorno explícito de Fase 2 DEV pertenece a un perfil no agente cuya identidad está verificada
- WHEN se muestra la tarjeta pública de la propiedad
- THEN MUST mostrar «Vendedor verificado»
- AND MUST NOT mostrar el distintivo a perfiles pendientes, rechazados o sin verificación, ni a anuncios no publicados
- AND perfiles con rol de agente MUST conservar el distintivo «Agente verificado»
- AND el distintivo MUST describir que Cubitat revisó la identidad, sin afirmar certificación legal de la propiedad
- AND la lista pública de identificadores MUST incluir solo propietarios verificados con una propiedad publicada, sin exponer datos KYC
- AND esta funcionalidad MUST permanecer deshabilitada en producción hasta una promoción explícita
