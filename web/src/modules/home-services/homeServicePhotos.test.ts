import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUser, upload, remove, storageFrom } = vi.hoisted(() => ({
  getUser: vi.fn(), upload: vi.fn(), remove: vi.fn(), storageFrom: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { auth: { getUser }, storage: { from: storageFrom } },
}))
vi.mock('../../shared/lib/logger', () => ({ logSafeEvent: vi.fn(), sanitizeErrorReason: vi.fn(() => 'test') }))

import { getHomeServicePhotoBucket, isHomeServicePhotoPath, removeUnattachedHomeServicePhotos, uploadHomeServicePhotos } from './homeServicePhotos'

describe('home service photo storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } }, error: null })
    upload.mockResolvedValue({ error: null })
    remove.mockResolvedValue({ error: null })
    storageFrom.mockImplementation(() => ({ upload, remove }))
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222')
  })

  it('uploads several prepared photos sequentially and preserves selection order', async () => {
    const photos = [new File(['one'], 'one.webp', { type: 'image/webp' }), new File(['two'], 'two.webp', { type: 'image/webp' })]

    const paths = await uploadHomeServicePhotos(photos)

    expect(paths).toEqual([
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.webp',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/22222222-2222-4222-8222-222222222222.webp',
    ])
    expect(upload).toHaveBeenNthCalledWith(1, paths[0], photos[0], expect.objectContaining({ contentType: 'image/webp' }))
    expect(upload).toHaveBeenNthCalledWith(2, paths[1], photos[1], expect.objectContaining({ contentType: 'image/webp' }))
  })

  it('recognizes legacy private gallery paths without accepting arbitrary paths', () => {
    const legacyPath = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/11111111-1111-4111-8111-111111111111.jpg'
    const currentPath = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.webp'

    expect(isHomeServicePhotoPath(legacyPath)).toBe(true)
    expect(getHomeServicePhotoBucket(legacyPath)).toBe('home-service-profiles')
    expect(isHomeServicePhotoPath(currentPath)).toBe(true)
    expect(getHomeServicePhotoBucket(currentPath)).toBe('home-service-photos')
    expect(isHomeServicePhotoPath('../private/photo.webp')).toBe(false)
    expect(isHomeServicePhotoPath('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/unowned/photo.webp')).toBe(false)
  })

  it('removes earlier uploads when a later photo in the batch fails', async () => {
    upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('storage failure') })
    const photos = [new File(['one'], 'one.webp', { type: 'image/webp' }), new File(['two'], 'two.webp', { type: 'image/webp' })]

    await expect(uploadHomeServicePhotos(photos)).rejects.toThrow('HOME_SERVICE_PHOTO_UPLOAD_FAILED')

    expect(remove).toHaveBeenCalledWith(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.webp'])
  })

  it('removes legacy references from their original bucket after they are detached', async () => {
    const path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/11111111-1111-4111-8111-111111111111.jpg'
    const legacyRemove = vi.fn().mockResolvedValue({ error: null })
    storageFrom.mockImplementation((bucket: string) => ({
      upload,
      remove: bucket === 'home-service-profiles' ? legacyRemove : remove,
    }))

    const { removeUnattachedHomeServicePhotos } = await import('./homeServicePhotos')
    await removeUnattachedHomeServicePhotos([path])

    expect(storageFrom).toHaveBeenCalledWith('home-service-profiles')
    expect(legacyRemove).toHaveBeenCalledWith([path])
    expect(remove).not.toHaveBeenCalled()
  })

  it('treats photo removal as best-effort when the database has already saved the new gallery', async () => {
    remove.mockRejectedValueOnce(new Error('offline'))
    const path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111.webp'

    await expect(removeUnattachedHomeServicePhotos([path])).resolves.toBeUndefined()
  })
})
