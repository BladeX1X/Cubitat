# Modulo de Media

## Purpose
Define el manejo de imagenes usadas en publicaciones, catalogo y detalle.

## Requirements

### Requirement: Normalizacion de imagenes
El sistema MUST normalizar imagenes de propiedades para que catalogo y detalle usen una galeria consistente.

#### Scenario: Propiedad con imagen principal y galeria
- GIVEN una propiedad tiene `cover_image` e imagenes adicionales
- WHEN el sistema renderiza una tarjeta o detalle
- THEN MUST construir una galeria ordenada
- AND MUST usar imagen principal como primer elemento
- AND MUST evitar duplicados visuales cuando la imagen principal tambien aparece en la lista

#### Scenario: Galeria en detalle
- GIVEN una propiedad tiene varias imagenes normalizadas
- WHEN se renderiza detalle
- THEN el sistema MUST mostrar galeria responsive
- AND MUST permitir abrir vista ampliada cuando exista accion de fotos
- AND MUST mantener orden consistente entre desktop y movil

### Requirement: Optimizacion de carga
El sistema MUST optimizar URLs y atributos de imagen segun contexto de uso.

#### Scenario: Cargar catalogo
- GIVEN una propiedad aparece en resultados
- WHEN la tarjeta esta fuera de las primeras posiciones
- THEN sus imagenes SHOULD cargarse de forma diferida
- AND las primeras tarjetas MAY priorizar imagen para mejorar percepcion de velocidad

#### Scenario: Imagen prioritaria en resultados
- GIVEN se renderiza la primera pagina de resultados
- WHEN las primeras tarjetas entran sobre el fold
- THEN el sistema MAY usar carga prioritaria solo para la imagen principal de las dos primeras tarjetas
- AND las tarjetas posteriores SHOULD usar lazy loading y prioridad de red baja

#### Scenario: Imagenes comerciales bajo el fold
- GIVEN home muestra el hero antes de las tarjetas de provincias
- WHEN se inicia la carga de la portada
- THEN solo la imagen del hero MUST conservar prioridad alta
- AND las tarjetas de provincias MUST usar lazy loading y prioridad de red baja

### Requirement: Resiliencia ante imagenes faltantes
El sistema MUST mostrar placeholders o fondos seguros cuando falten imagenes.

#### Scenario: Imagen ausente
- GIVEN una propiedad no tiene imagen valida
- WHEN se renderiza catalogo, preview de mapa o detalle
- THEN el sistema MUST mostrar un placeholder estable
- AND no MUST romper el layout ni desplazar controles

#### Scenario: Imagen rota
- GIVEN una URL de imagen falla al cargar
- WHEN se renderiza tarjeta, preview o detalle
- THEN el sistema MUST mantener dimensiones reservadas
- AND SHOULD mostrar fallback visual estable

### Requirement: Validacion de media en publicacion
El sistema MUST validar tipo, cantidad y peso de imagenes antes de subir o persistir.

#### Scenario: Archivo no soportado
- GIVEN un usuario selecciona un archivo que no es imagen valida
- WHEN el flujo de publicacion procesa archivos
- THEN el sistema MUST rechazar ese archivo
- AND MUST mostrar error entendible sin bloquear archivos validos restantes

#### Scenario: Limite de imagenes excedido
- GIVEN el usuario intenta subir mas imagenes que el maximo permitido
- WHEN el sistema procesa la seleccion
- THEN MUST aceptar solo hasta el limite definido
- AND MUST informar cuantas imagenes quedaron fuera

#### Scenario: Archivo excesivo o imagen de resolucion peligrosa
- GIVEN un usuario selecciona una imagen para una propiedad o avatar
- WHEN el archivo supera el limite de entrada o sus dimensiones exceden el maximo seguro
- THEN el sistema MUST rechazarlo antes de dibujarlo en canvas cuando sea posible
- AND Storage MUST aceptar solo WebP optimizado con limite de bytes por bucket
- AND las escrituras MUST quedar aisladas en la carpeta del usuario autenticado

### Requirement: Seguridad de URLs de imagen
El sistema MUST tratar URLs de imagen como datos no confiables hasta normalizarlas.

#### Scenario: URL externa insegura
- GIVEN una propiedad contiene una URL externa malformada o no soportada
- WHEN se normalizan imagenes
- THEN el sistema MUST descartarla o reemplazarla por fallback
- AND MUST evitar inyectar contenido ejecutable desde campos de imagen

### Requirement: Señales de coincidencia perceptual para moderación
En DEV, el sistema MUST calcular en el Worker un hash perceptual de las imágenes
WebP guardadas y comparar sus bits con imágenes de publicaciones activas. Una
coincidencia es una señal privada para revisión humana; nunca MUST rechazar o
publicar automáticamente una propiedad.

#### Scenario: Nueva publicación con imagen similar
- GIVEN el propietario guarda una publicación con al menos una imagen WebP
- WHEN el Worker termina de calcular sus hashes perceptuales
- THEN MUST guardar los hashes con acceso restringido al administrador AAL2 y al service role
- AND MUST mostrar al moderador la publicación relacionada y la distancia de Hamming sobre 64 bits
- AND MUST clasificar 0 bits distintos como hash idéntico, 1–4 como similitud alta y 5–8 como coincidencia parcial
- AND MUST instruir al moderador a comparar fotos y datos del inmueble y confirmar solo si es la misma propiedad
- AND MUST conservar como guía que 5–8 bits es una coincidencia parcial de menor fuerza que 1–4 bits
- AND MUST conservar la decisión final en manos del moderador
- AND MUST NOT rechazar automáticamente por ninguna distancia perceptual

#### Scenario: publicación aún no comparada

- **GIVEN** una publicación de moderación todavía no tiene hashes procesados
- **WHEN** el moderador consulta su tarjeta
- **THEN** se muestra que la revisión está pendiente o no pudo procesar imágenes
- **AND** el sistema MUST NOT presentar la ausencia de señales como ausencia de coincidencias

#### Scenario: publicación sin coincidencias y cobertura incompleta

- **GIVEN** el hash de una publicación ya fue procesado pero el backfill del catálogo sigue en curso
- **WHEN** no se encontraron coincidencias entre los hashes disponibles
- **THEN** el panel indica cuántas publicaciones con imágenes están indexadas del total elegible
- **AND** MUST indicar que la revisión sigue incompleta

#### Scenario: publicación sin coincidencias y catálogo indexado

- **GIVEN** el hash de una publicación y todo el catálogo activo con imágenes fueron procesados
- **WHEN** no hay señales de duplicación
- **THEN** el panel confirma que no se encontraron coincidencias en el catálogo activo indexado

#### Scenario: El inventario previo aún no tiene hashes
- GIVEN una publicación activa no tiene hashes perceptuales
- WHEN el Worker procesa una nueva publicación
- THEN SHOULD indexar gradualmente un máximo acotado de publicaciones previas
- AND MUST evitar procesar URLs fuera del bucket `property_images` del proyecto DEV
- AND MUST aceptar la ruta privada del Worker DEV `/api/supabase/storage/v1/object/public/property_images/` además de la URL directa de Storage de DEV
- AND MUST reintentar registros activos con cero imágenes procesadas después de un intervalo acotado

#### Scenario: Error transitorio al calcular o guardar un hash
- GIVEN el Worker no puede descargar/decodificar una WebP o guardar el resultado por un fallo transitorio
- WHEN intenta indexar la publicación
- THEN MUST reintentar un máximo acotado de tres veces
- AND MUST dejar la publicación sin estado de indexación si no pudo calcular y guardar el resultado
- AND MUST registrar un evento técnico sin URL, contenido de imagen ni identificadores del usuario
