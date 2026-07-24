import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ModerationProperty } from '../core/types'
import { PropertyModerationCard } from './PropertyModerationCard'

function property(status: ModerationProperty['status']): ModerationProperty {
  return {
    id: 'property-1', title: 'Casa de prueba', location: 'La Habana', description: 'Descripción',
    price_usd: 100, cover_image: null, images: null, created_at: '2026-07-14T00:00:00Z',
    user_id: 'owner-1', operation: 'venta', property_type: 'casa', bedrooms: 2,
    bathrooms: 1, parking: 0, area_m2: 80, age_years: null, amenities: null,
    features: null, contact_info: null, status, moderation_message: null,
  }
}

function renderCard(status: ModerationProperty['status']) {
  render(<PropertyModerationCard
    property={property(status)}
    expanded={false}
    actionLoading={false}
    onToggle={vi.fn()}
    onApprove={vi.fn()}
    onReject={vi.fn()}
    onHide={vi.fn()}
    onRestore={vi.fn()}
    onReevaluate={vi.fn()}
    onDelete={vi.fn()}
  />)
}

describe('PropertyModerationCard visibility actions', () => {
  it('offers reversible administrative hiding for published properties', () => {
    renderCard('published')
    expect(screen.getByRole('button', { name: /ocultar con motivo/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /volver a publicar/i })).not.toBeInTheDocument()
  })

  it('lets admin restore only administratively paused properties', () => {
    renderCard('paused')
    expect(screen.getByRole('button', { name: /volver a publicar/i })).toBeInTheDocument()
  })

  it('shows owner-hidden rows without an administrative restore action', () => {
    renderCard('owner_hidden')
    expect(screen.getByText('Oculta por propietario')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /volver a publicar/i })).not.toBeInTheDocument()
  })
})
