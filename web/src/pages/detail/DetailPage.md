# DetailPage

La ficha pública muestra galería, datos técnicos, ubicación aproximada, contacto y propiedades similares.

## Ancho común del detalle — 2026-11-22

En escritorio, navegación, portada con galería/resumen, contenido técnico y
propiedades similares comparten un contenedor centrado de hasta `1152 px`. La
fila de contenido ya no reduce su ancho con gutters propios; el panel de
contacto sigue en su columna junto a las características. En viewports de
escritorio estrechos se reservan márgenes laterales de 16 px.

La barra de acciones sigue el estilo de acciones de referencia: Favorito,
Compartir, Notas personales y Ocultar aviso, con divisores discretos y scroll
horizontal en móvil. Las notas y los anuncios ocultos se guardan solo en el
navegador actual; al ocultar desde una ficha, el catálogo ofrece deshacer.
La portada resume recámaras, baños, estacionamiento y área; la ficha conserva
las características completas. Las descripciones largas se pueden expandir.

## Carrusel de fotos — 2026-11-22

La galería reutiliza los controles Carousel compartidos con las tarjetas del
catálogo. Con varias fotos muestra flechas accesibles y puntos de posición en
escritorio y móvil; conserva el gesto táctil. El visor ampliado comparte el
índice activo con ambas vistas y permite avanzar, retroceder y elegir
miniaturas. Si hay una sola foto, no muestra controles vacíos.

Las consultas de propiedades similares incluyen explícitamente `status = published` en la búsqueda principal y la consulta de relleno, porque las sesiones autenticadas también pueden leer sus propios anuncios privados. Se excluyen además la ficha actual y los anuncios ya seleccionados. Ambas usan la proyección pública compartida `PUBLIC_PROPERTY_SELECT`; no deben usar `SELECT *` porque columnas de contacto y moderación están revocadas a clientes.

El mapa de ubicación y el mapa de dirección del formulario cargan el worker JavaScript de MapLibre mediante `modules/maps/lib/configureMapLibreWorker.ts`. Todas las entradas de mapa deben compartir esa configuración para evitar que el Worker sirva el fallback HTML al proceso de render.

## Presentación y acciones de contacto — 2026-11-10

La portada de escritorio sigue como referencia la composición centrada del diseño de detalle de producto de Figma: información y galería en columnas equilibradas, dentro de un contenedor de hasta `1152 px`. La imagen no ocupa todo el ancho del viewport; en móvil el contenido se apila.

`Contactar` y `Consultar` reutilizan `MarketplaceContactActions` en tarjetas,
cabecera de escritorio y barra móvil. Cada acción consulta el canal solicitado
al Worker solo tras el clic; el Worker resuelve el contacto con una RPC privada
para anuncios publicados. `Contactar` abre el teléfono nativo y `Consultar`
abre WhatsApp con el título y ubicación pública. Si el canal no existe, se
ofrece el formulario protegido como alternativa. Ninguna vista pública carga
`contact_info` antes de la acción.

Pruebas: `DetailPage.test.tsx`, `PropertyCard.test.tsx` y `utils/contact.test.ts` cubren enfoque del formulario, contexto del mensaje y normalización segura de enlaces.

## Privacidad de dirección — 2026-09-11

`publicPropertyLocation` acepta únicamente municipio y provincia del catálogo cubano. Se aplica al texto de ubicación, breadcrumbs y mensaje de contacto para proteger también datos legacy o caché anterior. No deduce barrios ni calles desde texto ambiguo.

La barrera de datos es la migración `20260911060000_private_property_addresses.sql`: conserva íntegra la entrada en una tabla privada protegida por RLS y guarda solo zona en `properties.location`. El propietario recupera su dirección mediante el repositorio de edición. La migración debe aplicarse antes de desplegar ese repositorio. No se ha aplicado remotamente como parte de esta corrección.

Pruebas: `DetailPage.test.tsx` usa una dirección sintética completa y verifica que no aparezca en HTML ni en parámetros SEO.

## Mensaje de espera de contacto — 2026-11-12

El bloqueo local de cinco minutos no debe presentarse como si la ficha actual
hubiese enviado una consulta. Un envío exitoso conserva su confirmación en la
visita actual; una marca de cooldown previa muestra un aviso neutral y vuelve a
habilitar el formulario cuando expira. El servidor continúa aplicando sus
propios límites.

## Privacidad de coordenadas — 2026-09-12

El mapa público representa una zona aproximada sobre una cuadrícula de `0.02` grados, sin pin de domicilio exacto y con aviso visible. El cliente vuelve a aproximar datos antiguos antes de dibujarlos para cubrir cachés previas.

La migración `20260912010000_private_property_coordinates.sql` conserva el punto exacto en `property_private_coordinates`, protegido por RLS para el propietario, y deja solo la cuadrícula aproximada en `properties.coordinates`. La migración corrige registros existentes y el trigger aplica la misma separación a futuras altas y ediciones. Debe aplicarse antes de desplegar el repositorio que recupera las coordenadas privadas.

## Área aproximada del mapa — 2026-09-23

`DetailLocationMap` dibuja la zona pública como un polígono GeoJSON de `2 km` de radio mediante `createApproximateLocationArea`, no como un `circle-radius` en píxeles. Al acercar o alejar el mapa cambia su tamaño en pantalla, pero conserva la misma región geográfica aproximada.

## Recuperación del mapa de ubicación — 2026-11-12

La ficha indica cuándo el mapa está cargando y muestra un aviso con botón de reintento si falla el estilo/los recursos antes de completar la carga o si MapLibre no emite `load` en 15 segundos. El mapa puede reintentarse sin cerrar la ficha; la ubicación continúa señalada como aproximada. `DetailPage.test.tsx` cubre error recuperable, reintento y vencimiento.

## Validación de coordenadas frente a zona pública — 2026-11-16

La ubicación aproximada del mapa contrasta el punto público con el municipio y provincia visibles. Si una coordenada queda claramente lejos de un centro conocido, la ficha utiliza el centro aproximado de esa localidad. La regla compartida con los mapas de resultados no modifica datos de Supabase ni consulta o expone la coordenada privada del anunciante.

## Comprobación de ficha pública en Worker DEV — 2026-11-13

Con Chromium automatizado en modo de solo lectura, abrí tres fichas públicas servidas por `cubitat1-phase2-dev` (Cienfuegos, Vedado y Playa) y pulsé `Mapa`. En las tres el canvas MapLibre quedó visible (894 × 648 px), desapareció el estado de carga y no apareció el aviso de error. En total, las teselas vectoriales, fuentes y sprites consultados respondieron con HTTP 200. No se modificaron anuncios. Esto confirma el render en el Worker DEV desde este navegador automatizado, pero no sustituye la comprobación manual en Chrome/móvil del usuario.

## Compartir ficha — QA de interacción DEV — 2026-11-13

- Chrome headless abrió una ficha desde el resultado y se probó cancelar `navigator.share`, que falle y que no exista.
- Cancelar no copió al portapapeles; fallo real y API ausente usaron el portapapeles y mostraron «Copiado».
- En los tres escenarios, la URL siguió en la ficha, no hubo recarga ni pestaña nueva. Las APIs se simularon para evitar compartir externamente; no se escribieron datos.

## Compartir sin invocaciones repetidas — 2026-11-14

Mientras `navigator.share` o el fallback de portapapeles estén pendientes, ambos botones de compartir quedan desactivados y los clics repetidos se ignoran mediante una guarda síncrona. Al terminar o cancelar el mecanismo se permite reintentar. El fallback también captura fallos síncronos o asíncronos del portapapeles. `DetailPage.test.tsx` verifica una sola invocación y que se habilite de nuevo; `property-share.spec.ts` verifica en Chromium que la ficha no se recarga. El proveedor nativo se simula en pruebas; no se comparte externamente.

## Compartir desde escritorio y móvil — 2026-11-15

En escritorio, `Compartir` copia directamente la URL y muestra «Copiado»; evita abrir el selector nativo de Windows, que pudo contribuir a la lentitud reportada. En Android y iOS usa `navigator.share` cuando está disponible, con portapapeles como fallback ante errores distintos de cancelar. Las pruebas unitarias y E2E simulan ambos entornos, comprueban una sola invocación y que la ficha no navegue ni recargue.

## Privacidad del teléfono antes de Turnstile — comprobación DEV — 2026-11-13

En una ficha pública DEV cuyo ID no usa el mapeo de contacto sintético de demostración, el catálogo no devolvió campos de teléfono; la página no mostró enlaces `tel:` ni WhatsApp antes del reto, y el botón «Contactar» no navegó ni disparó una petición de contacto. No se completó Turnstile ni se envió mensaje. El teléfono demo de una ficha sintética sí proviene del mapa fijo de fixtures en `utils/contact.ts`; no debe usarse para inferir exposición de datos de usuarios reales.

## Ficha móvil — ancho y barra de contacto — QA DEV — 2026-11-13

En 320, 360 y 390 px, una ficha pública tuvo exactamente un título H1 visible, barra de contacto visible y completamente dentro del viewport, y ancho de documento igual al viewport (sin desbordamiento horizontal). Solo lectura en Chromium; no se contactó al anunciante.

## Registro seguro de vistas — 2026-11-14

La ficha registra vistas mediante `POST /api/property-view`; el Worker valida el UUID, limita por IP y ejecuta `increment_property_view_count` con `SUPABASE_SERVICE_ROLE_KEY` solo en servidor. El RPC ya no está permitido por el proxy público. Los errores de telemetría no bloquean la ficha. Pruebas Worker cubren autorización upstream, validación, rate limit y ausencia de credencial.

## Galería y mapa de ficha móvil — QA DEV — 2026-11-14
En ficha pública DEV, el clic físico en el título de una tarjeta de resultados abrió el detalle. En viewport 390×844, las dos fotos visibles se cargaron; abrir la primera mostró el visor. La pestaña Mapa cargó MapLibre y sus teselas sin errores, con nota de ubicación aproximada. Sin acciones de contacto/favorito ni escrituras.
