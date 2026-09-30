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

  it('shows structured exchange preferences when reviewing a swap', () => {
    const exchangeProperty = property('pending_review')
    exchangeProperty.operation = 'permuta'
    exchangeProperty.features = {
      exchangePreferences: {
        propertyType: 'casa',
        province: 'Matanzas',
        municipality: 'Cárdenas',
        minBedrooms: 3,
        cashAdjustment: { direction: 'receive', amountUsd: 5000 },
      },
    }

    render(<PropertyModerationCard
      property={exchangeProperty}
      expanded
      actionLoading={false}
      onToggle={vi.fn()}
      onApprove={vi.fn()}
      onReject={vi.fn()}
      onHide={vi.fn()}
      onRestore={vi.fn()}
      onReevaluate={vi.fn()}
      onDelete={vi.fn()}
    />)

    expect(screen.getByRole('heading', { name: /busca a cambio/i })).toBeInTheDocument()
    expect(screen.getByText(/cárdenas, matanzas/i)).toBeInTheDocument()
    expect(screen.getByText(/espera recibir hasta USD 5,000/i)).toBeInTheDocument()
  })

  it('shows the related publication when the DEV duplicate flag is present', () => {
    const duplicateProperty = property('pending_review')
    duplicateProperty.duplicate_of = 'related-property'
    duplicateProperty.duplicate_title = 'Casa relacionada en La Habana'

    render(<PropertyModerationCard
      property={duplicateProperty}
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

    expect(screen.getByText(/posible duplicado/i)).toBeInTheDocument()
    expect(screen.getByText(/casa relacionada en la habana/i)).toBeInTheDocument()
  })
})
