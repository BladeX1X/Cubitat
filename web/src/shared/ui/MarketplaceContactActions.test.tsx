import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMarketplaceContact, getMarketplaceContactUrl } from '../lib/marketplaceContact'
import { MarketplaceContactActions } from './MarketplaceContactActions'

vi.mock('../lib/marketplaceContact', () => ({
  fetchMarketplaceContact: vi.fn(),
  getMarketplaceContactUrl: vi.fn((channel: 'phone' | 'whatsapp') => channel === 'phone'
    ? 'tel:+5351234567'
    : 'https://wa.me/5355510101?text=hello'),
}))

describe('MarketplaceContactActions', () => {
  beforeEach(() => {
    vi.mocked(fetchMarketplaceContact).mockReset()
    vi.mocked(getMarketplaceContactUrl).mockClear()
  })

  it('opens a contextual WhatsApp destination only after the protected lookup succeeds', async () => {
    const destination = { opener: {} as Window | null } as unknown as Window
    const open = vi.fn(() => destination)
    vi.stubGlobal('open', open)
    vi.mocked(fetchMarketplaceContact).mockResolvedValue({ phone: '+5351234567', whatsapp: '+5355510101' })
    render(<MarketplaceContactActions listingType="service" listingId="listing-1" listingTitle="Electricista" listingLocation="Playa, La Habana" layout="card" />)

    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    expect(await screen.findByRole('button', { name: 'Consultar' })).toBeEnabled()
    expect(fetchMarketplaceContact).toHaveBeenCalledWith('service', 'listing-1')
    expect(getMarketplaceContactUrl).toHaveBeenCalledWith('whatsapp', '+5355510101', 'Electricista', 'Playa, La Habana')
    expect(open).toHaveBeenCalledWith('https://wa.me/5355510101?text=hello', '_blank')
    expect(destination.opener).toBeNull()
    vi.unstubAllGlobals()
  })

  it('opens the declared phone channel directly without opening a popup', async () => {
    const assign = vi.fn()
    const open = vi.fn()
    vi.stubGlobal('location', { assign })
    vi.stubGlobal('open', open)
    vi.mocked(fetchMarketplaceContact).mockResolvedValue({ phone: '+5351234567', whatsapp: '+5355510101' })
    render(<MarketplaceContactActions listingType="service" listingId="listing-5" listingTitle="Electricista" listingLocation="Playa, La Habana" layout="card" />)

    fireEvent.click(screen.getByRole('button', { name: 'Contactar' }))

    expect(await screen.findByRole('button', { name: 'Contactar' })).toBeEnabled()
    expect(fetchMarketplaceContact).toHaveBeenCalledWith('service', 'listing-5')
    expect(getMarketplaceContactUrl).toHaveBeenCalledWith('phone', '+5351234567', 'Electricista', 'Playa, La Habana')
    expect(assign).toHaveBeenCalledWith('tel:+5351234567')
    expect(open).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('explains a missing channel and offers the inquiry fallback', async () => {
    const onMissing = vi.fn()
    vi.mocked(fetchMarketplaceContact).mockRejectedValue({ reason: 'missing' })
    render(<MarketplaceContactActions listingType="material" listingId="listing-2" listingTitle="Cemento" listingLocation="La Habana" onMissing={onMissing} layout="card" />)

    fireEvent.click(screen.getByRole('button', { name: 'Contactar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/no ha añadido teléfono ni WhatsApp/i)
    fireEvent.click(screen.getByRole('button', { name: /Abrir anuncio y enviar una consulta/ }))
    expect(onMissing).toHaveBeenCalledOnce()
  })

  it('does not assume a phone number is also registered with WhatsApp', async () => {
    const open = vi.fn()
    const assign = vi.fn()
    vi.stubGlobal('open', open)
    vi.stubGlobal('location', { assign })
    vi.mocked(fetchMarketplaceContact).mockResolvedValue({ phone: '+5351234567', whatsapp: null })
    render(<MarketplaceContactActions listingType="material" listingId="listing-4" listingTitle="Cemento" listingLocation="La Habana" />)

    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    expect(await screen.findByText(/no ha asociado WhatsApp a este anuncio/i)).toHaveAttribute('role', 'status')
    expect(open).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
    expect(getMarketplaceContactUrl).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('offers a direct WhatsApp link if the browser blocks the new tab', async () => {
    vi.stubGlobal('open', vi.fn(() => null))
    vi.mocked(fetchMarketplaceContact).mockResolvedValue({ phone: '+5351234567', whatsapp: '+5355510101' })
    render(<MarketplaceContactActions listingType="material" listingId="listing-6" listingTitle="Cemento" listingLocation="La Habana" />)

    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    const link = await screen.findByRole('link', { name: 'Abrir WhatsApp' })
    expect(link).toHaveAttribute('href', 'https://wa.me/5355510101?text=hello')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    vi.unstubAllGlobals()
  })

  it('shows a recoverable message when contact lookup fails', async () => {
    vi.mocked(fetchMarketplaceContact).mockRejectedValue({ reason: 'unavailable' })
    render(<MarketplaceContactActions listingType="material" listingId="listing-3" listingTitle="Cemento" listingLocation="La Habana" />)

    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo abrir el contacto/i)
  })
})
