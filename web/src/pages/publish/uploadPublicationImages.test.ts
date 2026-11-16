import { describe, expect, it, vi } from 'vitest'
import { uploadPublicationImages } from './uploadPublicationImages'

describe('publication image batch', () => {
  it('preserves an existing owner image represented by the app storage proxy', async () => {
    const owner = '11111111-1111-4111-8111-111111111111'
    const existing = `${window.location.origin}/api/supabase/storage/v1/object/public/property_images/${owner}/22222222-2222-4222-8222-222222222222.webp`
    const storage = { remove: vi.fn(), getPublicUrl: vi.fn() }

    await expect(uploadPublicationImages(owner, [{ dataUrl: existing }], storage, vi.fn())).resolves.toEqual([
      `${window.location.origin}/api/supabase/storage/v1/object/property_images/${owner}/22222222-2222-4222-8222-222222222222.webp`,
    ])
  })

  it('does not treat a proxy path belonging to another owner as an existing image', async () => {
    const owner = '11111111-1111-4111-8111-111111111111'
    const other = '33333333-3333-4333-8333-333333333333'
    const foreign = `${window.location.origin}/api/supabase/storage/v1/object/public/property_images/${other}/22222222-2222-4222-8222-222222222222.webp`
    const storage = { remove: vi.fn(), getPublicUrl: vi.fn() }

    await expect(uploadPublicationImages(owner, [{ dataUrl: foreign }], storage, vi.fn())).rejects.toThrow('fotos')
  })

  it('rejects partial upload, cleans only new objects and allows complete retry', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null })
    const storage = { remove, getPublicUrl: (path: string) => ({ data: { publicUrl: `${window.location.origin}/api/supabase/storage/v1/object/public/property_images/${path}` } }) }
    const images = [{ dataUrl: 'https://original/image.webp' }, { dataUrl: 'data:image/webp;base64,YQ==' }, { dataUrl: 'data:image/webp;base64,Yg==' }]
    const uploadImage = vi.fn().mockResolvedValueOnce('owner/one.webp').mockRejectedValueOnce(new Error('offline'))
    await expect(uploadPublicationImages('owner', images, storage, uploadImage)).rejects.toThrow('fotos')
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^owner\//)])
    expect(images).toHaveLength(3)
    uploadImage.mockResolvedValue('owner/retry.webp')
    const result = await uploadPublicationImages('owner', images, storage, uploadImage)
    expect(result).toHaveLength(3)
    expect(result[0]).toBe(images[0].dataUrl)
    expect(result[1]).toMatch(new RegExp(`^${window.location.origin}/api/supabase/storage/v1/object/property_images/owner/retry\\.webp$`))
    expect(result[1]).not.toContain('/object/public/')
  })
  it('rejects total failure without deleting original images', async () => {
    const storage = { remove: vi.fn(), getPublicUrl: vi.fn() }
    await expect(uploadPublicationImages('owner', [{ dataUrl: 'data:image/webp;base64,YQ==' }], storage, vi.fn().mockRejectedValue(new Error('offline')))).rejects.toThrow('fotos')
    expect(storage.remove).not.toHaveBeenCalled()
  })
})
