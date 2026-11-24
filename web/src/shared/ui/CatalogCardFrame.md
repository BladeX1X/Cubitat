# CatalogCardFrame

`CatalogCardFrame` supplies the common article surface and shared card styles
for property results, home services, and construction materials. Domain pages
keep their own data and actions; the shared frame standardizes border, radius,
shadow, photo ratio, text density, footer actions, and responsive grid sizing.

The shared `CatalogCardGallery` renders carousel arrows and dots only for
multiple photos. It keeps the marketplace favorite button over the image and
leaves domain details and actions to each catalog page. `MarketplaceCardImage`
continues to optimize and lazy-load each photo.

The card grid uses content-based columns with the same 320 px minimum and 24 px
gap in all three catalogs. With the map closed, results, services, and materials
share a 72 rem content width. The two marketplace catalogs keep their distinct
labels and detail fields while using the same category chip, title, location,
image, and pill-shaped contact actions as property cards.

Property card footer actions remain in a horizontal flex row; Services and
Materials use their shared two-column action grid. The frame must not override
the property footer layout with a block display rule.

Keep the frame independent of domain modules. Catalog-specific behavior belongs
in the caller; the shared component only owns the semantic card shell and styles.

## Production — 2026-11-23

Deployed on `cubitat1` as version `318d5a93-5f0e-4ef2-8a3b-4859924951e1`.
Lint, 1,135 tests (1 skipped), and the `phase4-production` build passed. The
production smoke check returned HTTP 200 for `/`, `/resultados`, `/servicios`,
and `/materiales`; the shared CSS returned 200 and contains the common grid,
320 px minimum columns, and 16:9 image rule.

## Property action row correction — production — 2026-11-23

The property card footer explicitly uses a horizontal flex row so the shared
block footer rule cannot stack Contactar and Consultar. Deployed to `cubitat1`
as version `a6ef8353-8d36-47fd-a8e7-2ff291243d9b` at 100% traffic. Catalog
routes returned HTTP 200; the production CSS confirms `display:flex` on the
property action footer.
