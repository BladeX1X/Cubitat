import { Button } from '../../shared/ui/button'

export const CATALOG_PAGE_SIZE = 15

type CatalogPaginationProps = {
  currentPage: number
  totalPages: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 6) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages: Array<number | 'ellipsis'> = [1]
  if (currentPage > 3) pages.push('ellipsis')
  for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) {
    pages.push(page)
  }
  if (currentPage < totalPages - 2) pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

export function CatalogPagination({ currentPage, totalPages, disabled = false, onPageChange }: CatalogPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav className="catalog-pagination" aria-label="Paginación del catálogo">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Anterior
      </Button>

      <div className="catalog-pagination__pages" aria-label="Páginas">
        {getVisiblePages(currentPage, totalPages).map((page, index) => page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="catalog-pagination__ellipsis" aria-hidden="true">…</span>
        ) : (
          <button
            key={page}
            type="button"
            className={`catalog-pagination__page${page === currentPage ? ' is-current' : ''}`}
            aria-label={`Página ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Siguiente
      </Button>
    </nav>
  )
}
