# HomePage

## Responsabilidad

`HomePage` representa la pagina principal de Cubitat. Contiene el hero, el buscador principal y las secciones comerciales de inicio.

No renderiza resultados, detalle de propiedad ni login. Es una pagina enfocada en entrada al flujo: buscar, explorar ubicaciones, conocer servicios y comenzar una publicacion.

## Ubicacion

- Componente: `src/pages/home/HomePage.tsx`
- Estilos: `src/styles/app.css`

## API

```ts
type HomePageProps = {
  filters: SearchFilters
  locationSuggestions: LocationSuggestion[]
  onChangeFilters: (filters: SearchFilters) => void
  onClearFilters: () => void
  onSubmitSearch: () => void
}
```

## Secciones

- `Hero`: bloque principal con mensaje de marca y `SearchBar`.
- `PopularLocations`: entrada por las 16 provincias cubanas con fotos representativas. Cada tarjeta enlaza via SPA a búsqueda pre-filtrada de "Departamentos en venta en [Provincia]".
- `ServicesSection` *(exportada, NO renderizada)*: servicios futuros de confianza, valuación y lectura de mercado. Disponible como `export function` para reactivar cuando se implemente.
- `ProductsSection` *(exportada, NO renderizada)*: productos comerciales de crecimiento. Disponible como `export function` para reactivar cuando se implemente.
- `PublishSection`: llamada a publicar propiedad.
- `BlogSection`: guías educativas para usuarios y vendedores.

## Decisiones

- La busqueda sigue siendo controlada por `CubitatApp`, porque por ahora la navegacion se maneja con estado local y `history.pushState`.
- `HomePage` no conoce la pagina de resultados; solo ejecuta `onSubmitSearch`.
- `PopularLocations` se exporta porque tambien se reutiliza al final de la pagina de resultados como entrada secundaria.
- Las secciones largas viven aqui mientras se estabiliza la portada. Si una seccion crece o se reutiliza, debe moverse a su propio modulo.

## Mantenimiento

- Mantener la portada libre de resultados y mapa.
- No introducir logica de filtrado dentro de `HomePage`.
- Si se agrega una nueva seccion visual, documentarla en esta nota.
- Si se cambia el buscador, actualizar tambien `SearchBar.md`.

## Trabajo Realizado

- Se extrajo la portada desde `CubitatApp.tsx` hacia `src/pages/home/HomePage.tsx`.
- Se mantuvo la estructura visual existente: hero, buscador, provincias, publicar y blog.
- Se dejo `HomePage` como pagina presentacional/controlada: recibe `filters`, `locationSuggestions` y callbacks desde `CubitatApp`.
- Se exporto `PopularLocations` para reutilizarlo tambien en la pagina de resultados mientras esa pagina no tenga componente propio.
- Se verifico que `/` muestra hero y secciones de inicio, pero no muestra `.workspace` ni tarjetas de resultados.
- Se verifico que el boton de busqueda navega a `/resultados`.
- **[2026-07-01]** Se expandió `PopularLocations` a las 16 provincias cubanas con fotos de stock funcionales.
- **[2026-07-01]** Se ocultaron `ServicesSection` y `ProductsSection` del renderizado (quedan como `export function` para reactivar en el futuro).
- **[2026-07-01]** Se eliminaron los enlaces de navegación "Servicios" y "Nuestros productos" del Header.

## Estado Actual de la Pagina Principal

La pagina principal ya esta separada del listado de resultados. El siguiente agente debe tratar `HomePage.tsx` como el punto de entrada para cualquier trabajo visual sobre la portada.

Actualmente la portada tiene estas responsabilidades:

- Presentar la marca Cubitat.
- Permitir iniciar una busqueda.
- Llevar al usuario hacia resultados.
- Mostrar entradas comerciales iniciales: provincias, servicios, productos, publicar y blog.

Actualmente la portada NO debe:

- Renderizar resultados.
- Renderizar mapa.
- Renderizar detalle de propiedad.
- Manejar login.
- Consultar Supabase directamente.

## Pendientes Recomendados

- Implementar contenido real para `ServicesSection` y `ProductsSection` cuando el negocio lo requiera. Actualmente están exportadas pero no renderizadas; para reactivar basta con agregar `<ServicesSection />` y `<ProductsSection />` al JSX de `HomePage`.
- Crear un componente `Header` en `components/layout` para sacar la navegación de `CubitatApp`.
- Revisar la imagen del hero y sustituirla por un asset controlado del proyecto si se decide evitar depender de Unsplash.
- Adaptar textos a Cuba y a la propuesta comercial definitiva del cliente.
- Revisar mobile real cuando se ajusten tamaños del hero y del buscador.
- Reemplazar fotos de Unsplash de las 16 provincias por imágenes propias cuando estén disponibles.

## Como Verificar

1. Levantar servidor:

```bash
npm run dev -- --host 127.0.0.1
```

2. Abrir:

```text
http://127.0.0.1:5173/
```

3. Comprobar:

- Se ve el hero como primera pantalla.
- No asoman resultados debajo al abrir.
- El selector de tipo de inmueble no se solapa con la seccion inferior.
- El boton de busqueda navega a `/resultados`.

4. Antes de cerrar un cambio visual:

```bash
npm run build
npm run lint
```

## Actualización móvil 2026-07-02

- La portada móvil toma como referencia el comportamiento de `propiedades.com`: header compacto con logo, campana y hamburguesa; franja verde superior; buscador apilado; hero contenido en la primera pantalla; navegación inferior fija con `Inicio`, `Favoritos`, `Vender` y `Cuenta`.
- El header de escritorio no debe comprimirse en móvil. En móvil se ocultan `primary-nav` y `header-actions`, y se usa `mobile-header-actions`.
- El menú móvil se renderiza como panel fijo con acceso a cuenta, favoritos, contenidos, publicar y operaciones principales.
- Se corrigieron textos visibles con tildes en portada y provincias (`Búscalo`, `Pinar del Río`, `Sancti Spíritus`, `Camagüey`, `Holguín`, `Guantánamo`) para evitar mojibake.
- Verificación visual realizada con viewport `390x844`: captura de portada y captura del menú móvil abierto.

## Hardening de imágenes 2026-07-13

- El hero usa variantes responsive más ligeras de 480, 768 y 1200 px y conserva `fetchPriority="high"` como único recurso visual prioritario de la portada.
- En la ruta `/`, el Worker añade al HTML inicial una precarga de las mismas variantes responsive del hero con `imagesrcset`/`imagesizes`, para que el navegador descubra la imagen LCP pronto. No se precarga en Resultados, Servicios ni Materiales.
- Las 16 tarjetas de provincias usan `loading="lazy"`, prioridad baja y variantes Unsplash de 420 px con calidad 45.

### Optimización de marca y LCP — 2026-11-18

- El logotipo conserva su diseño y transparencia en WebP de 464×132 px; se usa en cabecera, fallback y login. El PNG original se conserva como fuente.
- Se añadió una precarga responsive del hero en `index.html`; mantener sincronizados `imagesrcset`/`imagesizes` con `HomePage.tsx`.

## Navegación en ventanas medianas — 2026-11-04

- Entre 621 y 1180 px, la marca y las acciones de cuenta/publicación quedan en la fila superior y los enlaces principales se muestran en una fila propia debajo. La fila permite desplazamiento horizontal si hace falta.
- Hasta 620 px se mantiene el menú compacto con hamburguesa.
- Ver el detalle del componente en `src/components/layout/Header.md`.
