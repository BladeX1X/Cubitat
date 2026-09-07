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
