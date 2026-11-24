import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from, insert, getUser, rpc } = vi.hoisted(() => ({
  from: vi.fn(), insert: vi.fn(), getUser: vi.fn(), rpc: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { auth: { getUser }, from, rpc, storage: { from: vi.fn() } },
}))
vi.mock('../../shared/lib/logger', () => ({
  logSafeEvent: vi.fn(), sanitizeErrorReason: vi.fn(() => 'DATABASE_42501'),
}))

import { createHomeServiceProvider, updateHomeServiceProvider } from './homeServiceRepository'

const input = {
  displayName: 'Servicio de prueba', category: 'plomeria' as const, description: 'Servicio para validar permisos de guardado.',
  province: 'La Habana', municipalities: ['Playa'], coordinates: null, phone: null, whatsapp: null, galleryUrls: ['owner/photo.webp'],
}
const providerId = '48d405e8-2a12-4fb5-9c3d-246271e139af'

describe('home service write permission errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null })
    from.mockReturnValue({ insert })
    insert.mockResolvedValue({ error: { code: '42501' } })
    rpc.mockResolvedValue({ error: { code: '42501' } })
  })

  it('marks a definitive create permission denial for safe photo cleanup', async () => {
    await expect(createHomeServiceProvider(input, providerId)).rejects.toThrow('HOME_SERVICE_PROFILE_PERMISSION_DENIED')
  })

  it('updates the same owned draft when a retried insert hits its stable id', async () => {
    insert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key value violates unique constraint "home_service_providers_pkey"' } })
    rpc.mockResolvedValueOnce({ error: null })

    await expect(createHomeServiceProvider(input, providerId)).resolves.toBeUndefined()

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: providerId,
      slug: 'servicio-de-prueba-48d405e8',
      gallery_urls: input.galleryUrls,
      coordinates: null,
    }))
    expect(rpc).toHaveBeenCalledWith('update_home_service_provider', expect.objectContaining({
      p_id: providerId,
      p_gallery_urls: input.galleryUrls,
      p_coordinates: null,
    }))
  })

  it('does not treat a different unique constraint as a prior successful insert', async () => {
    insert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key value violates unique constraint "home_service_providers_slug_key"' } })

    await expect(createHomeServiceProvider(input, providerId)).rejects.toThrow('HOME_SERVICE_PROFILE_CREATE_FAILED')

    expect(rpc).not.toHaveBeenCalled()
  })

  it('marks a definitive update permission denial for safe photo cleanup', async () => {
    await expect(updateHomeServiceProvider('profile-1', input)).rejects.toThrow('HOME_SERVICE_PROFILE_PERMISSION_DENIED')
  })
})
