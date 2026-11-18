# Directorio de profesionales del hogar

## Propósito

Permitir que propietarios y negocios publiquen servicios para vivienda y que
visitantes descubran profesionales por categoría y zona. La publicación es un
listado comercial moderado; no certifica licencias, identidad profesional ni
calidad del trabajo.

## Requisitos

### Listado y detalle públicos

- **WHEN** una persona filtra el directorio desde escritorio o móvil
- **THEN** la barra usa el estilo compacto de los filtros de Comprar
- **AND** aplica los cambios al catálogo sin recargar ni navegar
- **AND** móvil ofrece una hoja de filtros con opción para limpiar y el total
  actualizado de resultados

- **WHEN** un visitante abre el directorio o filtra por texto,
  categoría/provincia/municipio
- **THEN** solo ve perfiles con estado `published`
- **AND** el filtrado y la paginación se ejecutan en la base de datos y el total
  mostrado representa todas las coincidencias
- **AND** la respuesta pública no incluye datos privados de cuenta ni estados
  internos de moderación
- **AND** la ficha muestra categoría, descripción, zonas de cobertura, galería,
  fecha de actualización y formas de contacto públicas elegidas por el proveedor
- **AND** al abrir una ficha desde el directorio o al volver a ella con el
  historial del navegador, muestra carga antes de consultar; “Servicio no
  disponible” solo aparece después de una respuesta correcta sin perfil

### Publicación y edición

- **GIVEN** un usuario autenticado
- **WHEN** crea un perfil profesional
- **THEN** queda `pending_review` y no aparece en el directorio público
- **AND** el propietario solo puede editar su propio perfil
- **AND** cambios sustanciales a un perfil público vuelven a revisión

Mientras las fotos se preparan, el formulario bloquea el envío y no crea ni
actualiza el perfil antes de completar el lote.

### Moderación

- **WHEN** un administrador con AAL2 aprueba, rechaza o pausa un perfil
- **THEN** se registra actor, fecha y motivo cuando corresponda
- **AND** un usuario sin rol y nivel de autenticación requeridos no puede moderar

### Accesibilidad y conectividad

- Las páginas deben ser utilizables en móvil, por teclado y con lector de
  pantalla; contemplan carga, error, estado vacío y reintento.
- En dispositivos táctiles, los botones del encabezado, filtros, acciones del
  directorio, paginación y mapa MUST ofrecer objetivos de al menos 48×48 px; los
  campos de texto móviles MUST usar fuente de al menos 16 px.
- Al abrir “Mostrar mapa” en escritorio, filtros y resultados permanecen en una
  columna izquierda y el mapa aparece simultáneamente a la derecha, como en
  Comprar/Rentar; en móvil el mapa ocupa la pantalla y se puede cerrar. El
  acceso al mapa queda en un botón flotante fijo, accesible al desplazarse por
  el directorio; al abrirlo en móvil, el propio mapa ofrece el cierre.
- Los filtros se presentan con el patrón visual de Comprar. Hasta 768 px se
  muestra búsqueda y un botón de filtros que abre una hoja inferior con
  categoría, provincia y municipio; cambiar filtros actualiza la consulta
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
- La API secundaria de consulta privada sigue exigiendo sesión y RLS para
  `home_service_inquiries`; el formulario principal de contacto público usa
  `marketplace_contact_leads` tras Turnstile.
- En móvil, la acción flotante para abrir el mapa permanece por encima de la
  navegación inferior y no intercepta sus controles.
- Si falla la carga inicial del estilo del mapa, se puede reintentar desde el
  mismo panel sin cerrar el mapa ni abandonar los filtros del directorio.
- El directorio y Favoritos MUST firmar solo la foto de portada de cada perfil
  para sus tarjetas; la ficha MUST firmar la galería completa al abrirse. Las
  tarjetas MUST cargar imágenes bajo demanda, con prioridad para las primeras
  portadas visibles y fallback accesible. El repositorio MUST solicitar a
  Storage una miniatura firmada de 420×192, recorte `cover`, calidad 65, y MUST
  recurrir a una URL firmada original si falla la transformación. La ficha y la
  galería del propietario MUST seguir sirviendo originales. Las URLs firmadas
  privadas MUST conservarse sin reescritura.
- El formulario permite seleccionar varias fotos de trabajos en una sola
  operación, hasta 10 por perfil; valida JPEG/PNG/WebP y 5 MiB por archivo,
  comprime en el navegador a WebP de hasta 800×800 px y calidad 0.70, y muestra
  miniaturas removibles en el orden seleccionado con la primera como portada.
- Las fotos nuevas se guardan en `home-service-photos`, bucket privado, y solo
  se pueden consultar públicamente cuando una fila publicada las referencia.
  Si la preparación falla no agrega parte del lote; una carga parcial limpia
  los objetos nuevos y permite reintentar sin perder la selección.
- Si el guardado del perfil devuelve un rechazo definitivo `42501`, elimina
  solo los objetos nuevos que aún no están referenciados y conserva la selección
  para reintentar. Si la respuesta es ambigua, conserva los objetos y pide
  revisar Mis perfiles antes de abandonar el formulario. Un reintento dentro del
  mismo formulario MUST conservar el ID del perfil y reutilizar las rutas de las
  fotos ya cargadas. Si el primer INSERT se confirmó pero se perdió su respuesta,
  el conflicto de clave primaria MUST actualizar el borrador del mismo propietario
  en vez de crear una segunda fila. La inserción concede al propietario permiso
  de columna para ese ID estable, conserva los permisos mínimos de las demás
  columnas y sigue limitada por RLS al dueño autenticado y estado pendiente. Un
  fallo de red al retirar fotos antiguas no
  convierte un guardado ya confirmado en fallo.
- Las galerías heredadas con rutas privadas de tres segmentos se firman desde
  `home-service-profiles`; las rutas nuevas de dos segmentos se firman desde
  `home-service-photos`. La firma es temporal y conserva el orden de galería;
  las rutas inválidas o los objetos no disponibles no se presentan como fotos.
- Ambos buckets conservan una lectura pública acotada a rutas referenciadas por
  un perfil publicado; las rutas antiguas también permiten lectura privada al
  propietario autenticado y a moderación con AAL2. El bucket antiguo no admite
  cargas nuevas.
- Los enlaces HTTPS heredados se conservan al editar; no se aceptan como
  imágenes nuevas. Las URLs firmadas son temporales y nunca se guardan en la
  fila del perfil.
- Las políticas privadas de Storage no requieren conceder a `anon` o
  `authenticated` acceso directo a `owner_id`; las comprobaciones públicas y de
  limpieza usan funciones `SECURITY DEFINER` con permisos mínimos.
- El teléfono o WhatsApp se consulta en el Worker al pulsar explícitamente la
  acción del canal; el catálogo nunca los incluye y el Worker limita intentos
  por IP. La interfaz inicia la acción directamente y muestra un error
  recuperable si no se puede abrir.
- Las tarjetas reutilizan los CTA y destinos de Comprar: “Contactar” abre una
  llamada y “Consultar” abre WhatsApp sin modal intermedio. El contacto nunca
  aparece en la respuesta del catálogo; el Worker limita intentos por IP. Si el
  canal falta, se abre la ficha y se puede usar el formulario público protegido
  con Turnstile, que guarda un lead privado para el propietario.
- Si un perfil publicado no declara teléfono ni WhatsApp, la interfaz explica
  cuál canal falta y conserva el formulario de consulta; no presenta el caso
  como un fallo de red ni como un perfil inexistente.
- Una persona autenticada puede guardar o quitar perfiles publicados desde las
  tarjetas y la ficha; sus Servicios guardados aparecen en Favoritos junto con
  sus propiedades y materiales. Los visitantes sin sesión reciben el flujo
  compartido de inicio de sesión. En DEV, las escrituras pasan por la lista
  explícita del Worker proxy y quedan limitadas además por RLS al usuario dueño.
- Reseñas son una extensión opcional especificada en
  `phase4-review-reputation/spec.md`; el directorio sigue funcionando apagada.

### Detalle y acciones del anuncio

- La ficha presenta en un hero compartido la categoría, nombre, zona, galería y
  acciones; el hero se apila en móvil y mantiene el contenido de contacto a mano.
- La cabecera y las pestañas reutilizan `CatalogDetailHero` y
  `CatalogDetailTabs` con propiedades y Materiales. La pestaña seleccionada
  muestra un panel exclusivo (Detalles, Cobertura o Reseñas habilitadas); el
  formulario de contacto permanece visible junto al panel.
- «Contactar» y «Consultar» conservan los botones y destinos por canal de
  Comprar. La llamada/WhatsApp se inicia sin modal ni Turnstile intermedio; el
  Worker aplica límite por IP y Turnstile sigue protegiendo el formulario de
  consulta escrita.
- «Compartir» usa el panel del dispositivo y copia el enlace como alternativa.
- El formulario público de lead permanece visible en la ficha, en una columna
  lateral pegajosa en pantallas grandes.
- «Guardar» en DEV permite añadir o quitar perfiles publicados desde tarjetas
  y ficha. Los guardados aparecen en Favoritos junto con propiedades y
  materiales; los perfiles privados no se guardan ni se muestran.
- Las tarjetas priorizan las dos primeras imágenes visibles y cargan las demás
  de forma diferida y asíncrona. URLs de Unsplash usan parámetros de miniatura;
  fuentes externas distintas conservan su URL y muestran un reemplazo visual si
  la carga falla.
- Las acciones de moderación no se presentan como acciones públicas del perfil.

### Compartir en escritorio y móvil
- GIVEN una ficha pública de servicio abierta en escritorio o móvil
- WHEN la persona selecciona «Compartir»
- THEN escritorio MUST copiar el enlace y móvil MUST conservar el panel nativo si está disponible.
