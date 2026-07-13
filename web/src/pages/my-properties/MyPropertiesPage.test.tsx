import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MyPropertiesEmptyState } from './MyPropertiesPage'
import { getPropertyStatusConfig } from './propertyStatus'

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
})
