import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CatalogCardFrame } from './CatalogCardFrame'

describe('CatalogCardFrame', () => {
  it('keeps property contact actions side by side inside the card footer', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/shared/ui/CatalogCardFrame.css'), 'utf8')
    expect(styles).toMatch(/\.property-card \.catalog-card__actions\s*\{[^}]*display:\s*flex;/)
  })

  it('provides the shared catalog card frame for every listing type', () => {
    render(
      <CatalogCardFrame className="property-card">
        <h2>Publicación de prueba</h2>
      </CatalogCardFrame>,
    )

    const card = screen.getByRole('article')
    expect(card).toHaveClass('catalog-card', 'property-card')
    expect(screen.getByRole('heading', { name: 'Publicación de prueba' })).toBeInTheDocument()
  })
})
