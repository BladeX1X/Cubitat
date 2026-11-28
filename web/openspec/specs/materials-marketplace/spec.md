# Catálogo de materiales de construcción

## Propósito

Conectar compradores con comercios y vendedores de materiales para vivienda
mediante anuncios, disponibilidad declarada y consultas directas.

### Carga privada de fotos

- La carga de fotos nuevas usa `POST /api/material-photos/<listing_uuid>/upload`
  tanto en DEV como en producción. El Worker autentica al propietario, aplica un
  límite de 40 cargas por usuario cada 10 minutos y delega la validación de
  propiedad/estado y el almacenamiento privado al gateway confiable.
- Métodos distintos de POST se rechazan; una sesión ausente o un límite agotado
  no deben invocar el almacenamiento. Las URLs firmadas solo se usan para leer.

## Requisitos

### Ubicación con privacidad para publicar materiales

- El formulario de alta/edición comparte el marco de publicación con Comprar y
  Servicios, exige provincia y municipio, y permite marcar opcionalmente un
  punto en el mapa.
- La publicación y edición guardan el municipio seleccionado junto con la
  provincia; el formulario de edición lo restaura desde la RPC del propietario.
- El catálogo, el detalle, los accesos de mapa/contacto y Mis anuncios muestran
  el municipio cuando está disponible, y conservan la provincia para anuncios
  históricos sin municipio.
- La base guarda la coordenada exacta en una tabla privada accesible únicamente
  al propietario autenticado; el catálogo solo recibe una coordenada pública
  redondeada a una cuadrícula de 0.005 grados.
- El propietario recupera su punto exacto mediante `get_my_material_listings`
  y puede moverlo o quitarlo al editar. Una ficha pública usa la referencia
  redondeada y un círculo de 1 km de diámetro; si no hay punto, conserva el mapa
  provincial existente.
- La RPC propietaria incluye `municipality` junto con la provincia y las
  coordenadas exactas; la actualización recibe esos campos y solo modifica
  anuncios propios no archivados. Ambas RPC son `SECURITY DEFINER` con
  `search_path=pg_catalog`; su ejecución queda limitada a `authenticated`.
- La migración productiva de este contrato se ejecuta con el workflow
  `Apply publication coordinates migration to production`, después de revisar
  checksum, ledger y estado previo. El workflow detiene la ejecución si la
  migración no es la única pendiente o si cambian las precondiciones.

### Catálogo

- La ficha reutiliza `MarketplaceListingDetail` con Servicios: barra de
  navegación/acciones, breadcrumb, hero de dos columnas, datos propios de
  Materiales y galería con flechas y puntos cuando hay varias fotos. En móvil
  el hero se apila y las acciones quedan en iconos accesibles.
- Las secciones de la ficha muestran categoría, disponibilidad, ubicación,
  fecha de actualización, descripción y aviso para confirmar precio e
  inventario con el vendedor. El panel lateral conserva el formulario de
  consulta al vendedor y comparte con Comprar y Servicios la jerarquía visual
  del contacto: encabezado, fecha, etiqueta, campo y CTA, con texto propio del
  material.

- Las tarjetas MUST compartir el marco, ancho máximo centrado de 72 rem,
  cuadrícula con columnas desde 320 px y proporción de imagen 16:9 con Comprar y
  Servicios. Las acciones quedan alineadas al borde inferior de cada tarjeta.
- Con más de una foto, la tarjeta MUST mostrar flechas y puntos accesibles para
  navegar la galería; con una foto no muestra controles. La portada conserva
  prioridad de carga y las demás imágenes son diferidas.

- **WHEN** una persona filtra anuncios en escritorio o móvil
- **THEN** la barra conserva el estilo compacto de los filtros de Comprar
- **AND** los cambios se aplican en el catálogo sin recargar ni navegar
- **AND** móvil permite abrir y cerrar filtros en una hoja, limpiar filtros y
  conservar visible el total de resultados
- En dispositivos táctiles, los botones del encabezado, filtros, acciones del
  catálogo, paginación y mapa MUST ofrecer objetivos de al menos 48×48 px; los
  campos de texto móviles MUST usar fuente de al menos 16 px.

- **WHEN** un visitante explora o filtra por texto, categoría, provincia o
  disponibilidad
- **THEN** ve solamente anuncios `published` con disponibilidad activa
- **AND** los resultados se cargan por páginas desde la base de datos y el total
  refleja todas las coincidencias, no solo la página descargada
- **AND** cada ficha indica vendedor, descripción, precio/moneda declarados,
  zona y última actualización
- **AND** no se presenta el precio ni el inventario como garantía contractual

- **WHEN** una persona abre el catálogo público de materiales
- **THEN** el encabezado del catálogo muestra el título sin accesos directos
  para publicar ni administrar anuncios propios
- **AND** la publicación se inicia desde el flujo universal y la gestión de
  anuncios propios desde el centro de cuenta

### Publicación

- **GIVEN** un vendedor autenticado
- **WHEN** crea o modifica un anuncio
- **THEN** el anuncio requiere revisión antes de hacerse público
- **AND** solo el propietario puede editarlo
- **AND** imágenes usan Storage privado hasta aprobarse y reglas de tamaño/tipo
  (bucket privado, WebP/JPEG/PNG, máximo 5 MiB por archivo y 10 por anuncio)
- **AND** solo se emiten URLs firmadas para objetos referenciados por anuncios
  publicados y disponibles; propietario/admin AAL2 pueden leer objetos privados
- **AND** al seleccionar varias imágenes válidas, el formulario las prepara en
  lote a WebP de hasta 800×800 px y calidad 0.70, muestra miniaturas en el orden
  elegido y no permite enviar mientras se preparan
- **AND** un error de preparación no agrega parte del lote ni elimina fotos ya
  seleccionadas; las fotos preparadas se envían en bytes WebP al gateway Worker
  DEV, que valida sesión, propietario/estado del anuncio, tipo y tamaño antes
  de escribir al bucket privado con credencial de servidor; no hay carga directa
  desde el navegador y las referencias se guardan solo después de cada carga
- **AND** si falla Storage tras crear el anuncio pendiente, al recargar se
  recuperan los campos del mismo anuncio en edición, sin crear otro anuncio; los
  archivos locales se vuelven a seleccionar porque el navegador no persiste los
  datos del input de archivos
- **AND** si la actualización recibe un rechazo definitivo `42501`, limpia solo
  las fotos nuevas sin referencia y conserva el lote seleccionado para reintentar
- **AND** ante una respuesta ambigua conserva localmente las rutas ya cargadas y
  las reutiliza al reintentar; pide revisar Mis anuncios antes de un nuevo envío
- **AND** si se pierde la respuesta al crear el anuncio, un reintento reutiliza
  el mismo slug idempotente y solo recupera un anuncio pendiente que el RPC
  propietario devuelve para esa cuenta; no crea duplicados ni adopta anuncios
  ajenos
- **AND** un fallo de red al limpiar fotos antiguas después de actualizar no debe
  convertir el guardado ya confirmado en un error
- **AND** al editar, las fotos privadas existentes tienen vista previa mediante
  URL temporal solo para el dueño y anuncio actuales; si falla la firma, se
  informa al usuario y se conservan las referencias para que pueda continuar

### Mis anuncios

- **WHEN** el propietario abre sus anuncios de materiales
- **THEN** la pantalla distingue carga, error, lista vacía y resultados cargados
- **AND** un error de lectura con cero resultados no se presenta también como
  una cuenta sin anuncios
- **AND** el error ofrece una acción para volver a cargar la lista
- **AND** un estado vacío solo se presenta después de una respuesta correcta sin
  anuncios; los resultados ya cargados permanecen visibles si falla una
  actualización posterior
- **AND** los anuncios archivados no se pueden editar desde la lista

### Consulta

- **WHEN** una persona autenticada contacta al vendedor desde una ficha
- **THEN** se registra una consulta privada asociada al anuncio
- **AND** la consulta no crea una orden, reserva, pago ni garantía de inventario
- **AND** solamente el remitente, el vendedor propietario y administración pueden
  leerla según permisos
- **AND** las tarjetas ofrecen “Contactar” y “Consultar”: Contactar abre una
  llamada telefónica y Consultar abre WhatsApp con el anuncio identificado,
  directamente y sin modal ni navegación intermedia a la ficha.
- El teléfono/WhatsApp no forma parte de las respuestas del catálogo. Solo se
  obtiene del Worker al pulsar una acción explícita; el Worker valida anuncio,
  limita solicitudes por IP y devuelve error recuperable cuando falla el lookup.
- Si el anunciante no registró el canal solicitado, la interfaz lo explica y
  ofrece abrir la ficha para usar el formulario protegido de consulta.
- Al abrir una ficha, el estado pendiente se muestra como carga; un fallo de
  consulta presenta error recuperable con reintento y solo una respuesta correcta
  sin anuncio se presenta como “no disponible”. Esto también aplica al navegar
  desde el catálogo y al volver a la ficha con el historial del navegador; el
  estado vacío no debe mostrarse antes de que la consulta de detalle responda.

### Exclusiones

- El catálogo no incluye carrito, checkout, cobros, escrow, logística ni órdenes.
- No se publican datos de contacto personales salvo que el vendedor los exponga
  voluntariamente en su anuncio.
- El catálogo filtra únicamente disponibilidad activa (`available`, `limited`,
  `made_to_order`); anuncios agotados no forman parte de resultados públicos.
- El filtro municipal requiere primero una migración reconciliada que añada la
  ubicación a `material_listings` y a sus flujos de alta/edición. Hasta entonces,
  el catálogo no debe ofrecer un filtro municipal de materiales.

### Mapa adaptable

- Al abrir “Mostrar mapa” en escritorio, filtros y anuncios permanecen en una
  columna izquierda y el mapa aparece simultáneamente a la derecha, como en
  Comprar/Rentar; en móvil el mapa ocupa la pantalla y se puede cerrar. El
  acceso al mapa queda en un botón flotante fijo, accesible al desplazarse por
  el catálogo; al abrirlo en móvil, el propio mapa ofrece el cierre.
- Los filtros se presentan con el patrón visual de Comprar. Hasta 768 px se
  muestra búsqueda y un botón de filtros que abre una hoja inferior con
  categoría, provincia y disponibilidad; cambiar filtros actualiza la consulta
  actual, y la hoja permite limpiar o volver a resultados. En escritorio se
  muestran búsqueda y filtros en la barra compacta, con cualquier
  desbordamiento contenido dentro de la barra sticky. En viewports de hasta
  620 px el encabezado se desplaza con la página y la búsqueda sticky permanece
  a 8 px del borde superior, visible y sin quedar cubierta. Entre 621 y 768 px,
  el encabezado de dos filas permanece sticky y la barra queda debajo a 104 px.
- Aplicar, cambiar o limpiar filtros actualiza los resultados en la misma vista,
  sin recargar el documento. Durante la consulta, la barra y el mapa permanecen
  montados; los resultados visibles se conservan hasta que llega la respuesta
  nueva y el estado de carga accesible no reemplaza la cuadrícula ni desplaza el
  catálogo.
- Los resultados muestran una página numerada a la vez, con navegación anterior,
  siguiente y por número; cambiar filtros vuelve a la página 1.
- En móvil, la acción flotante para abrir el mapa permanece por encima de la
  navegación inferior y no intercepta sus controles.
- Si falla la carga inicial del estilo del mapa, se puede reintentar desde el
  mismo panel sin cerrar el mapa ni abandonar los filtros del catálogo.

## Contrato de imágenes

- Las tarjetas usan el cargador compartido de miniaturas: prioriza las dos
  primeras fotos visibles, carga las siguientes bajo demanda y decodifica en
  segundo plano. Las URLs de Unsplash se limitan a 420 px y calidad 45; para
  Storage privado, el repositorio firma miniaturas de 420×192, recorte `cover`,
  calidad 65 y usa una firma del original si la transformación falla. La ficha
  conserva originales para la galería. Las URLs firmadas de Storage conservan
  su firma y tienen fallback visible.
- `material-listings` es un bucket privado. Las rutas tienen la forma
  `<owner_uuid>/<listing_uuid>/<object_uuid>.webp` para cargas nuevas.
- El cliente no tiene una ruta de INSERT directa a Storage: el trigger de DEV
  requiere el gateway de confianza y rechaza el rol `authenticated`. El Worker
  valida el token, comprueba propietario y estado, aplica el límite de 20
  objetos por anuncio y escribe con `service_role`.
- Las políticas RLS de lectura privada y borrado sin referencias comprueban
  propiedad mediante funciones `SECURITY DEFINER` acotadas a `auth.uid()`, ya
  que `owner_id` no se expone por SELECT a los clientes.
- Las políticas de lectura privada y borrado del dueño usan las mismas
  comprobaciones protegidas; la cuenta no obtiene acceso directo a `owner_id`.
- El propietario sube solo a un anuncio propio no archivado. La base rechaza
  referencias recién añadidas que no apunten a un objeto existente del bucket.
- Se limitan las referencias del anuncio a 10; el gateway permite hasta 20
  objetos por carpeta de anuncio para soportar reemplazos y limpieza de cargas
  huérfanas, ya que la credencial `service_role` omite RLS.
- La lectura pública de Storage requiere que el objeto esté en `photo_urls` de
  un anuncio publicado y no agotado. La app crea URLs firmadas de una hora al
  renderizar el catálogo/ficha; Storage privado nunca se configura como bucket
  público ni se almacena la URL firmada en la fila.
- Si una firma falla, el catálogo conserva el anuncio y muestra un estado
  accesible de foto temporalmente no disponible, en vez de esconder el fallo
  detrás de un espacio vacío.
- Los enlaces HTTPS previos a esta migración se conservan si ya están en la fila,
  pero no se admiten como imágenes nuevas. Su migración a Storage se hará sin
  borrado automático de archivos anteriores.

### Requirement: Reportes y recomendación de servicios
Las fichas públicas MUST permitir reportar un anuncio de material publicado con controles antiabuso y presentar servicios con profile_featured vigente al final.

#### Scenario: Reportar material
- GIVEN un material publicado
- WHEN la persona selecciona «Informar sobre un problema»
- THEN el formulario de reporte se abre en un diálogo modal accesible, adaptado al material
- AND el bloque informativo y el botón de apertura conservan el diseño de reporte de Comprar
- AND se puede cerrar con Escape, el botón de cierre o pulsando el fondo

#### Scenario: Enviar reporte de material
- GIVEN el diálogo modal de reporte para un material publicado
- WHEN el visitante completa el motivo y Turnstile
- THEN el Worker registra el reporte y Moderación puede revisarlo sin cambiar automáticamente el estado del anuncio

### Requirement: Visor de fotos y mapa del material
La ficha pública de material MUST ofrecer botones Fotos y Mapa sobre su galería,
reutilizando el visor modal accesible y adaptando el mapa a la ubicación
provincial declarada por el vendedor.

#### Scenario: Navegar fotos de un material
- GIVEN un material publicado con una o más fotos
- WHEN el visitante abre Fotos
- THEN puede recorrer la galería en el visor modal
- AND la imagen seleccionada coincide con la del carrusel de la ficha
- AND puede cerrar con Escape, el botón de cierre o pulsando el fondo

#### Scenario: Consultar ubicación provincial de un material
- GIVEN un material publicado con provincia declarada
- WHEN el visitante abre Mapa
- THEN se carga un mapa centrado en una referencia aproximada de esa provincia
- AND se informa que la ubicación no es una dirección exacta

### Borradores y monedas — 2026-11-27

- El formulario de alta permite guardar varios borradores locales, aislados por usuario y tipo; Mis materiales permite reanudar o eliminar cada uno.
- Cada borrador manual conserva los campos, paso y fotos seleccionadas. «Salir sin guardar» descarta únicamente lo posterior al último guardado manual.
- El selector de publicaciones nuevas ofrece únicamente Dólares (USD) y Pesos cubanos (CUP); `currency` persiste la selección. Los códigos históricos EUR/MIXED se conservan por compatibilidad y solo se muestran al editar o reanudar un anuncio que ya tenga ese código, evitando alterar precios existentes sin decisión del propietario.

### Despliegue municipio/coordenadas — 2026-11-28

La migración `20261128120000_material_municipality_coordinates_contract.sql`
está aplicada y verificada en Producción por el workflow dedicado. El Worker
`cubitat1` versión `f80cf97d-9159-4e77-ab34-c7df4e070564` quedó al 100 % y el
bundle de publicación de Materiales se sirvió correctamente. La creación y
edición autenticada QA en Producción confirmó que el municipio y el punto se
conservan. Ese recorrido encontró que el botón de éxito heredaba el destino del
selector universal y abría el formulario de vivienda; la corrección separa el
retorno tras guardar hacia Mis materiales. Su despliegue y retest del CTA siguen
pendientes.

#### Scenario: Volver a Mis materiales tras publicar
- GIVEN la persona envía o edita un anuncio desde «Publicar gratis»
- WHEN la aplicación confirma que se envió a revisión
- THEN «Volver a mis anuncios» abre Mis materiales
- AND no reabre el selector ni el formulario de publicación de vivienda
