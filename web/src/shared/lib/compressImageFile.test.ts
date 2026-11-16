import { afterEach, describe, expect, it, vi } from 'vitest'
import { compressImageFileToWebP } from './compressImageFile'

describe('compressImageFileToWebP', () => {
  afterEach(() => vi.restoreAllMocks())

  it('resizes an image to the requested dimensions and returns WebP', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1600, height: 1200, close }))
    const drawImage = vi.fn()
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: (callback: BlobCallback) => callback(new Blob(['webp'], { type: 'image/webp' })),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement)

    const file = await compressImageFileToWebP(new File(['source'], 'cemento.jpg', { type: 'image/jpeg' }), {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.65,
    })

    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
    expect(drawImage).toHaveBeenCalledWith(expect.objectContaining({ width: 1600, height: 1200 }), 0, 0, 800, 600)
    expect(file).toMatchObject({ name: 'cemento.webp', type: 'image/webp' })
    expect(close).toHaveBeenCalledOnce()
  })
})
