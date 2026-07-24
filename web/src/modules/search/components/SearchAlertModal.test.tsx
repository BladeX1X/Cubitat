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

  it('captures optional email and calls onSaveAlert', () => {
    const handleSaveAlert = vi.fn()
    const handleEmailChange = vi.fn()

    render(
      <SearchAlertModal
        isOpen={true}
        onClose={vi.fn()}
        filters={mockFilters}
        onEmailChange={handleEmailChange}
        onSaveAlert={handleSaveAlert}
      />
    )

    const emailInput = screen.getByLabelText(/Correo electrónico para recibir alertas/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    expect(handleEmailChange).toHaveBeenCalledWith('user@example.com')

    const saveButton = screen.getByRole('button', { name: 'Guardar alerta' })
    fireEvent.click(saveButton)

    expect(handleSaveAlert).toHaveBeenCalledWith('user@example.com')
  })

  it('displays authenticated user state when isAuthenticated is true', () => {
    render(
      <SearchAlertModal
        isOpen={true}
        onClose={vi.fn()}
        filters={mockFilters}
        isAuthenticated={true}
        userEmail="testuser@cubitat.com"
      />
    )

    expect(screen.getByText(/Alerta asociada a tu usuario autenticado/i)).toBeInTheDocument()
    expect(screen.getByText(/\(testuser@cubitat.com\)/i)).toBeInTheDocument()
  })
})
