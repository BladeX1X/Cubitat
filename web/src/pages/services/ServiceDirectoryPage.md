# ServiceDirectoryPage

F4-SVC muestra el directorio y el detalle. Las reseñas están ocultas temporalmente
en la interfaz pública; su módulo y datos no se modifican.

## Responsabilidad

Presenta el directorio público de profesionales del hogar y el detalle de cada
perfil publicado. Permite filtrar en servidor por texto, categoría, provincia
y municipio, cargar resultados por páginas con total exacto, enviar una consulta
privada, proponer una reseña pendiente de moderación y navegar a la solicitud de
publicación de un perfil. El mapa opcional agrega conteos por provincia bajo
los filtros actuales (excepto la provincia seleccionada), sin exponer
coordenadas de perfiles ni reemplazar la paginación. La acción “Mis perfiles” abre una gestión privada;
solo perfiles no publicados se editan y los publicados no exponen edición hasta
definir el flujo de pausa/revisión.

Las tarjetas y fichas comparten las acciones directas Contactar y Consultar con
Materiales. Contactar inicia la llamada y Consultar abre WhatsApp con el anuncio
y su zona. Si falta el canal, ofrece abrir la ficha y enviar una consulta.

Las tarjetas usan `CatalogCardFrame`, compartido con Comprar y Materiales: ancho
máximo centrado de 72 rem, columnas desde 320 px, portada 16:9, estructura
vertical común y acciones alineadas al borde inferior.

La ficha reutiliza `MarketplaceListingDetail` con Materiales. Sus secciones
muestran categoría, municipio y provincia de cobertura, descripción y fecha de
actualización; conserva la galería original con flechas/puntos y el formulario
público para contactar al profesional.
Los botones Fotos y Mapa aparecen sobre la galería. Fotos abre el carrusel
completo y mantiene sincronizada la imagen seleccionada; Mapa enseña la
provincia declarada como cobertura, sin indicar el domicilio ni un punto exacto
de atención.

La tarjeta lateral de contacto adopta la presentación de Comprar (encabezado,
fecha de actualización, etiqueta, campo y CTA), adaptada al mensaje para el
profesional. El envío sigue guardándose como consulta privada de la cuenta.

El encabezado del directorio solo muestra el título; publicar un servicio y
administrar perfiles propios se accede desde el flujo universal de publicación
y el centro de cuenta, respectivamente.

## Reglas

- Solo se consultan perfiles publicados; no muestra información interna de
  moderación.
- El mapa se carga bajo demanda y usa conteos de todas las páginas que cumplen
  texto, categoría y municipio; seleccionar una provincia aplica el filtro del
  catálogo. El mapa muestra ubicaciones provinciales aproximadas, no domicilios.
- En móvil, el encabezado principal se desplaza con la página para no tapar la
  búsqueda sticky; la barra permanece a 8 px del borde superior. La barra
  reutiliza Comprar: en pantallas de hasta 768 px presenta búsqueda y
  botón circular de filtros; el botón abre una hoja inferior con categoría,
  provincia y municipio. Los cambios se aplican en la vista actual y la hoja
  ofrece limpiar y ver resultados. En escritorio, filtros y búsqueda aparecen
  en la barra; el desbordamiento de controles se contiene dentro de ella. La
  barra sticky queda bajo el encabezado (76 px escritorio, 104 px tablet y
  64 px móvil); el encabezado conserva las acciones compactas del directorio.
- En pantallas táctiles, los botones del encabezado, filtros, acciones de
  tarjetas y mapa tienen objetivos de al menos 48×48 px; las cajas de búsqueda
  usan fuente de 16 px para evitar el zoom automático del navegador móvil.
- Cambiar o limpiar filtros consulta el servidor sin navegación/recarga completa;
  conserva la barra, el mapa, las tarjetas actuales y su contador hasta recibir
  los datos nuevos. El refresco se anuncia sin sustituir la cuadrícula.
- La paginación numerada consulta 15 profesionales por página y vuelve a la
  página 1 al cambiar o limpiar filtros.
- En móvil, mapa y estados de carga/error ocupan la pantalla y se cierran con el
  botón o Escape; en escritorio, al activar “Mostrar mapa”, filtros y tarjetas
  quedan en la columna izquierda y el mapa fijo al viewport en la derecha,
  siguiendo la presentación de Comprar/Rentar. El control “Mostrar mapa” queda
  fijo y accesible al desplazarse; en móvil se ubica sobre la navegación inferior
  y se oculta mientras el mapa está abierto para dejar disponible el botón de
  cierre propio.
- Los teléfonos no aparecen en listados; solo se consultan al pulsar una acción
  explícita y el Worker aplica límite por IP.
- La consulta privada continúa requiriendo cuenta autenticada.
- Al abrir una ficha, anuncia la carga hasta recibir la respuesta. Si la consulta
  falla, distingue el error de red de un perfil inexistente y ofrece reintentar;
  solo muestra “Servicio no disponible” tras confirmar que no hay perfil público.
- Una reseña queda pendiente; el promedio y los textos visibles vienen de RPCs
  públicas que solo proyectan opiniones aprobadas y no identifican al autor.
- Los errores de sesión se manejan sin exponer mensajes del proveedor.
- El componente se importa solo cuando el registro de capacidades habilita
  F4-SVC; el perfil productivo usa Supabase de producción y el perfil DEV usa
  Supabase DEV.
- El perfil `phase34-dev` muestra un identificador visible de entorno DEV en el
  catálogo para distinguirlo de producción.
- Cuando está habilitada la bandera de fase 4 de Servicios, cada tarjeta ofrece el control de favoritos compartido con Materiales;
  el proveedor mantiene el estado de sesión y persiste la relación por usuario.
- Las tarjetas usan `CatalogCardGallery`, compartida con Materiales, con flechas
  y puntos accesibles al mostrar varias fotos. El directorio firma las fotos de
  la galería para el carrusel; Favoritos sigue firmando solo la portada. La ficha
  firma la galería completa al abrirse. Las tarjetas usan `MarketplaceCardImage`:
  las dos
  primeras portadas se cargan con prioridad alta, las siguientes de forma
  diferida, todas con decodificación asíncrona y fallback accesible. Unsplash
  entrega miniaturas a 420 px/calidad 45; las URLs firmadas de Storage piden
  miniaturas de 420×192, recorte `cover` y calidad 65. Si Storage no acepta la
  transformación, el repositorio vuelve a firmar el original. La ficha y las
  galerías de gestión siguen usando originales; las firmas se conservan sin
  reescritura.
- Las rutas privadas de galería heredadas (tres segmentos) se firman desde
  `home-service-profiles`; las actuales (dos segmentos) desde
  `home-service-photos`. La página conserva el orden publicado y usa el fallback
  si Storage no devuelve una URL firmada.

## Verificación

Regresión local de mapa y filtros: al seleccionar Matanzas desde el mapa, la
consulta de catálogo recibe la provincia, limpia el municipio dependiente,
restablece la página 1 y conserva el mapa abierto sin cambiar la URL. La página
responde a la selección del marcador validada por `provinceMapInteractions`.
La prueba no sustituye la interacción visual autenticada en DEV.

QA DEV público con Chromium — 2026-11-13: clic real en el marcador de Pinar del
Río cambió el selector y filtró el catálogo de 15 a 7 tarjetas, sin cambiar la
URL ni recargar el documento. Fue solo lectura; no incluye pruebas autenticadas
ni de móvil.

Revisar estados de carga/error/vacío, formulario y layout móvil en DEV antes de
habilitarlo en producción.

Regresión local — 2026-11-14: las acciones de ambos catálogos se verificaron
directas; WhatsApp abre con el mensaje contextual y sin recargar la página, y
un canal ausente ofrece la ficha/formulario. 4/4 pruebas E2E sintéticas PASS.

Verificación DEV — 2026-11-14: tras aplicar la política de lectura para el
bucket legado, la ficha del perfil sintético
`qa-dev-svc-20261110-electricidad-matanzas` carga visualmente su imagen de ruta
antigua de tres segmentos. El catálogo DEV mostró 9/9 imágenes cargadas; la
medición de payload encontró fotos de hasta 1333×1000. Producción intacta.

Regresión local — 2026-11-14: el listado firma solo la portada de cada perfil;
la ficha aún firma todas sus fotos. 3/3 pruebas unitarias PASS.

DEV — 2026-11-14: Worker `cubitat1-phase2-dev`, versión
`bf4516d8-041f-477c-9339-59acd25f9f5f`. Gates: lint, Vitest 229 archivos
(1,055 PASS/1 omitida), build Phase 3+4 y verificadores PASS. Chromium de solo
lectura: `/servicios` 200, 15 tarjetas, 9/9 imágenes cargadas, sin errores JS
ni solicitudes fallidas; `/materiales` 200, 15 tarjetas, 13/13 cargadas.
Producción intacta. La reducción remota del peso de originales Storage sigue
pendiente de confirmar plan/cuota.

Miniaturas — 2026-11-14: transformación probada en DEV sobre el bucket legado
`home-service-profiles`: HTTP 200, JPEG de 10,261 bytes. La aplicación firma
miniaturas transformadas para portadas y conserva fallback al original;
pendiente desplegar y verificar el catálogo con este cambio.

Retest DEV público — 2026-11-14: Servicios (108) y Materiales (20) alternaron páginas sin recargar; página 2 devolvió un conjunto distinto (15 y 5 respectivamente) y se restauró página 1. Electricidad (11) y Cemento (3) filtraron todas las tarjetas correctamente; Limpiar restauró los totales y el paginador. Solo lectura.

Regresión de carga de ficha — 2026-11-15: si se abre un perfil desde un
directorio ya cargado, React podía pintar “Servicio no disponible” antes de que
el efecto iniciara la consulta. La navegación desde tarjeta y Atrás/Adelante
ahora activa carga y limpia el estado anterior antes de cambiar la ruta. La E2E
con detalle demorado falló antes de la corrección y pasa después; no se cambió
la regla de visibilidad pública.

## Reportes y recomendaciones

La ficha incluye el reporte de servicio protegido por Turnstile; se registra en la cola unificada de Moderación. Al final muestra hasta tres perfiles con el beneficio activo profile_featured, excluyendo el perfil actual. Las fotos recomendadas se firman solo para portada.

El control de mapa del catálogo permanece en el flujo de página para que no
cubra las tarjetas ni sus acciones en móvil. En las fichas, el área circular usa
la misma geometría geodésica de Comprar (500 m de radio / 1 km de diámetro) y
solo se dibuja si se guardaron coordenadas; el centro provincial se muestra como
contexto sin marcador de precisión.
