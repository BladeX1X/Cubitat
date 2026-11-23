# PropertyCard

## Responsabilidad

`PropertyCard` renderiza una propiedad dentro del listado de resultados. La tarjeta oficial usa el diseno elegido tipo marketplace: imagen superior, datos escaneables y un CTA claro de contacto.

## Ubicacion

- Componente: `src/modules/properties/components/PropertyCard.tsx`
- Estilos: `src/styles/app.css`
- Tipos: `src/modules/properties/types.ts`

## API del Componente

```ts
type PropertyCardProps = {
  property: Property
  isSelected: boolean
  onSelect: (propertyId: string) => void
}
```

## Estructura Visual

- Imagen de portada grande:
  - En builds habilitados de Fase 2 DEV o producción, muestra «Vendedor verificado» o «Agente verificado» solo si el propietario cumple la verificación de identidad y tiene una propiedad publicada.
  - Los perfiles propietarios `buyer`, `seller` y `admin` pueden mostrar «Vendedor verificado» bajo esas condiciones; el estado de verificación nunca se expone en la tarjeta.
  - Usa el fallback SVG local inmediato cuando el anuncio no tiene portada, evitando una descarga genérica remota en el LCP.
  - Usa `property.coverImage`, `property.images` y `property.coverTone`.
  - Muestra badge editorial cuando existe.
  - Incluye flechas laterales solo cuando existen varias imagenes reales.
  - Incluye boton visual de guardar con icono de corazon.
- El favorito compartido espera a que Supabase confirme la sesión; durante esa comprobación permanece deshabilitado con estado accesible para evitar abrir el inicio de sesión a una cuenta ya activa.
  - En dispositivos táctiles, guardar, contacto y los controles del carrusel deben ofrecer un objetivo de `48x48 px`, con espacio entre controles adyacentes.
- Informacion:
  - Titulo y precio en la primera linea.
  - Ubicacion con icono.
  - Caracteristicas principales: habitaciones, banos, estacionamiento y area.
  - Acciones `Contactar` y `Consultar` a ancho completo.

## Decisiones de Implementacion

- Se usa `<article>` como contenedor semantico de la propiedad.
- El article actua como elemento seleccionable con `role="button"`, `tabIndex={0}` y soporte de teclado con `Enter`/`Space`.
- Los botones internos usan `event.stopPropagation()` para evitar seleccionar la tarjeta accidentalmente.
- Las acciones `Contactar` y `Consultar` reutilizan `MarketplaceContactActions`.
  Al pulsarlas, el Worker obtiene el teléfono/WhatsApp privado mediante una RPC
  exclusiva para `service_role`; `Contactar` abre el marcador del dispositivo y
  `Consultar` abre WhatsApp con el título y ubicación pública. No se entrega
  `contact_info` en la consulta pública del catálogo.
- Si falta el canal solicitado, la tarjeta permite abrir la ficha y enfocar el
  formulario protegido. Un error temporal muestra una opción recuperable.
- El badge usa el componente compartido `Badge`.
- El precio se calcula en `getPriceLabel`; alquiler agrega `/ mes` y permuta muestra `Permuta`.
- Las flechas de imagen usan la galeria real de la propiedad (`property.images`) normalizada desde `src/modules/properties/utils/images.ts`.
- Las referencias de `property_images` se muestran por `/api/supabase/storage/v1/object/property_images/...` porque el bucket es privado; las URLs `/object/public/` se corrigen al cargar desde DB o caché antes de llegar al carrusel.
- El carrusel solo muestra flechas cuando hay mas de una imagen real distinta. Si `coverImage` e `images` contienen la misma URL repetida, se muestra una sola foto para evitar un carrusel que no cambia visualmente.
- Desde 2026-07-03 las imagenes del carrusel se renderizan completas desde el inicio. No usar carga diferida por slide dentro de la tarjeta, porque Embla puede cambiar de slide antes de que el fondo se pinte y el usuario percibe que el carrusel no cambia.
- En movil, las flechas de galeria permanecen visibles porque no se puede depender de `hover`.
- En escritorio, las flechas aparecen al pasar sobre la foto o al enfocarlas con teclado; el hover o foco del botón de favorito no las activa ni las deja visibles tras guardar.

## Estilos Principales

Clases principales en `app.css`:

- `.property-card`
- `.property-photo`
- `.property-badge`
- `.property-photo-arrow`
- `.property-photo-arrow-left`
- `.property-photo-arrow-right`
- `.property-save`
- `.property-info`
- `.property-heading-row`
- `.property-price`
- `.property-title`
- `.property-meta`
- `.property-specs`
- `.property-actions`
- `.property-contact-action`

En dispositivos táctiles, las flechas de la galería se amplían a 48 × 48 px; en móviles estrechos se ocultan porque los indicadores de fotos permiten cambiar de imagen.

## Estados Visuales

- Hover/focus:
  - Eleva la tarjeta.
  - Cambia borde a verde suave.
  - Aumenta sombra.
- Seleccionado:
  - Usa borde `var(--blue)`.
  - Agrega anillo suave para relacionarlo con mapa/detalle.
- Movil:
  - Mantiene una sola columna.
  - Imagen arriba y CTA abajo.

## Accesibilidad

- La tarjeta tiene `aria-label` con el titulo de la propiedad.
- La seleccion funciona con click, `Enter` y `Space`.
- Guardar y flechas tienen `aria-label`.
- El grupo de caracteristicas usa `aria-label`.
- En dispositivos táctiles, guardar, contacto y los puntos del carrusel ofrecen un área interactiva mínima de `48x48 px`.
- Los puntos del carrusel conservan un indicador visual pequeño dentro del área táctil ampliada.

## Pendientes Recomendados

- Convertir `Guardar` en accion real cuando exista autenticacion/favoritos.
- Mantener las acciones conectadas al formulario protegido y a WhatsApp contextual de la ficha.
- Si se agrega routing, la seleccion de tarjeta puede navegar a una URL limpia de propiedad.

## Verificacion

Cada cambio visual importante debe verificarse con:

- `npm run build`
- `npm run lint`
- Captura desktop.
- Captura movil cuando el cambio afecta layout.

## Notas de Mantenimiento

- Si se agregan nuevos datos de propiedad, actualizar `Property` y esta documentacion.
- Mantener la tarjeta escaneable: no mostrar demasiadas amenidades ni texto largo dentro del listado.
- En resultados, `prioritizeImage` se reserva para la primera tarjeta. Las imágenes Unsplash de catálogo se solicitan a 420 px y calidad 45; las demás usan `loading="lazy"` y `fetchPriority="low"`.

## Favorito inmobiliario como visitante — QA DEV — 2026-11-13

En Chrome sobre Worker DEV, pulsar el corazón de una propiedad abre «Guardar favorito». «Ahora no» cierra el aviso sin cambiar URL. «Iniciar sesión» reemplaza el aviso por el modal de acceso, muestra el campo de correo y permite cerrarlo. No hubo solicitudes de escritura a `saved_properties`; no se ingresaron datos de acceso.

## Imágenes de tarjetas públicas — QA DEV — 2026-11-13

En Chromium contra `/resultados`, se desplazó cada una de las 13 tarjetas de la primera página para activar carga diferida. Las 13 imágenes terminaron cargando y decodificándose; no hubo respuestas HTTP fallidas en las rutas proxy de Storage observadas. Esta comprobación es pública y no cubre otras páginas, la galería completa de una ficha ni Storage privado del editor.
