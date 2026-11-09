import type { ReactNode } from 'react'

export function CatalogFilterToolbar({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside aria-label={label} className="marketplace-filter-toolbar">
      <h2 className="sr-only">Filtrar resultados</h2>
      <div className="marketplace-filter-toolbar__content">{children}</div>
    </aside>
  )
}
