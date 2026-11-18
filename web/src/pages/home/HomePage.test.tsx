import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import type { SearchFilters } from '../../modules/search/types'

const filters: SearchFilters = {
  query: '',
  operations: [],
  propertyType: 'all',
  zoneId: 'all',
}

describe('HomePage', () => {
  it('keeps the shared SPA document free of a global hero preload', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

    expect(html).not.toContain('photo-1600607687939-ce8a6c25118c')
  })

  it('reserva la prioridad de red para el hero y difiere las provincias', () => {
    const { container } = render(
      <HomePage
        filters={filters}
        locationSuggestions={[]}
        onChangeFilters={vi.fn()}
        onClearFilters={vi.fn()}
        onSubmitSearch={vi.fn()}
      />,
    )

    const hero = container.querySelector<HTMLImageElement>('.hero-media')
    const locations = container.querySelectorAll<HTMLImageElement>('.location-card-image')

    expect(hero).toHaveAttribute('fetchpriority', 'high')
    expect(hero?.srcset).toContain('w=768&q=40 768w')
    expect(locations).toHaveLength(16)
    locations.forEach((image) => {
      expect(image).toHaveAttribute('loading', 'lazy')
      expect(image).toHaveAttribute('fetchpriority', 'low')
      expect(image.src).toContain('w=420')
      expect(image.src).toContain('q=45')
    })

    expect(screen.getByRole('heading', { name: 'El portal inmobiliario para Cuba' })).toBeInTheDocument()
    expect(screen.queryByText('El portal inmobiliario más grande de Cuba')).not.toBeInTheDocument()
  })
})
