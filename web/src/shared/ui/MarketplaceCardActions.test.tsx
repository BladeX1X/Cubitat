import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarketplaceCardActions } from './MarketplaceCardActions'

describe('MarketplaceCardActions', () => {
  it('renders the shared direct phone and WhatsApp actions for a listing', () => {
    render(<MarketplaceCardActions listingType="material" listingId="material-1" listingTitle="Cemento" listingLocation="La Habana" onMissing={() => undefined} />)

    expect(screen.getByRole('button', { name: 'Contactar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
