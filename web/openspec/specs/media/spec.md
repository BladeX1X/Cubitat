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

#### Scenario: Logotipo responsive en la cabecera
- GIVEN la cabecera muestra el logotipo a 150 px en móvil o hasta 178 px en escritorio
- WHEN el navegador selecciona un recurso de imagen
- THEN MUST escoger una variante WebP adecuada a su viewport y densidad de píxeles
- AND MUST conservar una variante de respaldo para navegadores sin `srcset`

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

#### Scenario: Descubrir pronto la imagen LCP de la portada
- GIVEN la portada incluye una imagen responsive de hero como elemento LCP
- WHEN el navegador lee el documento inicial
- THEN el HTML MUST precargar la imagen con variantes y tamaños compatibles con el `srcset` del hero
- AND MUST conservar una sola imagen con prioridad de red alta en la portada

#### Scenario: Logotipo optimizado
- GIVEN el logotipo se muestra en cabecera, fallback o login
- WHEN se descarga en navegadores modernos
- THEN MUST servirse en un formato moderno y dimensiones adecuadas al tamaño visual
- AND MUST conservar proporción y transparencia

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

### Requirement: Privacidad de las fotos de propiedades en el caché PWA
El service worker MUST NOT conservar fotos de `property_images` en su caché
compartido de imágenes públicas. Al activarse una nueva versión, MUST eliminar
las URLs heredadas de ese bucket del caché anterior.

#### Scenario: Una propiedad deja de estar publicada
- GIVEN una foto de propiedad pudo guardarse en el caché PWA de una versión anterior
- WHEN el nuevo service worker se activa
- THEN MUST purgar las entradas directas de Supabase y las del proxy del mismo
  origen
- AND MUST mantener otros objetos públicos, como avatares, cuando la purga
  selectiva funciona
- AND SHOULD eliminar el caché completo de imágenes si no puede inspeccionar o
  purgar entradas selectivamente

#### Scenario: Cachear otros objetos públicos
- GIVEN una solicitud pertenece a un bucket público distinto de `property_images`
- WHEN la respuesta se almacena en caché
- THEN MUST corresponder a Supabase configurado o al proxy del mismo origen
- AND MUST tener estado HTTP 200

### Requirement: Señales de coincidencia perceptual para moderación
En los perfiles DEV y `phase2-production`, el sistema MUST calcular en el Worker un hash perceptual de las imágenes
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
- **AND** MUST contar como elegibles solo imágenes WebP del bucket `property_images` guardadas bajo la carpeta del propietario
- **AND** MUST explicar que los enlaces externos y las imágenes de stock no forman parte de la cobertura comparable

#### Scenario: publicación sin coincidencias y catálogo indexado

- **GIVEN** el hash de una publicación y todas las imágenes comparables del catálogo activo fueron procesados
- **WHEN** no hay señales de duplicación
- **THEN** el panel confirma que no se encontraron coincidencias en las imágenes comparables indexadas

#### Scenario: El inventario previo aún no tiene hashes
- GIVEN una publicación activa no tiene hashes perceptuales
- WHEN el Worker procesa una nueva publicación
- THEN SHOULD indexar gradualmente un máximo acotado de publicaciones previas
- AND MUST evitar procesar URLs fuera del bucket `property_images` del proyecto configurado
- AND MUST aceptar la ruta del Worker del entorno activo `/api/supabase/storage/v1/object/public/property_images/` además de la URL directa de Storage del mismo proyecto
- AND MUST reintentar registros activos con cero imágenes procesadas después de un intervalo acotado

#### Scenario: Error transitorio al calcular o guardar un hash
- GIVEN el Worker no puede descargar/decodificar una WebP o guardar el resultado por un fallo transitorio
- WHEN intenta indexar la publicación
- THEN MUST reintentar un máximo acotado de tres veces
- AND MUST dejar la publicación sin estado de indexación si no pudo calcular y guardar el resultado
- AND MUST registrar un evento técnico sin URL, contenido de imagen ni identificadores del usuario

### Requirement: pHash productivo con revisión humana

El perfil `phase2-production` MUST apuntar exclusivamente al Supabase productivo
y MUST incluir la moderación pHash, sin exponer fingerprints a usuarios ni a
`anon`. El Worker MUST validar sesión, propiedad, límite de solicitudes, bucket,
formato WebP y límites de bytes/dimensiones. Las RPC de estado y candidatas MUST
requerir administrador AAL2; los fallos o coincidencias MUST NOT publicar,
rechazar ni ocultar anuncios automáticamente.

#### Scenario: Promoción progresiva de imágenes

- GIVEN el esquema productivo pHash está aplicado y el Worker tiene activa su
  bandera explícita
- WHEN se crea una publicación o el Cron toma una existente
- THEN el Worker MUST procesar como máximo el lote configurado por ciclo y
  comparar solo imágenes del bucket de propiedades del proyecto productivo
- AND las señales se muestran únicamente al moderador AAL2 para decisión humana
