import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { PropertyCard } from './PropertyCard'

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
