import type { ReactNode } from 'react'
import './MarketplaceCatalogHeader.css'

type MarketplaceCatalogHeaderProps = {
  title: string
  description: string
  resultCount: string
  children: ReactNode
}

export function MarketplaceCatalogHeader({ title, description, resultCount, children }: MarketplaceCatalogHeaderProps) {
  return (
    <>
      {children}
      <header className="marketplace-catalog-summary">
        <p className="marketplace-catalog-summary__eyebrow">Resultados destacados</p>
        <h1>{title}</h1>
        <p className="marketplace-catalog-summary__description">{description}</p>
        <p className="marketplace-catalog-summary__count" aria-live="polite">{resultCount}</p>
      </header>
    </>
  )
}
