import { describe, expect, it, vi } from 'vitest'
import { uploadPublicationImages } from './uploadPublicationImages'

describe('publication image batch', () => {
  it('rejects partial upload, cleans only new objects and allows complete retry', async () => {
    const upload = vi.fn().mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('offline') })
    const remove = vi.fn().mockResolvedValue({ error: null })
    const storage = { upload, remove, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://images/${path}` } }) }
    const images = [{ dataUrl: 'https://original/image.webp' }, { dataUrl: 'data:image/webp;base64,YQ==' }, { dataUrl: 'data:image/webp;base64,Yg==' }]
    await expect(uploadPublicationImages('owner', images, storage)).rejects.toThrow('fotos')
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^owner\//)])
    expect(images).toHaveLength(3)
    upload.mockResolvedValue({ error: null })
    const result = await uploadPublicationImages('owner', images, storage)
    expect(result).toHaveLength(3)
    expect(result[0]).toBe(images[0].dataUrl)
  })
  it('rejects total failure without deleting original images', async () => {
    const storage = { upload: vi.fn().mockRejectedValue(new Error('offline')), remove: vi.fn(), getPublicUrl: vi.fn() }
    await expect(uploadPublicationImages('owner', [{ dataUrl: 'data:image/webp;base64,YQ==' }], storage)).rejects.toThrow('fotos')
    expect(storage.remove).not.toHaveBeenCalled()
  })
})
