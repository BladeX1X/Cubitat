# Módulo de Mapas (Maps)

## Purpose
Visualizar la ubicación de los inmuebles e integrar la búsqueda geográfica interactiva mediante un mapa a pantalla completa.

## Requirements

### Requirement: Ciclo de vida compartido de MapLibre
Los mapas interactivos de Comprar y de los catálogos de Servicios y Materiales
MUST usar una misma base de inicialización MapLibre para cargar el estilo
OpenFreeMap, instalar los controles de navegación y atribución, observar el
tamaño del contenedor, detectar errores y permitir reintentar.

#### Scenario: Usar la base compartida con capas propias
- GIVEN Comprar, Servicios o Materiales muestran resultados con coordenadas
  públicas aproximadas
- WHEN se abre cualquiera de esos mapas
- THEN se usa el mismo ciclo de vida, estados de carga/error, controles y
  comportamiento de redimensionado
- AND se conservan las capas, clusters y selecciones particulares de cada flujo

### Requirement: Mapas de anuncios en Servicios y Materiales
Los directorios de Servicios y Materiales MUST reutilizar el mapa de puntos de
Comprar con coordenadas públicas aproximadas. Al abrir el mapa MUST cargar todos
los resultados que coincidan con los filtros activos (incluida provincia y
municipio), no solo la página actual, y MUST mantener las coordenadas exactas
fuera del cliente. La consulta y el código del mapa MUST cargarse bajo demanda.

#### Scenario: Abrir mapa de catálogo
- GIVEN el usuario está en el directorio de Servicios o Materiales
- WHEN abre “Mostrar mapa”
- THEN se cargan todos los anuncios filtrados con sus coordenadas públicas y se
  muestran con clusters como en Comprar
- AND el primer encuadre incluye los anuncios cargados, sin pines de anuncios
  fuera de los filtros activos
- AND la lista incluye inicialmente la página actual y después sigue el área
  visible del mapa
- AND cada consulta de mapa recorre las páginas del catálogo y carga solo la
  imagen de portada para no descargar galerías completas
- AND anuncios sin coordenadas públicas se omiten del mapa
- AND mapa y marcadores nunca consultan coordenadas privadas
- AND el control para abrir el mapa MUST flotar centrado en la parte inferior de la ventana
- AND en escritorio, el mapa MUST aparecer junto a los resultados en una vista dividida, manteniendo visibles filtros y tarjetas
- AND en móvil, el mapa MUST abrirse a pantalla completa, ajustarse al ancho del viewport sin desbordamiento horizontal y ofrecer un control flotante inferior para volver a la lista
- AND el mapa MUST redimensionarse y encuadrar Cuba al abrirse, sin iniciar desplazado fuera de la isla
- AND el indicador de carga se retira en cuanto el estilo y las capas interactivas están listos, sin esperar a todas las teselas visibles
- AND en móvil el estado de carga conserva el diálogo de pantalla completa y el botón para cerrar

#### Scenario: Filtrar la lista según el área visible
- GIVEN el mapa muestra anuncios agrupados
- WHEN el usuario desplaza o acerca el mapa
- THEN las tarjetas y el total muestran solo anuncios cuyas coordenadas públicas
  quedan dentro del área visible, igual que Comprar
- AND la provincia, municipio, categoría, disponibilidad y texto de búsqueda
  siguen aplicándose al mapa y a la lista

#### Scenario: Seleccionar anuncios en el mapa
- GIVEN uno o más anuncios aparecen en el mapa
- WHEN el usuario pulsa un punto o un cluster
- THEN se resaltan las tarjetas de los anuncios seleccionados y la lista muestra
  ese punto o grupo como en Comprar
- AND el mapa no navega automáticamente al detalle del anuncio
- AND controles y clusters MUST mantener objetivos táctiles de al menos 48 × 48 px

#### Scenario: Mapa cerrado o con error
- GIVEN el mapa está cerrado o su estilo no carga
- WHEN se usa el catálogo
- THEN el catálogo y sus filtros siguen disponibles y el mapa permanece diferido

### Requirement: Ubicación Aproximada en Detalle de Propiedad
El sistema MUST mostrar un mapa estático o interactivo reducido en la ficha de detalle de la propiedad para ubicar el inmueble sin revelar la dirección exacta por motivos de privacidad.

#### Scenario: Visualización del mapa de detalle
- GIVEN un usuario en la página de detalle de una propiedad
- WHEN visualiza la sección de ubicación
- THEN el sistema MUST inicializar un contenedor de MapLibre GL centrado en las coordenadas aproximadas del inmueble
- AND el sistema MUST dibujar un círculo de radio aproximado o un marcador genérico sin indicar la dirección exacta
- AND cuando se dibuje un area aproximada, el radio MUST estar definido en unidades geograficas para mantener la misma region al hacer zoom
- AND el área circular aproximada MUST tener 1 km de diámetro (500 m de radio)

#### Scenario: Abrir mapa desde detalle
- GIVEN una propiedad tiene coordenadas disponibles
- WHEN el usuario abre la accion `Mapa` o seccion de ubicacion
- THEN el sistema MUST mostrar un mapa centrado en la ubicacion aproximada
- AND MUST mantener controles accesibles para cerrar o volver al detalle

#### Scenario: Coordenadas faltantes
- GIVEN una propiedad no tiene coordenadas validas
- WHEN se renderiza detalle o mapa
- THEN el sistema MUST mostrar estado alternativo estable
- AND MUST evitar inicializar MapLibre con coordenadas invalidas

### Requirement: Mapa aproximado en fichas de Servicios y Materiales
Las fichas de Servicios y Materiales MUST ofrecer una pestaña Mapa dentro del
visor multimedia. El mapa MUST cargarse bajo demanda y mostrar una referencia
aproximada, sin exponer coordenadas exactas.

#### Scenario: Mostrar solo el círculo aproximado
- GIVEN el anuncio tiene coordenadas públicas aproximadas
- WHEN el visitante abre la pestaña Mapa
- THEN el mapa MUST mostrar un círculo de 1 km de diámetro
- AND MUST NOT mostrar un pin o marcador de ubicación
- AND el centro del círculo MUST quedar desplazado entre 120 y 240 m de la
  referencia pública aproximada
- AND el desplazamiento MUST ser estable para el mismo anuncio y variar entre
  anuncios, sin usar ni revelar coordenadas privadas
- AND el mapa MUST ocupar el espacio sin una tarjeta flotante de ubicación

#### Scenario: Anuncio sin coordenadas públicas
- GIVEN el anuncio solo declara provincia
- WHEN el visitante abre la pestaña Mapa
- THEN el mapa MUST mostrar una referencia provincial aproximada
- AND MUST conservar una etiqueta accesible para identificar el mapa

### Requirement: Coordenadas privadas en publicaciones de Servicios y Materiales

- **GIVEN** un anunciante crea o edita un servicio o material
- **WHEN** marca un punto en `AddressMap`
- **THEN** el punto exacto MUST guardarse en la tabla privada de la categoría y
  MUST volver a mostrarse solo al propietario mediante la RPC de sus anuncios
- **AND** las respuestas de catálogo MUST exponer solo el punto redondeado a
  0.005 grados, con RLS y privilegios de columna limitados
- **AND** las fichas MUST dibujar un área de 1 km de diámetro centrada en la
  referencia aproximada, sin exponer la ubicación exacta
- **WHEN** el anunciante quita la ubicación
- **THEN** la coordenada privada y la referencia pública MUST eliminarse

#### Scenario: Abrir el mapa de un servicio o material
- GIVEN una ficha pública de servicio o material con provincia declarada
- WHEN el visitante selecciona Mapa
- THEN se inicializa MapLibre centrado en una referencia aproximada
- AND el mapa conserva su etiqueta accesible sin superponer una tarjeta de texto
- AND un fallo muestra un estado recuperable sin interrumpir el resto de la ficha

### Requirement: Mapa de Búsqueda Grande con Filtros Integrados
El sistema MUST proveer una vista de pantalla dividida o pantalla completa con un mapa interactivo para buscar y filtrar inmuebles directamente desde la interfaz geográfica.

#### Scenario: Exploración de inmuebles en el mapa grande
- GIVEN un usuario en la pestaña o página de mapa grande
- WHEN se cargan las propiedades
- THEN el sistema MUST mostrar pines con el precio abreviado de las propiedades en sus respectivas coordenadas geográficas
- AND al hacer clic en un pin, se desplegará una tarjeta de previsualización flotante con información clave del inmueble
- AND al mover o hacer zoom en el mapa, el sistema MUST filtrar o recargar las propiedades para mostrar solo aquellas dentro del área visible (bounding box) si el modo de búsqueda geográfica está activo
- AND los filtros de búsqueda generales (tipo, operación, precio) MUST actualizar de inmediato los pines del mapa

### Requirement: Adaptador MapLibre aislado
El sistema MUST encapsular la integracion de MapLibre detras de un componente/adaptador para reducir impacto de fallos.

#### Scenario: Carga diferida del mapa
- GIVEN un usuario no abre la vista de mapa
- WHEN se renderizan resultados o detalle
- THEN el modulo pesado de MapLibre SHOULD permanecer diferido cuando sea posible
- AND la lista de resultados MUST cargar sin esperar por el bundle de mapa

#### Scenario: Error al cargar estilo de mapa
- GIVEN falla la descarga del estilo OpenFreeMap
- WHEN el adaptador intenta inicializar el mapa
- THEN el sistema SHOULD registrar el error
- AND MUST evitar romper toda la pagina
- AND SHOULD mostrar fallback o estado de carga/error si el producto lo define

#### Scenario: Error al cargar recursos del mapa
- GIVEN el estilo ya inicializó y falla una tesela, una fuente de glifos o el contexto WebGL
- WHEN MapLibre emite un error de recurso
- THEN el sistema MUST registrar una categoría segura del recurso y un código cerrado del error
- AND MUST omitir el mensaje original, la URL, los identificadores y cualquier dato personal
- AND MUST limitar la repetición de errores equivalentes durante la vida de la instancia del mapa

#### Scenario: Error recuperable de tesela en mapa de dirección
- GIVEN MapLibre informa un error asociado a una fuente de teselas durante la carga inicial o después del primer `load`
- WHEN el resto del mapa puede continuar cargando o ya es usable
- THEN MUST conservar la instancia y permitir que la carga continúe
- AND MUST registrar el error de forma segura y deduplicada
- AND si se pierde el contexto WebGL, MUST ofrecer recuperación aunque el mapa ya hubiera cargado

### Requirement: Clusters y pines
El sistema MUST representar muchas propiedades con clusters y pines comprensibles.

#### Scenario: Cluster en mapa
- GIVEN hay varias propiedades cercanas
- WHEN el mapa se renderiza a un nivel de zoom bajo
- THEN el sistema MUST agruparlas en clusters
- AND al pulsar un cluster MUST hacer zoom hacia ese grupo
- AND en móvil, al acercar un grupo seleccionado, la selección del carrusel y el resaltado de sus propiedades MUST permanecer aunque el cluster se divida
- AND los controles de zoom, cierre, carrusel y acciones del mapa MUST ofrecer objetivos táctiles de al menos 48 × 48 px

#### Scenario: Pin de propiedad
- GIVEN una propiedad visible no esta agrupada
- WHEN el mapa la renderiza
- THEN el sistema MUST mostrar un pin o badge con precio o etiqueta relevante
- AND al pulsarlo MUST seleccionar la propiedad sin navegar automaticamente al detalle

### Requirement: Privacidad geografica
El sistema MUST evitar revelar direccion exacta si el producto requiere ubicacion aproximada.

#### Scenario: Coordenadas publicas aproximadas
- GIVEN una propiedad tiene direccion exacta internamente
- WHEN se muestra en mapa publico
- THEN el sistema SHOULD usar coordenadas aproximadas o zona
- AND MUST evitar mostrar calle exacta salvo requisito explicito

#### Scenario: Coordenadas incompatibles con la zona declarada
- GIVEN una propiedad tiene una ubicación pública de un municipio conocido y sus coordenadas guardadas quedan claramente fuera de esa localidad
- WHEN se muestra la propiedad en un mapa público
- THEN el mapa MUST usar el centro aproximado de la localidad declarada
- AND MUST conservar el redondeo de privacidad
- AND MUST dejar intacta la coordenada guardada y la coordenada privada del anunciante

### Requirement: Respaldo de pines sincronizado y agrupado
#### Scenario: Las capas del mapa no se pintan
- GIVEN las capas GeoJSON no se pueden pintar y se activa el respaldo de marcadores DOM
- WHEN cambian las propiedades filtradas o el usuario desplaza o acerca el mapa
- THEN el respaldo MUST actualizarse con las propiedades vigentes y retirar pines obsoletos
- AND MUST agrupar propiedades cercanas en pantalla con un conteo accesible
- AND al pulsar un grupo MUST mostrar sus propiedades o acercar el mapa al grupo

### Requirement: Worker de MapLibre empaquetado
El build MUST incluir el worker de MapLibre y sus dependencias como recursos JavaScript servibles, y configurar MapLibre para usar el URL emitido por Vite.

#### Scenario: Abrir cualquier mapa de MapLibre
- GIVEN el Worker de Cubitat aplica fallback SPA a las rutas desconocidas
- WHEN el usuario abre un mapa de búsqueda, de ubicación en una ficha, de dirección al publicar o editar, o agregado en un catálogo
- THEN la URL del worker MUST responder con JavaScript del build, no con `index.html`
- AND MapLibre MUST cargar teselas vectoriales y dibujar el mapa base además de sus marcadores o capas
- AND todas las entradas a MapLibre MUST reutilizar la configuración del worker empaquetado
- AND un fallo del worker MUST registrarse como error de recurso del mapa

### Requirement: Mapa agregado responsive en catálogos
El panel agregado de Servicios y Materiales MUST permanecer visible al abrirse
en cualquier tamaño de pantalla. En pantallas estrechas MUST ocupar la ventana
como diálogo modal, permitir cierre explícito y con Escape, y bloquear el scroll
del documento mientras esté abierto. En escritorio MUST aparecer junto a los
filtros y resultados, con altura de ventana y posición sticky. Los estados de
carga y error MUST conservar el mismo comportamiento de cierre y no ocultar los
catálogos en escritorio.

#### Scenario: Abrir mapa en móvil
- GIVEN el usuario abre el mapa desde Servicios o Materiales en una pantalla
  estrecha
- WHEN el mapa está cargando, listo o en error
- THEN el panel ocupa la pantalla y ofrece un botón visible para cerrarlo
- AND Escape cierra el panel y se restaura el scroll del documento

#### Scenario: Abrir mapa en escritorio
- GIVEN el usuario abre el mapa desde Servicios o Materiales en una pantalla
  amplia
- WHEN se muestran filtros, resultados y mapa
- THEN las tres áreas aparecen simultáneamente
- AND el panel del mapa mantiene su altura visible y acompaña el scroll con
  posición sticky

#### Scenario: Ficha con mapa que falla antes de cargar
- GIVEN una ficha cuyo mapa no carga el estilo o no emite el evento `load`
- WHEN MapLibre informa el error o vence el límite de 15 segundos
- THEN la ficha MUST conservar sus demás datos
- AND MUST mostrar un aviso y permitir reintentar el mapa
- AND MUST registrar solo un código de error seguro, sin URL ni datos personales

#### Scenario: Mapa de dirección que no carga durante publicación o edición
- GIVEN una persona coloca el pin en el formulario de publicación o edición
- WHEN falla el estilo o MapLibre no emite `load` en 15 segundos
- THEN el formulario MUST dejar de mostrar un spinner indefinido
- AND MUST informar que el mapa no está disponible y ofrecer reintentar
- AND MUST conservar los demás campos y permitir continuar el formulario
- AND al reintentar MUST detener la instancia anterior del mapa

#### Scenario: Conservar las coordenadas del pin en el formulario
- GIVEN el usuario selecciona provincia y municipio y coloca un pin en el mapa
- WHEN guarda el borrador local y vuelve a abrir el formulario
- THEN MUST restaurar las coordenadas seleccionadas junto con los demás datos
- AND al enviar una edición MUST incluir las coordenadas restauradas en el payload
- AND al cargar una propiedad editada MUST volver a mostrar el punto guardado

#### Scenario: Elegir una ubicación en pantalla móvil
- GIVEN la publicación se abre en un viewport de 390 px de ancho
- WHEN el usuario selecciona provincia y municipio y pulsa el mapa
- THEN MUST poder colocar el pin y ver las coordenadas seleccionadas
- AND el documento MUST NOT desbordarse horizontalmente

#### Scenario: Reintentar después de que se atasca la descarga compartida del estilo
- GIVEN la petición del estilo cartográfico no responde dentro del límite
- WHEN la interfaz informa del fallo y el usuario reintenta
- THEN MUST cancelar la petición anterior y liberar su estado compartido
- AND MUST iniciar una nueva descarga en lugar de reutilizar la promesa atascada

#### Scenario: Filtrar un catálogo desde el mapa de anuncios
- GIVEN el mapa de Servicios o Materiales está abierto junto al catálogo
- WHEN el usuario desplaza el mapa o selecciona un anuncio o cluster
- THEN MUST mostrar únicamente las tarjetas de los anuncios públicos dentro del
  viewport o grupo seleccionado, como en Comprar
- AND MUST mantener aplicados los filtros del catálogo y conservar el mapa abierto
- AND MUST usar las coordenadas públicas aproximadas, nunca las privadas.

### Verificación en DEV — 2026-11-13

Chromium abrió el mapa real de ambos catálogos y pulsó el marcador de Pinar del
Río. Servicios pasó de 15 a 7 tarjetas y Materiales de 15 a 2; el selector
reflejó la provincia, se mantuvo la URL y no hubo navegación de documento. La
lectura fue pública y no escribió datos. El test no cubre viewport móvil ni
cierre del panel.

### Verificación del formulario de dirección en DEV — 2026-11-14

Playwright comprobó en local y Worker DEV: carga del canvas/worker/teselas;
selección del pin y restauración tras guardar y recuperar el borrador local;
fallo controlado del estilo y recuperación con el botón de reintento; y pin en
viewport móvil de 390×844 sin desborde horizontal (3/3 escenarios en cada
entorno). La suite unitaria comprueba que la edición reenvía latitud/longitud
en el payload. No se creó ni editó una fila real en Supabase; esa persistencia
sigue pendiente de una prueba autenticada.

En 390×844, los mapas provinciales de Servicios y Materiales abrieron en panel
móvil, recibieron el worker y teselas con HTTP 200, cerraron y restauraron el
scroll del documento sin desborde horizontal (2/2 en local y DEV). En local,
las lecturas de catálogos usaron listas vacías simuladas por no estar activo
Supabase local; DEV usó el catálogo publicado en modo solo lectura.

### Revalidación fría del mapa provincial móvil — 2026-11-14

Una sesión Chromium fría reprodujo que el overlay podía cubrir el mapa hasta que
terminaran todas las fuentes/teselas (cerca de 40 s), y que la carga diferida
demoraba el diálogo móvil. El fallback ahora es modal de inmediato y la capa de
carga se retira tras cargar el estilo y añadir las capas interactivas. Gates:
lint; Vitest 228 archivos, 1,047 PASS/1 omitida; build general y `phase34-dev`.
Playwright local y contra Worker DEV: 2/2 móvil; el estilo/capas quedan visibles
antes de esperar las teselas, que luego responden 200. Worker DEV
`f1b8d5b7-816f-4193-9da3-717cfd8eba7f`, 100%. Producción intacta.

### Mapas en fichas de Servicios y Materiales — 2026-11-24

- Las fichas SVC/MAT usan la misma geometría de ubicación aproximada que Comprar: radio de 500 m, diámetro de 1 km, solo cuando el anuncio tiene coordenadas.
- Si solo existe provincia, el mapa usa el centro provincial como contexto, sin pin ni círculo que sugieran precisión inexistente.
- El cambio de Fotos/Mapa reutiliza el visor de la ficha; la visualización del mapa sigue siendo diferida.

### Mapas de catálogo SVC/MAT basados en Comprar — implementación local 2026-11-25

- Los directorios ya consumen todas las páginas de resultados que coinciden con
  los filtros y tienen coordenadas públicas, no solo la página de tarjetas.
- El adaptador de Comprar genera los clusters y notifica el área visible; los
  catálogos filtran sus tarjetas por esos ids y resaltan las selecciones de
  puntos o grupos.
- La consulta carga solo la portada de cada anuncio. Las coordenadas pasan por
  el mismo redondeo público de privacidad que Comprar; nunca se solicita la
  tabla privada.
- Verificado en local cuando pasen lint, la suite completa y el E2E móvil. La
  integración y verificación en producción siguen pendientes.

### Publicación de Servicios y Materiales: selección de zona y ubicación del dispositivo — 2026-11-24

#### Scenario: Centrar el mapa en provincia y municipio seleccionados
- GIVEN un anunciante publica o edita un servicio o un material
- WHEN selecciona provincia y municipio
- THEN MUST mostrar los municipios válidos para la provincia seleccionada
- AND MUST centrar el mapa en la localidad elegida
- AND MUST reiniciar el municipio y el punto previamente marcado al cambiar la provincia
- AND MUST exigir una provincia y un municipio antes de avanzar

#### Scenario: Usar la ubicación del dispositivo en publicación
- GIVEN el navegador está en un origen seguro compatible con geolocalización
- WHEN el anunciante pulsa «Usar mi ubicación» y concede permiso
- THEN MUST centrar el mapa y colocar el marcador en las coordenadas obtenidas
- AND MUST permitir ajustar el punto manualmente
- AND MUST explicar de forma accesible si faltan permisos, no hay señal o vence el tiempo de espera
- AND MUST conservar las coordenadas según el almacenamiento privado existente del tipo de publicación
- AND la política de permisos HTTP MUST permitir geolocalización únicamente al mismo origen (`geolocation=(self)`)
