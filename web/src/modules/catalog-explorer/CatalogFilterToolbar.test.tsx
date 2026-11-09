import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CatalogFilterToolbar } from './CatalogFilterToolbar'

describe('CatalogFilterToolbar', () => {
  it('keeps horizontal scrolling inside the sticky toolbar', () => {
    render(
      <CatalogFilterToolbar label="Filtros de servicios">
        <label htmlFor="category">Categoría</label>
        <select id="category"><option>Todas</option></select>
      </CatalogFilterToolbar>,
    )

    const toolbar = screen.getByRole('complementary', { name: 'Filtros de servicios' })
    const scrollRegion = toolbar.querySelector('.marketplace-filter-toolbar__content')

    expect(scrollRegion).not.toBeNull()
    expect(scrollRegion).toContainElement(screen.getByLabelText('Categoría'))
    expect(toolbar).not.toHaveStyle({ overflowX: 'auto' })
  })
})
