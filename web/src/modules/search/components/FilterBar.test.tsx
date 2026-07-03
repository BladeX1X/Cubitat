import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterBar } from './FilterBar'
import type { SearchFilters } from '../types'

const mockFilters: SearchFilters = {
  query: 'La Habana',
  operations: ['venta'],
  propertyType: 'casa',
  zoneId: 'playa',
}

describe('FilterBar', () => {
  it('debería renderizar los filtros activos en los chips', () => {
    render(
      <FilterBar
        filters={mockFilters}
        isSticky={false}
        onClearFilters={vi.fn()}
        onChangeFilters={vi.fn()}
        totalResults={5}
      />
    )

    expect(screen.getByText('Venta')).toBeInTheDocument()
    expect(screen.getByText('Casas')).toBeInTheDocument()
    expect(screen.getByDisplayValue('La Habana')).toBeInTheDocument()
  })

  it('debería aplicar la clase is-sticky cuando isSticky={true}', () => {
    const { container } = render(
      <FilterBar
        filters={mockFilters}
        isSticky={true}
        onClearFilters={vi.fn()}
        onChangeFilters={vi.fn()}
        totalResults={5}
      />
    )

    const toolbar = container.querySelector('.results-toolbar-full')
    expect(toolbar).toHaveClass('is-sticky')
  })

  it('debería llamar a onClearFilters al hacer clic en Limpiar filtros', () => {
    const handleClearFilters = vi.fn()
    render(
      <FilterBar
        filters={mockFilters}
        isSticky={false}
        onClearFilters={handleClearFilters}
        onChangeFilters={vi.fn()}
        totalResults={5}
      />
    )

    // Clic en Filtros para abrir el popover
    const filtersButton = screen.getByRole('button', { name: /filtros/i })
    fireEvent.click(filtersButton)

    const clearButton = screen.getByText(/limpiar filtros/i)
    fireEvent.click(clearButton)

    expect(handleClearFilters).toHaveBeenCalledTimes(1)
  })

  it('debería permitir ingresar y aplicar un rango de precios personalizado', () => {
    const handleFiltersChange = vi.fn()
    render(
      <FilterBar
        filters={mockFilters}
        isSticky={false}
        onClearFilters={vi.fn()}
        onChangeFilters={handleFiltersChange}
        totalResults={5}
      />
    )

    // Clic en Precio para abrir el popover
    const priceButton = screen.getByRole('button', { name: /precio/i })
    fireEvent.click(priceButton)

    // Escribir en Mínimo y Máximo
    const minInput = screen.getByPlaceholderText(/mínimo/i)
    const maxInput = screen.getByPlaceholderText(/máximo/i)
    fireEvent.change(minInput, { target: { value: '25000' } })
    fireEvent.change(maxInput, { target: { value: '75000' } })

    // Click en Aplicar rango
    const applyButton = screen.getByRole('button', { name: /aplicar rango/i })
    fireEvent.click(applyButton)

    expect(handleFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      priceRange: '25000-75000'
    })
  })
})
