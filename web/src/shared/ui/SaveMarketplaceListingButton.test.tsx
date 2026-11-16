import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SaveMarketplaceListingButton } from './SaveMarketplaceListingButton'

const toggleSave = vi.fn()
let saved = false

vi.mock('../../modules/marketplace/hooks/useSavedMarketplaceListings', () => ({
  useSavedMarketplaceListings: () => ({
    isSaved: () => saved,
    isPending: () => false,
    toggleSave,
  }),
}))

describe('SaveMarketplaceListingButton', () => {
  it('guarda y quita servicios o materiales con estado accesible', async () => {
    saved = false
    toggleSave.mockReset().mockResolvedValue(true)
    const { rerender } = render(<SaveMarketplaceListingButton listingType="service" listingId="svc-1" listingTitle="Electricista" />)

    const button = screen.getByRole('button', { name: 'Guardar Electricista en favoritos' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(button)
    expect(toggleSave).toHaveBeenCalledWith('service', 'svc-1')
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())

    saved = true
    rerender(<SaveMarketplaceListingButton listingType="material" listingId="mat-1" listingTitle="Cemento" />)
    expect(screen.getByRole('button', { name: 'Quitar Cemento de favoritos' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('explica cuando la persistencia del favorito falla', async () => {
    saved = false
    toggleSave.mockReset().mockResolvedValue(false)
    render(<SaveMarketplaceListingButton listingType="service" listingId="svc-1" listingTitle="Electricista" />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Electricista en favoritos' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo actualizar el favorito/i))
  })
})
