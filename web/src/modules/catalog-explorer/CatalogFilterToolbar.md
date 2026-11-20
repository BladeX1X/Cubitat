# CatalogFilterToolbar

Shared search and filter control for the Servicios and Materiales catalogs.
Desktop shows the search field and domain filters in the sticky toolbar. At
viewport widths up to 768 px it keeps search visible beside a circular sliders
button and moves domain filters into a bottom sheet.

The desktop toolbar follows the property results toolbar's compact field sizing
and offers a one-click clear action whenever filters are active. Catalog
controls apply changes immediately without navigating or reloading.

The sheet locks body scrolling while open, moves keyboard focus into the
dialog, traps Tab and Shift+Tab within its controls, and closes on Escape,
backdrop, close button, or “Ver resultados”. When closed, focus returns to the
trigger. Filters remain controlled by their catalog page and apply immediately
through its existing query state. The shared toolbar owns only presentation,
active filter count, clear action, and result summary.
