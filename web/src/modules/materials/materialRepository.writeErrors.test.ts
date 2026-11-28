import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, remove } = vi.hoisted(() => ({ rpc: vi.fn(), remove: vi.fn() }))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { rpc, storage: { from: () => ({ remove }) } },
}))
vi.mock('../../shared/lib/logger', () => ({
  logSafeEvent: vi.fn(), sanitizeErrorReason: vi.fn(() => 'DATABASE_42501'),
}))

import { removeUnattachedMaterialPhotos, updateMaterialListing } from './materialRepository'

const listingInput = {
  title: 'Material de prueba', category: 'cemento' as const, description: 'Descripción de material para la prueba.',
  price: null, currency: 'USD' as const, province: 'La Habana', municipality: 'Playa', coordinates: null, availability: 'available' as const,
  phone: null, whatsapp: null, photoPaths: [],
}
const photoPath = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webp'

describe('material write failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpc.mockResolvedValue({ error: { code: '42501' } })
    remove.mockResolvedValue({ error: null })
  })

  it('marks a definitive update permission denial for safe photo cleanup', async () => {
    await expect(updateMaterialListing('listing-1', listingInput)).rejects.toThrow('MATERIAL_LISTING_PERMISSION_DENIED')
    expect(rpc).toHaveBeenCalledWith('update_material_listing', expect.objectContaining({
      p_province: 'La Habana',
      p_municipality: 'Playa',
      p_coordinates: null,
    }))
  })

  it('does not let a network error while removing an old photo turn a saved listing into a failed save', async () => {
    remove.mockRejectedValueOnce(new Error('offline'))

    await expect(removeUnattachedMaterialPhotos([photoPath])).resolves.toBeUndefined()
  })
})
