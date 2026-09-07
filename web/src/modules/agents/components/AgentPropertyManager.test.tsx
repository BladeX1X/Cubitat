import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AgentPropertyManager } from './AgentPropertyManager'
import type { AgentDashboardProperty } from '../agentDashboardRepository'

const property: AgentDashboardProperty = {
  id: 'property-1',
  title: 'Casa accesible en Vedado',
  location: 'Vedado, La Habana',
  price_usd: 85000,
  cover_image: null,
  status: 'published',
  created_at: '2026-08-04T00:00:00.000Z',
  user_id: 'owner-1',
  view_count: 24,
  phone_clicks_count: 1,
  whatsapp_clicks_count: 1,
}

describe('AgentPropertyManager', () => {
  it('uses responsive cards and touch-sized controls below desktop', () => {
    const onToggleVisibility = vi.fn()

    render(
      <AgentPropertyManager
        properties={[property]}
        filteredProperties={[property]}
        loading={false}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        updatingId={null}
        actionMessage={null}
        onToggleVisibility={onToggleVisibility}
        onEditProperty={vi.fn()}
        onSelectProperty={vi.fn()}
      />,
    )

    expect(screen.getByRole('table')).toHaveClass('block', 'lg:table')
    expect(screen.getByText(property.title).closest('tr')).toHaveClass('grid', 'lg:table-row')
    expect(screen.getByPlaceholderText('Buscar por título o zona...')).toHaveClass('h-11')
    expect(screen.getByRole('button', { name: 'Todas (1)' })).toHaveClass('min-h-11')

    const visibilityButton = screen.getByRole('button', { name: 'Ocultar' })
    expect(visibilityButton).toHaveClass('h-11', 'lg:h-9')
    fireEvent.click(visibilityButton)
    expect(onToggleVisibility).toHaveBeenCalledWith(property)
  })
})
