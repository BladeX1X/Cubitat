# PropertyCard

## Responsabilidad

`PropertyCard` renderiza una propiedad dentro del listado de resultados. La tarjeta debe permitir escanear rapido precio, tipo de inmueble, operacion, ubicacion, caracteristicas principales y acciones de contacto/detalle.

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

### Props

- `property`: datos completos de la propiedad.
- `isSelected`: activa el estado visual seleccionado cuando la propiedad esta elegida en el mapa/listado.
- `onSelect`: callback para seleccionar la propiedad y sincronizar listado, mapa y detalle.

## Estructura Visual

La tarjeta usa una composicion de dos columnas en desktop:

- Imagen de portada:
  - Usa `property.coverImage` y `property.coverTone`.
  - Muestra badge editorial cuando existe (`destacado`, `exclusivo`, `nuevo`).
  - Muestra chip de operacion (`Venta`, `Alquiler`, `Permuta`, `Rent-to-own`).
  - Incluye boton visual para guardar con icono de corazon.

- Informacion:
  - Precio principal.
  - Tipo de inmueble.
  - Titulo.
  - Ubicacion.
  - Caracteristicas: habitaciones, banos, estacionamiento y area.
  - Dos amenidades principales.
  - Acciones: `Contactar` y `Ver detalle`.

En movil la tarjeta pasa a una sola columna, con la imagen arriba y el contenido debajo.

## Decisiones de Implementacion

- Se usa `<article>` como contenedor semantico de la propiedad.
- El article actua como elemento seleccionable con `role="button"`, `tabIndex={0}` y soporte de teclado con `Enter`/`Space`.
- Los botones internos usan `event.stopPropagation()` para evitar seleccionar la tarjeta accidentalmente.
- Los controles de accion usan el componente compartido `Button`.
- Los badges usan el componente compartido `Badge`.
- El precio se calcula con `formatPrice`; alquiler agrega `/ mes`; permuta muestra `Permuta`.
- Los labels de operacion y tipo se normalizan desde mapas internos (`operationLabels`, `propertyTypeLabels`).
- Solo se muestran las primeras dos amenidades para mantener densidad visual controlada.
- Se evitan botones anidados dentro de botones, deuda que tenia la version anterior.

## Estilos Principales

Clases principales en `app.css`:

- `.property-card`
- `.property-photo`
- `.property-photo-top`
- `.property-badge`
- `.property-operation`
- `.property-save`
- `.property-info`
- `.property-heading-row`
- `.property-price`
- `.property-type`
- `.property-title`
- `.property-meta`
- `.property-specs`
- `.property-amenities`
- `.property-actions`
- `.property-contact-action`
- `.property-detail-action`

## Estados Visuales

- Hover/focus:
  - Eleva la tarjeta.
  - Cambia borde a verde suave.
  - Aumenta sombra.

- Seleccionado:
  - Usa borde `var(--blue)`.
  - Agrega anillo suave para relacionarlo con mapa/detalle.

- Movil:
  - `grid-template-columns: 1fr`.
  - Imagen ocupa todo el ancho disponible.
  - Specs y acciones se mantienen como chips legibles.

## Accesibilidad

- La tarjeta tiene `aria-label` con el titulo de la propiedad.
- La seleccion funciona con click, `Enter` y `Space`.
- El boton de guardar tiene `aria-label`.
- Los grupos de caracteristicas y amenidades usan `aria-label`.

Pendientes recomendados:

- Convertir `Guardar` en accion real cuando exista autenticacion/favoritos.
- Definir si `Contactar` abre WhatsApp, modal o formulario.
- Si se agrega routing, `Ver detalle` deberia navegar a una URL limpia de propiedad.

## Verificacion

Al redisenar la tarjeta se verifico:

- `npm run build`
- `npm run lint`
- Render desktop en `1365x768`.
- Render movil en `390x844`.
- Medidas de primera tarjeta y foto en ambos viewports.

## Notas de Mantenimiento

- Si se agregan nuevos datos de propiedad, actualizar `Property` y esta documentacion.
- Si se cambia el comportamiento de acciones, documentar aqui el flujo.
- Mantener la tarjeta escaneable: no mostrar demasiadas amenidades ni texto largo dentro del listado.
