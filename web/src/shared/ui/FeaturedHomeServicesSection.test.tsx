import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FeaturedHomeServicesSection } from './FeaturedHomeServicesSection'

const { fetchProviders, fetchBenefits } = vi.hoisted(() => ({ fetchProviders: vi.fn(), fetchBenefits: vi.fn() }))
vi.mock('../../modules/home-services/homeServiceRepository', () => ({ fetchHomeServiceProviders: fetchProviders }))
vi.mock('../../modules/business-benefits/businessBenefitsRepository', () => ({ fetchActiveBusinessBenefits: fetchBenefits }))

const profile = (id: string, slug: string) => ({
  id, slug, displayName: `Servicio ${slug}`, category: 'plomeria', description: 'Servicio de prueba para reparaciones del hogar.',
  province: 'La Habana', municipalities: ['Playa'], galleryUrls: [], updatedAt: '2026-11-20T00:00:00Z',
})

describe('FeaturedHomeServicesSection', () => {
  beforeEach(() => {
    fetchProviders.mockReset().mockResolvedValue({ items: [profile('current', 'actual'), profile('featured', 'destacado'), profile('regular', 'normal')] })
    fetchBenefits.mockReset().mockImplementation(async (_type: string, id: string) => id === 'featured' ? [{ benefitCode: 'profile_featured' }] : [])
  })

  it('shows only profiles with a current featured benefit and excludes the current profile', async () => {
    render(<FeaturedHomeServicesSection excludeId="current" />)
    expect(await screen.findByRole('heading', { name: 'Servicios destacados' })).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('link', { name: /Servicio destacado/ })).toBeTruthy())
    expect(screen.queryByRole('link', { name: /Servicio actual/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Servicio normal/ })).toBeNull()
    expect(fetchProviders).toHaveBeenCalledWith({ pageSize: 12, coverOnly: true })
  })
})
