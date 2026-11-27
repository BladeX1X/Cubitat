import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MyPropertiesEmptyState, PropertyCard } from './MyPropertiesPage'
import { getLocalDraftCoverImage } from './localDraftCover'
import { getPropertyStatusConfig } from '../../modules/properties/propertyStatus'

describe('getPropertyStatusConfig', () => {
  it('presenta los borradores remotos sin romper la pagina', () => {
    expect(getPropertyStatusConfig('draft')).toEqual({
      label: 'Borrador',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    })
  })

  it('presenta un estado vacio accesible para publicar la primera propiedad', () => {
    const { container } = render(<MyPropertiesEmptyState onPublish={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /aún no tienes propiedades/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /publicar tu primera propiedad/i })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders property card with view_count correctly', () => {
    const mockProperty = {
      id: 'prop-123',
      title: 'Casa hermosa en La Habana',
      location: 'La Habana, Cuba',
      price_usd: 75000,
      cover_image: null,
      status: 'published' as const,
      moderation_message: null,
      created_at: new Date().toISOString(),
      user_id: 'user-456',
      view_count: 142,
    }

    render(
      <PropertyCard
        property={mockProperty}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onRestore={vi.fn()}
        actionLoading={false}
      />
    )

    expect(screen.getByText('Casa hermosa en La Habana')).toBeInTheDocument()
    expect(screen.getByText('142')).toBeInTheDocument()
  })

  it('renders the authenticated private image preview on the publication card', () => {
    render(
      <PropertyCard
        property={{
          id: 'prop-private-photo',
          title: 'Casa con fotos privadas',
          location: 'La Habana',
          price_usd: 50000,
          cover_image: 'data:image/svg+xml,placeholder',
          cover_preview_url: 'blob:owner-preview',
          status: 'published',
          moderation_message: null,
          created_at: new Date().toISOString(),
          user_id: 'owner-1',
        }}
        onEdit={vi.fn()} onDelete={vi.fn()} onHide={vi.fn()} onRestore={vi.fn()} actionLoading={false}
      />,
    )

    expect(screen.getByRole('img', { name: 'Casa con fotos privadas' })).toHaveAttribute('src', 'blob:owner-preview')
  })

  it('renders a swap property without an optional USD value', () => {
    render(
      <PropertyCard
        property={{
          id: 'permuta-123',
          title: 'Departamento en permuta en La Habana',
          location: 'Playa, La Habana',
          price_usd: null,
          cover_image: null,
          status: 'pending_review',
          moderation_message: null,
          created_at: new Date().toISOString(),
          user_id: 'user-456',
        }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onRestore={vi.fn()}
        actionLoading={false}
      />,
    )

    expect(screen.getByText('Valor no indicado')).toBeInTheDocument()
  })

  it('renders "Ver cómo otros lo ven" button and triggers onView', () => {
    const mockProperty = {
      id: 'prop-123',
      title: 'Casa hermosa en La Habana',
      location: 'La Habana, Cuba',
      price_usd: 75000,
      cover_image: null,
      status: 'published' as const,
      moderation_message: null,
      created_at: new Date().toISOString(),
      user_id: 'user-456',
      view_count: 142,
    }
    const onViewMock = vi.fn()

    render(
      <PropertyCard
        property={mockProperty}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onHide={vi.fn()}
        onRestore={vi.fn()}
        onView={onViewMock}
        actionLoading={false}
      />
    )

    const viewButton = screen.getByRole('button', { name: /ver cómo otros lo ven/i })
    expect(viewButton).toBeInTheDocument()
    viewButton.click()
    expect(onViewMock).toHaveBeenCalledOnce()
  })
})

describe('local publication draft cover', () => {
  it('uses the first locally stored image as the draft card cover', () => {
    const cover = getLocalDraftCoverImage([
      { dataUrl: 'data:image/webp;base64,YQ==' },
      { dataUrl: 'data:image/webp;base64,Yg==' },
    ])
    expect(cover).toBe('data:image/webp;base64,YQ==')
  })

  it('does not use non-image values or a remote URL as a local draft cover', () => {
    expect(getLocalDraftCoverImage([{ dataUrl: 'https://example.com/image.webp' }])).toBeNull()
    expect(getLocalDraftCoverImage([])).toBeNull()
    expect(getLocalDraftCoverImage(null)).toBeNull()
  })

  it('renders the selected draft cover in the publication card', () => {
    const cover = getLocalDraftCoverImage([{ dataUrl: 'data:image/webp;base64,YQ==' }])
    render(<PropertyCard property={{
      id: 'local_draft:legacy', title: 'Borrador QA', location: 'La Habana', price_usd: 0,
      cover_image: cover, status: 'local_draft', moderation_message: null,
      created_at: new Date().toISOString(), user_id: 'user-456',
    }} onEdit={vi.fn()} onDelete={vi.fn()} onHide={vi.fn()} onRestore={vi.fn()} actionLoading={false} />)
    expect(screen.getByRole('img', { name: 'Borrador QA' })).toHaveAttribute('src', cover)
  })
})
