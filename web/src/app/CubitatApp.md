# CubitatApp

## Responsabilidad

`CubitatApp` es el orquestador principal de la interfaz de Cubitat. Ensambla el hero, busqueda, listado, mapa, detalle, secciones comerciales y login.

## Ubicacion

- Componente: `src/app/CubitatApp.tsx`
- Estilos globales: `src/styles/app.css`

## Modulos Integrados

- `SearchBar`: filtros del hero.
- `PropertyCard`: tarjeta oficial del listado de resultados.
- `PropertyMap`: mapa desacoplado mediante adapter.
- `LoginModal`: modal visual de inicio de sesion.
- Secciones locales: detalle, ubicaciones, servicios, productos, publicacion, blog y footer.

## Estado Local

```ts
const [filters, setFilters] = useState<SearchFilters>(initialFilters)
const [selectedPropertyId, setSelectedPropertyId] = useState<string>()
const [isLoginOpen, setIsLoginOpen] = useState(false)
```

- `filters`: controla busqueda y filtrado.
- `selectedPropertyId`: sincroniza lista, mapa y detalle.
- `isLoginOpen`: muestra u oculta `LoginModal`.

## Flujo Actual

1. El usuario entra al hero.
2. `SearchBar` actualiza filtros.
3. `visibleProperties` se calcula con `filterProperties`.
4. Las propiedades visibles se muestran en lista y mapa.
5. Seleccionar una propiedad actualiza detalle y mapa.
6. El boton `Ingresar` abre `LoginModal`.

## Decisiones de Implementacion

- La app mantiene estado local simple para el MVP.
- El filtrado se deriva con `useMemo`.
- El laboratorio de tarjetas se elimino despues de elegir la variante oficial.
- El mapa esta desacoplado de la UI de resultados mediante props y callbacks.
- El login esta fuera del flujo de scroll y se renderiza como modal.

## Pendientes

- Separar secciones locales largas en modulos propios si siguen creciendo.
- Conectar Supabase para autenticacion, propiedades y contactos.
- Agregar routing cuando existan paginas reales de detalle y publicacion.

## Verificacion

Cada cambio visual importante debe verificarse con:

- `npm run build`
- `npm run lint`
- Captura desktop.
- Captura movil cuando el cambio afecta layout.
