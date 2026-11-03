# CubitatApp

## Responsabilidad

`CubitatApp` es el orquestador principal de la interfaz de Cubitat. Coordina la navegacion temporal entre portada y resultados, mantiene el estado de busqueda y ensambla detalle, login y layout general.

## Ubicacion

- Componente: `src/app/CubitatApp.tsx`
- Estilos globales: `src/styles/app.css`

## Modulos Integrados

- `SearchBar`: filtros del hero.
- `HomePage`: pagina principal con hero y secciones comerciales.
- `PropertyCard`: tarjeta oficial del listado de resultados.
- `PropertyMap`: mapa desacoplado mediante adapter.
- `LoginModal`: modal visual de inicio de sesion.
- `UserMenu`: menu de cuenta para usuarios autenticados.
- Secciones locales: resultados, detalle y footer.

## Estado Local

```ts
const [filters, setFilters] = useState<SearchFilters>(initialFilters)
const [selectedPropertyId, setSelectedPropertyId] = useState<string>()
const [isLoginOpen, setIsLoginOpen] = useState(false)
const [pageMode, setPageMode] = useState<PageMode>(getInitialPageMode)
```

- `filters`: controla busqueda y filtrado.
- `selectedPropertyId`: sincroniza lista, mapa y detalle.
- `isLoginOpen`: muestra u oculta `LoginModal`.
- `pageMode`: alterna entre portada (`home`) y pagina de resultados (`results`) usando `history.pushState`.

## Flujo Actual

1. El usuario entra al hero.
2. `SearchBar` actualiza filtros.
3. `visibleProperties` se calcula con `filterProperties`.
4. Al enviar la busqueda, la app navega a `/resultados` sin recargar.
5. Las propiedades visibles se muestran en una pagina dedicada con toolbar, banner y grid de tarjetas.
6. Seleccionar una propiedad actualiza el detalle dentro de la pagina de resultados.
7. El boton `Ingresar` abre `LoginModal`.
8. Cuando hay sesion activa, el Header muestra campanita de notificaciones y `UserMenu`.
9. `UserMenu` permite navegar a `Mi cuenta`, `Favoritos`, `Ver mis contenidos` y ejecutar `Cerrar sesion`.
10. La postulación `/postular-agente` es protegida y DEV-only: el login devuelve a la ruta y el CTA de Header solo aparece con `VITE_PHASE3_UI_ENABLED=true` en el perfil `phase2-dev`.
11. Si Supabase invalida la sesión durante el desafío MFA administrativo,
    `AdminMfaGate` solicita recuperación y `CubitatApp` reutiliza
    `handleSignOut`, vuelve a `/` y abre el login en el siguiente ciclo de UI.
12. Al abrir un push, consume el identificador interno después de autenticar la sesión, marca la notificación como leída y limpia ese parámetro de la URL.

## Decisiones de Implementacion

- La app mantiene estado local simple para el MVP y usa navegacion interna ligera antes de incorporar React Router.
- La portada se extrajo a `src/pages/home/HomePage.tsx` para que la pagina principal evolucione sin hacer crecer `CubitatApp`.
- La portada se renderiza aunque Supabase este cargando o devuelva error. Esto protege la experiencia PWA/mobile-first: el usuario siempre debe poder abrir `/` y usar el buscador inicial.
- El filtrado se deriva con `useMemo`.
- El laboratorio de tarjetas se elimino despues de elegir la variante oficial.
- La vista de resultados toma como referencia portales inmobiliarios de alto volumen: filtros compactos, contador, ordenamiento y grid de tarjetas.
- El mapa queda desacoplado como modulo reemplazable para reincorporarlo en una vista dedicada o en un modo mapa/lista.
- El login esta fuera del flujo de scroll y se renderiza como modal.
- Las rutas privadas (`/publicar`, `/editar/:id`, `/mis-propiedades`, `/mi-cuenta`, `/favoritos`) abren login y vuelven a portada si no hay usuario.
- `Favoritos` reutiliza `saved_properties` y las tarjetas oficiales para no duplicar logica visual.
- La recuperación de una sesión MFA expirada permanece centralizada:
  `AdminPage` no cierra sesiones ni consulta Auth; únicamente propaga el
  callback hasta el guard. El cierre limpia la caché offline y el borrador
  legado antes de volver a abrir el login.
- El formulario de postulación envía los documentos al Worker autenticado, no
  sube desde el cliente a Storage; muestra claramente que correo y purga
  automatizada siguen pendientes.

## Pendientes

- Separar secciones locales largas en modulos propios si siguen creciendo.
- Agregar routing formal con React Router cuando la complejidad lo justifique.
- Extraer `Header` y `SiteFooter` a componentes de layout reutilizables.
- Reactivar `navigateToSection` y `scrollTo` (actualmente comentadas) cuando se reimplementen las secciones Servicios y Productos en la portada.

## Verificacion

Cada cambio visual importante debe verificarse con:

- `npm run build`
- `npm run lint`
- Captura desktop.
- Captura movil cuando el cambio afecta layout.


## Plan de Paginas de Fase 1

La aplicacion debe evolucionar de la demo actual hacia paginas separadas. Para el MVP minimo se necesitan 6 paginas: `Inicio`, `Resultados de busqueda`, `Detalle de propiedad`, `Publicar propiedad`, `Login / Registro` y `Panel de usuario`.

Para una Fase 1 mas solida se contemplan tambien `Editar propiedad`, `Favoritos / Guardados`, `Contacto / Soporte` y `Terminos y privacidad`. La prioridad es terminar primero el flujo completo de buscar, ver detalle, publicar, revisar y contactar.

## Componentes Reutilizables Base

La Fase 1 debe mantenerse alrededor de 25-35 componentes reutilizables. Los mas importantes son:

- Navegacion y estructura: `Header`, `Footer`, `PageLayout`, `SectionHeader`.
- Busqueda: `SearchBar`, `OperationTabs`, `PropertyTypeSelect`, `LocationInput`, `FilterBar`, `FilterDropdown`, `PriceFilter`.
- Propiedades: `PropertyCard`, `PropertyGrid`, `PropertyGallery`, `PropertyDetailHeader`, `PropertySpecs`, `ContactOwnerBox`.
- Mapas: `PropertyMap`, `MapMarker`, `ClusterMarker`.
- Publicacion: `PublishPropertyForm`, `ImageUploader`, `StepFormLayout`.
- Autenticacion: `AuthModal`, `LoginForm`, `RegisterForm`.
- Panel: `UserPropertyCard`, `StatusBadge`, `EmptyState`.
- UI compartida: `Button`, `Input`, `Select`, `Modal`, `Toast`, `Badge`, `Pagination`, `Breadcrumbs`, `LoadingState`.

El criterio es construir componentes pequenos, con responsabilidad clara, y evitar que una pagina se convierta en un archivo gigante. Cuando un bloque se reutilice en dos lugares o tenga estado propio, debe salir a componente.

## Handoff para Otro Agente

Estado actual (2026-07-01):

- `CubitatApp.tsx` es el orquestador de estado, rutas SPA y layout global.
- La portada vive en `src/pages/home/HomePage.tsx`.
- Los resultados viven en `src/pages/results/ResultsPage.tsx` con paginacion de 16 items.
- El detalle vive en `src/pages/detail/DetailPage.tsx` con slugs SEO, migas de pan clicables y recomendaciones de propiedades similares por provincia.
- El formulario de publicacion vive en `src/pages/publish/PublishPage.tsx` (wizard de 8 pasos con autoguardado).
- "Mis Propiedades" vive en `src/pages/my-properties/MyPropertiesPage.tsx`.
- "Mi cuenta" vive en `src/pages/account/AccountPage.tsx`.
- "Favoritos" vive en `src/pages/favorites/FavoritesPage.tsx`.
- `Mi cuenta`, `Favoritos` y `Ver mis contenidos` comparten `src/pages/account/AccountLayout.tsx`; solo debe cambiar el contenido derecho.
- La opcion `Busquedas guardadas` no forma parte del MVP actual y fue retirada del menu lateral.
- `Mi cuenta` guarda avatar en Supabase Storage bucket `avatars` y persiste la URL en `profiles.avatar_url`.
- La tarjeta de cuenta usa 3 datos completados: nombre, email y celular editable (`profiles.phone`). El celular ya no requiere verificacion por WhatsApp dentro del MVP; el proxy solo permite actualizar campos seguros del perfil.
- El celular del perfil acepta telefonos internacionales de 7 a 15 digitos, normaliza prefijos `+` o `00` sin imponer `+53` y alimenta el contacto prellenado de publicaciones.
- El contacto de una publicacion acepta telefonos de cualquier pais, con 7 a 15 digitos y prefijo internacional opcional (`+` o `00`); no exige verificacion por SMS o WhatsApp.
- El correo no se modifica desde `Mi cuenta`; la contrasena tampoco se gestiona en esa pantalla.
- Publicacion captura operacion (`venta`, `alquiler`, `permuta`), tipo (`casa`, `apartamento`, `terreno`), amenidades como piscina/patio y el piso o nivel de apartamentos dentro de `features`.
- La navegacion usa `pageMode` y `window.history.pushState` (sin React Router).
- Las rutas implementadas: `/`, `/resultados`, `/propiedad/:slug`, `/publicar`, `/editar/:id`, `/mis-propiedades`, `/mi-cuenta`, `/favoritos`.
- El Header solo muestra: `Comprar`, `Rentar`, `Vender`, `Publicar gratis`, campanita de notificaciones y menu de usuario.
- El menu de usuario debe mantenerse como entrada principal a cuenta, favoritos, contenidos publicados y cierre de sesion.
- Los enlaces de "Servicios" y "Nuestros productos" fueron eliminados del Header (secciones no implementadas aun).
- Las funciones `navigateToSection` y `scrollTo` estan comentadas; reactivar cuando se reimplementen Servicios/Productos.
- Supabase esta conectado para auth, propiedades (CRUD), storage de imagenes y RLS.
- Los estados `loading` y `error` de Supabase no bloquean `HomePage`; solo afectan vistas dependientes de datos remotos.
- Con Fase 2 local habilitada, la carga de propiedades consulta en paralelo la
  proyeccion de agentes verificados y anota `isVerifiedAgent`. Si esa proyeccion
  falla, conserva el catalogo base sin otorgar insignias.
- Las respuestas REST de Supabase no se almacenan en el service worker; los
  cambios de sesion, rol y KYC deben resolverse siempre contra el backend.
- Las operaciones de filtro (Venta/Renta/Permuta) son de seleccion exclusiva (no multi-select).
- Buscar y Publicar comparten la taxonomia canonica de operaciones y tipos de inmueble en
  `src/shared/lib/propertyTaxonomy.ts`. El selector del hero muestra `Todos los inmuebles`
  cuando no hay filtro y permite volver explicitamente a ese estado desde el menu.

Flujo de paginas:

- `/` → `HomePage` (hero + 16 provincias)
- `/resultados` → `ResultsPage` (filtros + grid 16 items/pagina)
- `/propiedad/tipo-operacion-ubicacion-uuid` → `DetailPage` (slug SEO + breadcrumbs + similares)
- `/publicar` → `PublishPage` (wizard 8 pasos)
- `/editar/:id` → `PublishPage` en modo edicion
- `/mis-propiedades` → `MyPropertiesPage`

No hacer:

- No mezclar resultados dentro de `HomePage`.
- No reactivar Servicios/Productos sin implementar contenido real.
- No borrar las funciones comentadas (`navigateToSection`, `scrollTo`); se necesitaran.
- No acoplar la UI a un proveedor de mapas.

Siguiente refactor recomendado:

1. Implementar contenido real para las secciones Servicios y Productos.
2. Crear `components/layout/Header.tsx` y `components/layout/SiteFooter.tsx`.

## Actualización móvil 2026-07-02

- `CubitatApp` ahora controla `isMobileMenuOpen` para abrir/cerrar el menú móvil del header.
- En móvil se muestra una capa específica: `mobile-header-actions`, `mobile-menu-panel` y `mobile-bottom-nav`.
- La navegación móvil cierra el panel antes de cambiar de vista para evitar que el menú quede encima de la pantalla siguiente.
- La barra inferior móvil navega a `Inicio`, `Favoritos`, `Vender` y `Cuenta`.
- Esta solución es temporal dentro de `CubitatApp`; cuando se extraiga el layout, mover estas piezas a `components/layout/Header.tsx` y `components/layout/MobileBottomNav.tsx`.
3. Evaluar migracion a React Router si la cantidad de rutas crece.
4. Configurar SMTP con Resend para confirmacion de email.
5. Actualizar los `.md` correspondientes despues de cada cambio significativo.

Verificacion reciente (2026-07-01):

- `npm run build` paso exitosamente.
- `npm run test:run` paso exitosamente despues de actualizar tests de `ResultsPage` y `FilterBar`.
- Filtros de operacion exclusivos verificados en SearchBar y FilterBar.
- 16 provincias con fotos funcionales verificadas.
- Slugs SEO y breadcrumbs clicables verificados.
- Propiedades similares con prioridad por provincia verificadas.

## Actualizacion panel y menu movil 2026-07-03

- Se retiro el banner/franja de `Verificar cuenta` del header movil y del layout de cuenta.
- El panel de cuenta ya no debe usar `navigateHome` para acciones internas de regreso. El boton de cuenta usa `navigateAccount`, de modo que vuelve al inicio del panel y no a la portada publica.
- El menu movil autenticado incluye `Cerrar sesion`; al cerrar sesion vuelve a `/` sin abrir el modal de login.

## Recuperación de sesión MFA administrativa — 2026-07-30

- `handleExpiredAdminSession` reutiliza `handleSignOut`, vuelve a `/` y abre el
  login después de limpiar la sesión, la caché de propiedades y el borrador
  legado de publicación.
- `CubitatApp.test.tsx` monta el proveedor real del modal y simula la expiración
  desde `AdminPage`; comprueba el orden del cierre y la limpieza, la navegación
  al inicio y la reapertura del diálogo de autenticación.
- La prueba no usa un TOTP real, no consulta KYC y no realiza llamadas a
  Supabase.

## Aislamiento del bundle de Fase 2 — 2026-07-31

- `AgentProfilePage` y `AgentDashboardPage` se cargan de forma lazy únicamente
  cuando `import.meta.env.DEV` es verdadero. Un build productivo ya no genera
  sus chunks, aunque DEV/local conserva ambas rutas.
- La moderación KYC aplica la misma frontera dentro de `AdminPage`.
- El build ejecuta `verify-phase2-production-bundle.mjs` y falla si detecta los
  chunks exclusivos o el marcador `review_kyc_request`.

## Build remoto DEV de Fase 2 — 2026-09-26

- La UI KYC se habilita mediante el modo explícito `phase2-dev`, no mediante
  `import.meta.env.DEV`, porque un Worker remoto siempre usa un bundle de
  producción de Vite.
- `npm run build` mantiene KYC fuera de producción.
- `npm run build:phase2-dev` verifica que el bundle aislado contenga el módulo
  KYC antes de desplegarlo con `wrangler.phase2-dev.jsonc`.
