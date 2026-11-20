import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '../../shared/ui/button'

export type CatalogFilterToolbarProps = {
  label: string
  search: ReactNode
  filters: ReactNode
  activeFiltersCount: number
  resultCount: number
  resultLabel: string
  onClearFilters: () => void
}

export function CatalogFilterToolbar({
  label,
  search,
  filters,
  activeFiltersCount,
  resultCount,
  resultLabel,
  onClearFilters,
}: CatalogFilterToolbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const trigger = triggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const getFocusableElements = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true')

    getFocusableElements()[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)

      if (!firstElement || !lastElement) {
        event.preventDefault()
      } else if (event.shiftKey && (document.activeElement === firstElement || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && (document.activeElement === lastElement || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      trigger?.focus()
    }
  }, [isOpen])

  return (
    <>
      <aside aria-label={label} className="marketplace-filter-toolbar">
        <h2 className="sr-only">Filtrar resultados</h2>
        <div className="marketplace-filter-toolbar__content">
          <div className="marketplace-filter-toolbar__search">{search}</div>
          <div className="marketplace-filter-toolbar__desktop-filters">{filters}</div>
          {activeFiltersCount > 0 ? (
            <Button type="button" variant="ghost" className="marketplace-filter-clear" onClick={onClearFilters}>
              Limpiar filtros<span className="sr-only"> ({activeFiltersCount} activos)</span>
            </Button>
          ) : null}
          <Button
            ref={triggerRef}
            type="button"
            variant="secondary"
            className="marketplace-filter-toolbar__trigger"
            aria-label={`Mostrar filtros de ${resultLabel}`}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(true)}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span className="marketplace-filter-toolbar__count" aria-hidden="true">{activeFiltersCount || ''}</span>
          </Button>
        </div>
      </aside>
      {isOpen ? (
        <div
          ref={dialogRef}
          className="catalog-filter-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false) }}
        >
          <section className="catalog-filter-sheet__panel">
            <header className="catalog-filter-sheet__header">
              <h2>Filtros</h2>
              <Button type="button" variant="ghost" size="icon" aria-label="Cerrar filtros" onClick={() => setIsOpen(false)}><X size={20} /></Button>
            </header>
            <div className="catalog-filter-sheet__body">{filters}</div>
            <footer className="catalog-filter-sheet__footer">
              <Button type="button" variant="ghost" onClick={onClearFilters}>Limpiar filtros</Button>
              <Button type="button" onClick={() => setIsOpen(false)}>Ver {resultCount} {resultLabel}</Button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  )
}
