# Catálogo de materiales de construcción

## Propósito

Conectar compradores con comercios y vendedores de materiales para vivienda
mediante anuncios, disponibilidad declarada y consultas directas.

## Requisitos

### Catálogo

- **WHEN** un visitante explora o filtra por texto, categoría, provincia o
  disponibilidad
- **THEN** ve solamente anuncios `published` con disponibilidad activa
- **AND** los resultados se cargan por páginas desde la base de datos y el total
  refleja todas las coincidencias, no solo la página descargada
- **AND** cada ficha indica vendedor, descripción, precio/moneda declarados,
  zona y última actualización
- **AND** no se presenta el precio ni el inventario como garantía contractual

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
  desbordamiento contenido dentro de la barra sticky.
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
