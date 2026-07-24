import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function BrokenChild(): never {
  throw new Error('fallo de prueba')
}

describe('ErrorBoundary', () => {
  it('presenta recuperacion accesible ante un error inesperado', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const { container } = render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: /conexión interrumpida o error de carga/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar ahora/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volver a la página de inicio/i })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
