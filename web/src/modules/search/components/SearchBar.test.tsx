import { render, screen } from '@testing-library/react'
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
  })
})
