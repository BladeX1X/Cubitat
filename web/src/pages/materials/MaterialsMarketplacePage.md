# MaterialsMarketplacePage

## Responsabilidad

Presenta anuncios publicados de materiales de construcción con filtros por
texto del título, categoría, provincia y disponibilidad, detalle, precio
declarado, consulta privada para el vendedor y acceso a solicitud de publicación.
El catálogo pagina desde Supabase en bloques numerados de 15 resultados, muestra
el total exacto de coincidencias y permite ir a cualquier página sin acumular
anuncios anteriores. Un mapa
opcional muestra anuncios disponibles agrupados por provincia y aplica esa
provincia como filtro del catálogo.

Las tarjetas comparten las acciones Contactar y Consultar con el directorio de
Servicios. Contactar abre directamente la llamada y Consultar abre WhatsApp con
el título y la zona del anuncio. No navega a otra página ni muestra un diálogo
intermedio.

## Reglas

- Solo anuncios `published` y no agotados aparecen en el catálogo.
- La opción pública de disponibilidad excluye anuncios agotados; no los revela
  ni presenta un conteo de cero como si fueran resultados disponibles.
- La ubicación municipal se mantiene pendiente: `material_listings` en la cadena
  productiva actual no tiene columna `municipality`. No se simula el filtro en
  el navegador ni se afirma cobertura municipal para materiales hasta preparar
  y reconciliar una migración de base de datos.
- El mapa se carga bajo demanda y cuenta todas las páginas que cumplen texto,
  categoría y disponibilidad (sin agotados); no presenta direcciones ni
  ubicaciones exactas y no ofrece un filtro municipal inexistente.
- La barra reutiliza Comprar: en pantallas de hasta 768 px presenta búsqueda y
  botón circular de filtros; el botón abre una hoja inferior con categoría,
  provincia y disponibilidad. Los cambios se aplican en la vista actual y la
  hoja ofrece limpiar y ver resultados. En escritorio, filtros y búsqueda
  aparecen en la barra; el desbordamiento de controles se contiene dentro de
  ella. La barra sticky queda bajo el encabezado (76 px escritorio, 104 px
  tablet y 64 px móvil); el encabezado conserva las acciones compactas.
- Cambiar o limpiar filtros consulta el servidor sin navegación/recarga completa;
  conserva la barra, el mapa, las tarjetas actuales y su contador hasta recibir
  los datos nuevos. El refresco se anuncia sin sustituir la cuadrícula.
- La paginación numerada usa el total exacto del servidor, consulta una página a
  la vez y vuelve a la página 1 al cambiar o limpiar filtros.
- En móvil, mapa y estados de carga/error ocupan la pantalla y se cierran con el
  botón o Escape; en escritorio, al activar “Mostrar mapa”, filtros y tarjetas
  quedan en la columna izquierda y el mapa fijo al viewport en la derecha,
  siguiendo la presentación de Comprar/Rentar. El control “Mostrar mapa” queda
  fijo y accesible al desplazarse; en móvil se ubica sobre la navegación inferior
  y se oculta mientras el mapa está abierto para dejar disponible el botón de
  cierre propio.
- La disponibilidad y el precio son declaraciones del vendedor, no garantía,
  reserva ni oferta contractual.
- Las consultas requieren cuenta autenticada y no crean órdenes ni pagos.
- Al abrir un anuncio, anuncia la carga hasta recibir la respuesta. Si la
  consulta falla, distingue el error de red de un anuncio inexistente y ofrece
  reintentar; solo muestra “Anuncio no disponible” cuando la consulta termina
  correctamente sin un anuncio público.
- Las imágenes se cargan bajo demanda y los estados de carga/error/vacío son
  visibles y accesibles. Si Storage no puede firmar una o más fotos privadas,
  el anuncio permanece disponible y muestra un aviso accesible de fotos no
  disponibles temporalmente; no se confunde con un anuncio sin imágenes.
- Los teléfonos no aparecen en el catálogo; la tarjeta los consulta al Worker
  solo tras una acción explícita. Si falta el canal, ofrece abrir la ficha para
  usar el formulario de consulta.
- Los objetos privados se muestran mediante URL firmada temporal solo tras la
  lectura autorizada; el service worker no cachea las rutas `/object/sign/`.
- El componente se importa solo cuando el registro de capacidades habilita
  F4-MAT; el perfil productivo usa Supabase de producción y el perfil DEV usa
  Supabase DEV.
- El perfil `phase34-dev` muestra un identificador visible de entorno DEV en el
  catálogo para distinguirlo de producción.
- Cuando está habilitada la bandera de fase 4 de Materiales, cada tarjeta ofrece el control de favoritos compartido con Servicios;
  el proveedor mantiene el estado de sesión y persiste la relación por usuario.
- Las tarjetas y Favoritos piden a Storage una miniatura firmada de 420×192,
  recorte `cover` y calidad 65. Si falla la transformación, se firma el original
  como fallback. Las fichas conservan originales para la galería.
- Las tarjetas usan `MarketplaceCardImage`: las dos primeras fotos se cargan con
  prioridad alta, las siguientes de forma diferida, todas con decodificación
  asíncrona y fallback accesible. Unsplash entrega miniaturas a 420 px/calidad
  45; las URLs firmadas de Storage se conservan sin reescritura.

## Verificación

Regresión local de mapa y filtros: al seleccionar Matanzas desde el mapa, la
consulta de catálogo recibe la provincia, vuelve a la página 1 y mantiene el
mapa abierto sin cambiar la URL. La prueba no sustituye la interacción visual
en DEV.

QA DEV público con Chromium — 2026-11-13: clic real en el marcador de Pinar del
Río cambió el selector y filtró el catálogo de 15 a 2 tarjetas, sin cambiar la
URL ni recargar el documento. Fue solo lectura; no incluye pruebas autenticadas
ni de móvil.

Revisar filtros, detalle, formatos, URL firmadas, contacto y móvil en
DEV antes de habilitarlo en producción.

Regresión local — 2026-11-14: las acciones de Servicios y Materiales ahora
comparten el inicio directo de llamada/WhatsApp. WhatsApp conserva el título y
la zona, no recarga el catálogo y no envía mensajes. 4/4 E2E sintéticos PASS;
el caso de canal ausente explica el motivo y enfoca el formulario.

Miniaturas — 2026-11-14: prueba directa en DEV con una imagen de
`material-listings`: la firma transformada respondió HTTP 200 y sirvió un JPEG
de 19,768 bytes frente al original WebP de 279,002 bytes (93% menos en esta
muestra). La aplicación usa miniaturas transformadas y fallback al original;
pendiente desplegar y comprobar el catálogo con este cambio.

Retest DEV público — 2026-11-14: catálogo de Materiales (20 anuncios), página 2 mostró los 5 restantes y un conjunto distinto; regresar a página 1 restauró la lista sin recargar el documento. El filtro Cemento devolvió 3 anuncios de esa categoría y Limpiar restauró los 20 y el paginador. Solo lectura.

Regresión de carga de ficha — 2026-11-15: al abrir desde un catálogo ya cargado,
la pantalla podía mostrar “Anuncio no disponible” antes de que comenzara la
consulta. La tarjeta y la navegación Atrás/Adelante ahora activan el indicador de
carga y limpian el estado anterior antes del cambio de ruta. La E2E con consulta
demorada falló antes de corregir y pasa después; solo anuncia ausencia tras una
respuesta correcta sin anuncio.
