import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MyPropertiesEmptyState, PropertyCard } from './MyPropertiesPage'
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
