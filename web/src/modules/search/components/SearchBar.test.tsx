import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchBar } from './SearchBar'
import type { SearchFilters } from '../types'

const filters: SearchFilters = {
  query: '',
  operations: [],
  propertyType: 'all',
  zoneId: '',
}

describe('SearchBar', () => {
  it('muestra todas las provincias en orden de occidente a oriente sin recortar el menú', () => {
    const onChange = vi.fn()

    render(
      <SearchBar
        filters={filters}
        locationSuggestions={[]}
        onChange={onChange}
        onClear={vi.fn()}
        onSubmitSearch={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Selecciona provincia' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Pinar del Río',
      'Artemisa',
      'La Habana',
      'Mayabeque',
      'Matanzas',
      'Cienfuegos',
      'Villa Clara',
      'Sancti Spíritus',
      'Ciego de Ávila',
      'Camagüey',
      'Las Tunas',
      'Holguín',
      'Granma',
      'Santiago de Cuba',
      'Guantánamo',
      'Isla de la Juventud',
    ])

    expect(screen.getByRole('listbox')).toHaveStyle({ position: 'fixed' })

    fireEvent.click(screen.getByRole('option', { name: 'Isla de la Juventud' }))
    expect(screen.getByRole('listbox', { hidden: true })).toHaveAttribute('data-state', 'closed')
    expect(onChange).toHaveBeenCalledWith({ ...filters, query: 'Isla de la Juventud' })
  })

  it('mantiene nombres accesibles que incluyen el texto visible', () => {
    render(
      <SearchBar
        filters={filters}
        locationSuggestions={[]}
        onChange={vi.fn()}
        onClear={vi.fn()}
        onSubmitSearch={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Selecciona provincia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elige provincia' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Buscar inmuebles' })).toBeInTheDocument()
    expect(screen.getByText('Todos los inmuebles')).toBeInTheDocument()
    expect(screen.queryByText('Departamentos')).not.toBeInTheDocument()
  })

  it('permite volver a todos los inmuebles desde el selector de tipo', () => {
    const onChange = vi.fn()

    render(
      <SearchBar
        filters={{ ...filters, propertyType: 'apartamento' }}
        locationSuggestions={[]}
        onChange={onChange}
        onClear={vi.fn()}
        onSubmitSearch={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Departamentos/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Todos los inmuebles' }))

    expect(onChange).toHaveBeenCalledWith({ ...filters, propertyType: 'all' })
  })
})
