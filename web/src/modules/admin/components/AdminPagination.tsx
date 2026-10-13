import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../shared/ui/button'

type PageItem = number | 'ellipsis'

function getPageItems(currentPage: number, pageCount: number): PageItem[] {
  const pages = new Set([0, pageCount - 1])
  for (let page = Math.max(0, currentPage - 1); page <= Math.min(pageCount - 1, currentPage + 1); page += 1) {
    pages.add(page)
  }

  const visiblePages = [...pages].sort((a, b) => a - b)
  return visiblePages.flatMap((page, index) => {
    if (index === 0) return [page]
    const previous = visiblePages[index - 1]
    return [...(page - previous > 1 ? ['ellipsis' as const] : []), page]
  })
}

export function AdminPagination({
  page,
  total,
  pageSize,
  itemLabel,
  onPageChange,
}: {
  page: number
  total: number
  pageSize: number
  itemLabel: string
  onPageChange: (page: number) => void
}) {
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount <= 1) return null

  const safePage = Math.min(Math.max(0, page), pageCount - 1)
  const pageItems = getPageItems(safePage, pageCount)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-neutral-500" aria-live="polite">
        Página {safePage + 1} de {pageCount} ({total} {itemLabel})
      </p>
      <nav aria-label={`Paginación de ${itemLabel}`} className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={safePage === 0}
          onClick={() => onPageChange(safePage - 1)}
          className="gap-1 px-2 sm:px-3"
        >
          <ChevronLeft aria-hidden="true" />
          <span>Anterior</span>
        </Button>
        {pageItems.map((item, index) => item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} aria-hidden="true" className="flex size-9 items-center justify-center text-sm text-neutral-500">
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === safePage ? 'default' : 'ghost'}
            size="icon"
            aria-label={`Página ${item + 1}`}
            aria-current={item === safePage ? 'page' : undefined}
            onClick={() => onPageChange(item)}
            className="size-9"
          >
            {item + 1}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={safePage >= pageCount - 1}
          onClick={() => onPageChange(safePage + 1)}
          className="gap-1 px-2 sm:px-3"
        >
          <span>Siguiente</span>
          <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    </div>
  )
}
