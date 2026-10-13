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

  it('classifies partial image matches and tells moderators to confirm manually', () => {
    const imageMatchProperty = property('pending_review')
    imageMatchProperty.image_duplicate_matches = [
      { id: 'related-property', title: 'Casa similar', distance: 6 },
    ]
    imageMatchProperty.image_hash_status = {
      indexed_at: '2026-10-09T12:00:00Z',
      processed_images: 2,
      eligible_with_images: 12,
      indexed_with_hashes: 8,
    }

    render(<PropertyModerationCard
      property={imageMatchProperty}
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

    expect(screen.getByText(/coincidencia parcial/i)).toBeInTheDocument()
    expect(screen.getByText(/6 de 64 diferencias/i)).toBeInTheDocument()
    expect(screen.getByText(/compara fotos y datos del inmueble/i)).toBeInTheDocument()
    expect(screen.getByText(/nunca rechaces solo por esta señal/i)).toBeInTheDocument()
    expect(screen.getByText(/cobertura de fotos comparables: 8 de 12 publicaciones activas con fotos propias procesables/i)).toBeInTheDocument()
    expect(screen.getByText(/imágenes externas, incluidas las de stock, no se comparan/i)).toBeInTheDocument()
  })

  it('shows checked with no matches and complete index coverage', () => {
    const checkedProperty = property('pending_review')
    checkedProperty.image_hash_status = {
      indexed_at: '2026-10-09T12:00:00Z',
      processed_images: 2,
      eligible_with_images: 12,
      indexed_with_hashes: 12,
    }

    render(<PropertyModerationCard
      property={checkedProperty}
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

    expect(screen.getByText(/sin coincidencias de imagen/i)).toBeInTheDocument()
    expect(screen.getByText(/todas las fotos propias procesables del catálogo activo tienen hash/i)).toBeInTheDocument()
  })

  it('distinguishes unprocessed hashes from no matches', () => {
    const unprocessedProperty = property('pending_review')
    unprocessedProperty.image_hash_status = {
      indexed_at: null,
      processed_images: null,
      eligible_with_images: 12,
      indexed_with_hashes: 8,
    }

    render(<PropertyModerationCard
      property={unprocessedProperty}
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

    expect(screen.getByText(/revisión de imágenes pendiente/i)).toBeInTheDocument()
    expect(screen.getByText(/no se puede confirmar que esté libre de coincidencias/i)).toBeInTheDocument()
  })

  it('explains that external stock images are outside pHash coverage', () => {
    const externalImageProperty = property('pending_review')
    externalImageProperty.image_hash_status = {
      indexed_at: '2026-10-09T12:00:00Z',
      processed_images: 0,
      eligible_with_images: 3,
      indexed_with_hashes: 3,
    }

    render(<PropertyModerationCard
      property={externalImageProperty}
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

    expect(screen.getByText(/no se compararon imágenes propias guardadas/i)).toBeInTheDocument()
    expect(screen.getByText(/imágenes externas quedan fuera del análisis/i)).toBeInTheDocument()
  })
})
