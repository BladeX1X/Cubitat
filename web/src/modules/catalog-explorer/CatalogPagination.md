# CatalogPagination

Shared numbered pagination controls for the Servicios and Materiales catalogs.
It follows the visible `Anterior` / page numbers / `Siguiente` pattern used by
Comprar/Rentar while leaving data ownership and page requests to each catalog.

## Contract

- Uses server-provided `totalPages` and `currentPage`; page size is 15 records.
- Calls `onPageChange` without changing URL or performing navigation.
- Disables controls while the next page is loading and at the first/last page.
- Hides itself when the result set fits in one page.
- Shows a compact sequence with ellipses for long result sets and exposes the
  current page through `aria-current="page"`.
