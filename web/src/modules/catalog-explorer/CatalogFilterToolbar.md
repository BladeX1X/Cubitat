# CatalogFilterToolbar

Shared search and filter control for the Servicios and Materiales catalogs.
Desktop shows the search field and domain filters in the sticky toolbar. At
viewport widths up to 768 px it keeps search visible beside a circular sliders
button and moves domain filters into a bottom sheet.

The sheet locks body scrolling while open, closes on Escape, backdrop, close
button, or “Ver resultados”, and returns focus to the trigger. Filters remain
controlled by their catalog page and apply immediately through its existing
query state. The shared toolbar owns only presentation, active filter count,
clear action, and result summary.
