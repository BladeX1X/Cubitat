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
  - Usa `property.coverImage` y `property.coverTone`.
  - Muestra badge editorial cuando existe.
  - Incluye flechas laterales preparadas para una futura galeria.
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
- Las flechas de imagen todavia no cambian galeria; quedan como affordance visual para cuando exista multi-imagen.
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

## Pendientes Recomendados

- Convertir `Guardar` en accion real cuando exista autenticacion/favoritos.
- Definir si `Contactar` abre WhatsApp, modal o formulario.
- Conectar las flechas a una galeria real cuando el modelo tenga varias imagenes.
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
