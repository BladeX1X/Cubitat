import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { fetchMarketplaceContact, getMarketplaceContactUrl } from '../../../shared/lib/marketplaceContact'
import { PropertyCard } from './PropertyCard'

vi.mock('../../../shared/lib/marketplaceContact', () => ({
  fetchMarketplaceContact: vi.fn(),
  getMarketplaceContactUrl: vi.fn((channel: 'phone' | 'whatsapp') => channel === 'phone'
    ? 'tel:+53512345678'
    : 'https://wa.me/53512345678?text=hello'),
}))

vi.mock('../../../shared/config/features', () => ({ PHASE_TWO_ENABLED: true }))
vi.mock('./SavePropertyButton', () => ({ SavePropertyButton: () => null }))
vi.mock('../../../shared/ui/carousel', () => ({
  Carousel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselNext: () => null,
  CarouselPrevious: () => null,
}))

const property = {
  id: 'property-1',
  title: 'Casa de prueba',
  location: 'Playa, La Habana',
  description: 'Propiedad QA',
  zoneId: 'playa',
  operation: 'venta' as const,
  propertyType: 'casa' as const,
  bedrooms: 2,
  bathrooms: 1,
  parking: 0,
  areaM2: 80,
  amenities: [],
  status: 'published' as const,
  coverTone: 'emerald',
  coverImage: '',
  mapPoint: { x: 0, y: 0 },
  coordinates: { latitude: 0, longitude: 0 },
}

describe('PropertyCard verified seller badge', () => {
  it('shows the public seller badge only when the seller is verified', async () => {
    render(<PropertyCard property={{ ...property, isVerifiedSeller: true }} isSelected={false} onSelect={vi.fn()} />)
    expect(await screen.findByText('Vendedor verificado')).toBeInTheDocument()
  })

  it('does not show a verification badge for an unverified seller', () => {
    render(<PropertyCard property={property} isSelected={false} onSelect={vi.fn()} />)
    expect(screen.queryByText('Vendedor verificado')).not.toBeInTheDocument()
    expect(screen.queryByText('Agente verificado')).not.toBeInTheDocument()
  })
})

describe('PropertyCard contact actions', () => {
  it('opens the advertiser phone through the protected property contact endpoint', async () => {
    const onSelect = vi.fn()
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    vi.mocked(fetchMarketplaceContact).mockResolvedValue({ phone: '+53512345678', whatsapp: '+53512345678' })

    render(
      <PropertyCard property={property} isSelected={false} onSelect={onSelect} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /contactar/i }))

    expect(await screen.findByRole('button', { name: /contactar/i })).toBeEnabled()
    expect(fetchMarketplaceContact).toHaveBeenCalledWith('property', property.id)
    expect(getMarketplaceContactUrl).toHaveBeenCalledWith('phone', '+53512345678', 'Casa de prueba', 'Playa, La Habana')
    expect(assign).toHaveBeenCalledWith('tel:+53512345678')
    expect(onSelect).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('opens WhatsApp with public location and property context', async () => {
    const destination = { location: { replace: vi.fn() }, opener: {} as Window | null, close: vi.fn() } as unknown as Window
    const open = vi.fn(() => destination)
    vi.stubGlobal('open', open)
    vi.mocked(fetchMarketplaceContact).mockResolvedValue({ phone: '+53512345678', whatsapp: '+53512345678' })

    render(
      <PropertyCard property={property} isSelected={false} onSelect={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /consultar/i }))

    expect(await screen.findByRole('button', { name: /consultar/i })).toBeEnabled()
    expect(fetchMarketplaceContact).toHaveBeenCalledWith('property', property.id)
    expect(getMarketplaceContactUrl).toHaveBeenCalledWith('whatsapp', '+53512345678', 'Casa de prueba', 'Playa, La Habana')
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(destination.location.replace).toHaveBeenCalledWith('https://wa.me/53512345678?text=hello')
    vi.unstubAllGlobals()
  })
})
