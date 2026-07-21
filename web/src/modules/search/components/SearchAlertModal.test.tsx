import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchAlertModal } from './SearchAlertModal'
import type { SearchFilters } from '../types'

const mockFilters: SearchFilters = {
  query: 'La Habana',
  operations: ['venta'],
  propertyType: 'casa',
  zoneId: 'all',
}

describe('SearchAlertModal', () => {
  it('renders successfully with configured filters and allows close', () => {
    const handleClose = vi.fn()
    const handleGoToAccount = vi.fn()

    render(
      <SearchAlertModal
        isOpen={true}
        onClose={handleClose}
        onGoToAccount={handleGoToAccount}
        filters={mockFilters}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('¡Alerta de búsqueda creada!')).toBeInTheDocument()
    expect(screen.getByText('Ubicación: La Habana')).toBeInTheDocument()
    expect(screen.getByText('Operación: Venta')).toBeInTheDocument()

    // Click "Entendido"
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('navigates to account when Go to Account is clicked', () => {
    const handleClose = vi.fn()
    const handleGoToAccount = vi.fn()

    render(
      <SearchAlertModal
        isOpen={true}
        onClose={handleClose}
        onGoToAccount={handleGoToAccount}
        filters={mockFilters}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ver en Mi cuenta' }))
    expect(handleClose).toHaveBeenCalledTimes(1)
    expect(handleGoToAccount).toHaveBeenCalledTimes(1)
  })

  it('renders error state correctly when isError is true', () => {
    render(
      <SearchAlertModal
        isOpen={true}
        onClose={vi.fn()}
        filters={mockFilters}
        isError={true}
        errorMessage="Fallo de conexión"
      />
    )

    expect(screen.getByText('No se pudo crear la alerta')).toBeInTheDocument()
    expect(screen.getByText('Fallo de conexión')).toBeInTheDocument()
  })
})
