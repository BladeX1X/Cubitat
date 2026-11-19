import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CatalogFilterToolbar } from './CatalogFilterToolbar'

const filters = <label><span>Categoría</span><select aria-label="Categoría"><option>Todas</option><option>Cemento</option></select></label>

describe('CatalogFilterToolbar', () => {
  afterEach(() => { document.body.style.overflow = '' })

  const common = { label: 'Filtros de materiales', search: <input aria-label="Buscar material" />, filters, resultLabel: 'anuncios', isResultCountLoading: false, onClearFilters: () => {} }

  it('keeps desktop filters inside the sticky toolbar content', () => {
    render(<CatalogFilterToolbar {...common} activeFiltersCount={0} resultCount={13} />)

    const toolbar = screen.getByRole('complementary', { name: 'Filtros de materiales' })
    const scrollRegion = toolbar.querySelector('.marketplace-filter-toolbar__content')
    expect(scrollRegion).toContainElement(screen.getByLabelText('Categoría'))
    expect(toolbar).not.toHaveStyle({ overflowX: 'auto' })
  })

  it('offers a quick clear action when filters are active', () => {
    let cleared = false
    render(<CatalogFilterToolbar {...common} activeFiltersCount={2} resultCount={4} onClearFilters={() => { cleared = true }} />)

    fireEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }))

    expect(cleared).toBe(true)
  })

  it('opens the filter sheet, applies filters in place, clears, and closes on Escape', () => {
    let cleared = false
    render(<CatalogFilterToolbar {...common} activeFiltersCount={1} resultCount={2} onClearFilters={() => { cleared = true }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar filtros de anuncios' }))

    const dialog = screen.getByRole('dialog', { name: 'Filtros de materiales' })
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.change(within(dialog).getByLabelText('Categoría'), { target: { value: 'Cemento' } })
    expect(within(dialog).getByLabelText('Categoría')).toHaveValue('Cemento')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Limpiar filtros' }))
    expect(cleared).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('does not present the previous total while new filters are loading', () => {
    render(<CatalogFilterToolbar {...common} isResultCountLoading resultCount={20} activeFiltersCount={1} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar filtros de anuncios' }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('button', { name: 'Ver resultados' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Ver 20 anuncios' })).not.toBeInTheDocument()
  })
})
