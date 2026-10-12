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
  - Usa el fallback SVG local inmediato cuando el anuncio no tiene portada, evitando una descarga genérica remota en el LCP.
  - Usa `property.coverImage`, `property.images` y `property.coverTone`.
  - Muestra badge editorial cuando existe.
  - Incluye flechas laterales solo cuando existen varias imagenes reales.
  - Incluye boton visual de guardar con icono de corazon.
  - Las flechas y el boton de guardar deben conservar area tactil minima de `44x44 px`.
- Informacion:
  - Titulo y precio en la primera linea.
  - Ubicacion con icono.
  - Caracteristicas principales: habitaciones, banos, estacionamiento y area.
  - Boton `Contactar` a ancho completo.

## Decisiones de Implementacion

- Se usa `<article>` como contenedor semantico de la propiedad.
- El article actua como elemento seleccionable con `role="button"`, `tabIndex={0}` y soporte de teclado con `Enter`/`Space`.
- Los botones internos usan `event.stopPropagation()` para evitar seleccionar la tarjeta accidentalmente.
- El boton `Contactar` usa el componente compartido `Button`.
- El badge usa el componente compartido `Badge`.
- El precio se calcula en `getPriceLabel`; alquiler agrega `/ mes` y permuta muestra `Permuta`.
- Las flechas de imagen usan la galeria real de la propiedad (`property.images`) normalizada desde `src/modules/properties/utils/images.ts`.
- El carrusel solo muestra flechas cuando hay mas de una imagen real distinta. Si `coverImage` e `images` contienen la misma URL repetida, se muestra una sola foto para evitar un carrusel que no cambia visualmente.
- Desde 2026-07-03 las imagenes del carrusel se renderizan completas desde el inicio. No usar carga diferida por slide dentro de la tarjeta, porque Embla puede cambiar de slide antes de que el fondo se pinte y el usuario percibe que el carrusel no cambia.
- En movil, las flechas de galeria permanecen visibles porque no se puede depender de `hover`.
- En escritorio, las flechas pueden mantenerse discretas y aparecer con hover para reducir ruido visual.

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
- Guardar y flechas deben tener minimo `44x44 px` de area interactiva para usabilidad tactil.
- Los puntos del carrusel conservan un indicador visual pequeno dentro de un area tactil de `44x44 px` en movil.

## Pendientes Recomendados

- Convertir `Guardar` en accion real cuando exista autenticacion/favoritos.
- Definir si `Contactar` abre WhatsApp, modal o formulario.
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
