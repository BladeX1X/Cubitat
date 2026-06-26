# PropertyCardDesignLab

## Responsabilidad

`PropertyCardDesignLab` muestra una galeria de propuestas visuales para tarjetas de propiedades. Es una herramienta de decision de diseno, no la tarjeta definitiva del listado.

## Ubicacion

- Componente: `src/modules/properties/components/PropertyCardDesignLab.tsx`
- Estilos: `src/styles/app.css`
- Integracion: `src/app/CubitatApp.tsx`

## API del Componente

```ts
type PropertyCardDesignLabProps = {
  properties: Property[]
}
```

### Props

- `properties`: lista de propiedades de muestra. El componente usa las primeras cuatro para presentar variantes.

## Propuestas Incluidas

### A. Visual marketplace

Inspirada en patrones de marketplace visual:

- Foto grande arriba.
- Corazon para guardar.
- Flechas laterales sobre la imagen para futura galeria/carrusel.
- Precio y titulo en bloque inferior.
- Specs como chips.
- Boton `Contactar` como CTA principal.

Conviene si Cubitat quiere sentirse mas visual y facil de navegar en movil.
Esta es la direccion preferida actualmente.

### B. Lista comparativa

Inspirada en portales inmobiliarios con foco en comparacion rapida:

- Imagen lateral.
- Precio muy visible.
- Specs en linea.
- CTA ancho para contacto.

Conviene si se prioriza escaneo rapido y comparacion entre muchas propiedades.

### C. Premium editorial

Propuesta mas aspiracional:

- Bloque oscuro.
- Foto y descripcion editorial.
- Sello de verificacion.
- CTA secundario.

Conviene para propiedades destacadas, premium o verificadas.

### D. Compacta operativa

Propuesta densa:

- Imagen pequena.
- Precio/tipo arriba.
- Datos basicos en una linea.

Conviene para listas largas, paneles administrativos o vistas de alta densidad.

## Decisiones de Implementacion

- Se usa `Card` y `CardContent` desde `shared/ui/card` para mantener coherencia con primitives tipo shadcn.
- Se reutilizan `Button` y `Badge`.
- Se usa `formatPrice` mediante helper interno `getPriceLabel`.
- `getPriceLabel` maneja `permuta`, `alquiler` y venta.
- Las imagenes usan `property.coverImage` y `property.coverTone`.
- La demo no altera `PropertyCard`, solo permite comparar opciones.

## Estilos Principales

Clases en `app.css`:

- `.card-lab-section`
- `.card-lab-heading`
- `.card-lab-grid`
- `.card-lab-option`
- `.demo-card`
- `.demo-card-market`
- `.demo-photo-arrow`
- `.demo-market-contact`
- `.demo-card-list`
- `.demo-card-premium`
- `.demo-card-compact`
- `.demo-spec-row`
- `.demo-wide-action`

## Responsive

- Desktop: grid de dos columnas.
- Tablet: opciones adaptadas a dos columnas cuando hay espacio.
- Movil: una columna; las variantes con imagen lateral pasan a imagen superior.

## Referencias Visuales

Patrones usados como referencia conceptual:

- Airbnb: tarjetas de alojamiento visuales, foto dominante y accion de favorito.
- Zillow: cards de propiedades con precio fuerte y specs visibles.
- idealista: listados comparativos orientados a escaneo rapido.
- propiedades.com: portal inmobiliario de referencia para mercado hispano.

## Pendientes

- Elegir una propuesta final y migrarla a `PropertyCard`.
- Si se adopta la propuesta A, conectar flechas a una galeria real cuando `Property` incluya multiples imagenes.
- Decidir si se mantiene esta demo en desarrollo solamente o se oculta antes de produccion.
- Si se agregan mas variantes, mantener maximo 4-6 para no dispersar decisiones.
