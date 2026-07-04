# Changelog - Cubitat

## Últimos cambios (sesión actual)

### Commits

| Commit | Mensaje |
|--------|---------|
| `bad7126` | feat: add admin panel and moderation flow |
| `5910ad5` | fix: revert blocking inline script, use static preloads with media query |
| `49eae92` | fix: improve mobile detail accessibility |
| `e5a6271` | perf: preload first results image earlier |
| `c9a8ca1` | fix: improve detail page accessibility |
| `609c1cf` | fix: improve SEO metadata and accessible labels |
| `8f5e44b` | perf: improve audit metrics and accessibility |
| `5d91099` | fix: improve property card carousel accessibility |
| `9f06a16` | fix: generate sitemap from published supabase properties |
| `23ca8ee` | perf: reduce max image size to 800px and quality to 0.70 |
| `a305a5e` | perf: reduce hero quality, preconnect supabase, preload first result image |


---

### Resumen de cambios por categoría

#### Accesibilidad (100 en todas las rutas ✅)

1. **Contraste de color** - Varios elementos tenían contraste insuficiente:
   - Botón "Publicar gratis" del header: `#008b69` → `var(--green-dark)` (#006b5d)
   - Botón CTA móvil de detalle (`mobile-detail-cta-primary`): `#17c964` → `var(--green-dark)`
   - Textos secundarios (`text-neutral-400`): cambiados a `text-neutral-600`
   - Labels de formulario y spans de detalle: `text-neutral-400` → `text-neutral-600`
   - Iconos y botones secundarios móviles: `#008367` → `var(--green-dark)`

2. **Heading order** - Jerarquía de encabezados corregida en detalle:
   - `h3` de secciones (`Características`, `Descripción`, `Amenidades`, `Ubicación`) → `h2`
   - `h4` "Ubicación aproximada protegida" → `h2`
   - "Contactar anunciante" de `h3` → `h2`

3. **Form labels** - Formulario de contacto:
   - `Textarea` sin `id`/`htmlFor` asociado → corregido
   - Inputs de nombre y teléfono → corregidos

4. **Touch targets** - Targets táctiles pequeños:
   - Dots de galería de cards (`property-photo-dot`): 7×7 → 24×24 (punto visual 7×7)
   - Dots de galería de detalle móvil (`mobile-detail-gallery-dot`): 7×7 → 24×24 (punto visual 7×7)

5. **Logo accessible name** - `aria-label` del logo iterado para evitar mismatch

#### Performance

1. **Preload condicional de imágenes** (`index.html`):
   - Hero image siempre precargada como `<link rel="preload">` estático (descubrimiento inmediato por el preloader especulativo)
   - Segunda preload para la primera card de resultados con `media="(max-width: 640px)"` (solo móvil)
   - ❌ Se probó con `<script>` inline condicional pero **regresó** FCP/LCP en todas las rutas (~2s de retraso) porque el script bloquea el parseo HTML

2. **Supabase query optimizado** (`CubitatApp.tsx`):
   - `.select('*')` → `.select('id,title,location,description,zone_id,...')` (20 columnas explícitas)
   - Payload reducido de ~291KB → ~210KB descomprimido

3. **Preload temprano de primera imagen de resultados**:
   - Movido de `ResultsPage` (lazy, renderizado tardío) a `CubitatApp` (se dispara cuando Supabase devuelve datos, antes del render del componente lazy)

4. **Imágenes optimizadas**:
   - Hero: WebP con srcSet responsivo (800w/1200w/1600w), calidad reducida (45/50/55)
   - Cards Unsplash: `w=500&q=55`
   - Subida de imágenes: max 800px, WebP calidad 0.70

5. **Google Analytics**: Carga diferida 8s después del evento `load`

#### SEO

- Meta description añadida
- Sitemap generado desde Supabase con 218 URLs reales de propiedades publicadas
- Favicons PNG (32×32, 48×48) y SVG

---

### Auditorías Lighthouse Móvil (Unlighthouse CI - 4 rutas)

| Ruta | Perf | Acc | SEO | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` | **94** | 100 | 100 | 2.9s | 2.0s | 0ms | 0 |
| `/recuperar-contrasena` | **92** | 100 | 100 | 3.2s | 2.0s | 0ms | 0 |
| `/resultados` | **80** | 100 | 100 | 4.8s | 2.2s | 0ms | 0.019 |
| `/auth/callback` | **71** | 100 | 100 | 5.3s | 3.8s | 20ms | 0.003 |

### Lecciones aprendidas

- **No reemplazar `<link rel="preload">` estático por `<script>` inline**: el preloader especulativo del navegador descubre los links declarativos antes de ejecutar cualquier JS. Un script inline bloquea el parseo y retrasa FCP/LCP ~2s.
- **Usar `media` queries en preloads** para aplicar preloads condicionales sin perder el descubrimiento temprano.
- **Lighthouse móvil tiene alta varianza** (especialmente TBT y LCP). Una sola corrida no es concluyente; usar el CI (promedio de 5) da más estabilidad.
- **Los reportes locales de Unlighthouse** (`localhost:5678`) pueden mezclar audits viejos y nuevos; siempre verificar el `fetchTime` por ruta.

### Archivos modificados

- `web/index.html` - Preloads estáticos, meta tags, favicons
- `web/src/app/CubitatApp.tsx` - Preload temprano de imagen, select explícito de Supabase
- `web/src/styles/app.css` - Contraste, touch targets, dots de galería móvil
- `web/src/pages/detail/DetailPage.tsx` - Heading order, labels de formulario, contraste
- `web/src/pages/results/ResultsPage.tsx` - Preload de primera imagen movido al root
- `web/src/modules/properties/components/PropertyCard.tsx` - Contraste specs, touch targets de dots
- `web/scripts/generate-sitemap.mjs` - Nuevo script para generar sitemap desde Supabase
- `web/public/sitemap.xml` - Regenerado con URLs reales
- `web/wrangler.jsonc` - Rutas custom domain
- `web/src/shared/lib/analytics.ts` - GA diferido
- `web/src/modules/properties/utils/images.ts` - Parámetros de optimización Unsplash

### Moderación y flujo de administración

1. **DB migration: rol admin** - Se agregó `admin` al enum `user_role` y se crearon políticas RLS para que admins lean, actualicen y eliminen todas las propiedades.
2. **PublishPage → pending_review** - Las propiedades nuevas/guardadas se publican como `pending_review` en vez de `published`.
3. **AdminPage (`/moderar`)** - Nuevo panel de moderación que lista propiedades pendientes con botones Aprobar (→ published) y Rechazar (→ paused).
4. **Ruteo protegido** - La ruta `/moderar` verifica que el usuario tenga role `admin`; si no, muestra pantalla de acceso restringido.
5. **UserMenu + menú móvil** - Link a "Panel de moderación" aparece solo para usuarios con role `admin`, tanto en el menú desktop como en el menú móvil.
6. **MyPropertiesPage** - Corregido tipo `'pending'` por `'pending_review'` y badge "Pendiente de revisión".

### Archivos modificados/nuevos

- `web/supabase/migrations/20260704000000_add_admin_role.sql` - Nuevo: agrega `admin` al enum
- `web/supabase/migrations/20260704000001_add_admin_policies.sql` - Nuevo: RLS policies para admin
- `web/src/pages/moderar/AdminPage.tsx` - Nuevo: panel de moderación
- `web/src/pages/publish/PublishPage.tsx` - `'published'` → `'pending_review'`
- `web/src/pages/my-properties/MyPropertiesPage.tsx` - Tipo corregido, badge actualizado
- `web/src/app/CubitatApp.tsx` - Ruta `/moderar`, fetch de role, admin guard
- `web/src/components/UserMenu.tsx` - Link condicional a panel de moderación

### Reportes generados (locales, no commitear)

- `web/.unlighthouse-ci/` - Múltiples corridas de auditoría
- `web/unlighthouse-payload.json` / `web/unlighthouse-live-payload.json` - Payloads de Unlighthouse
- `web/scripts/optimize-images.mjs` - Script de optimización de imágenes
