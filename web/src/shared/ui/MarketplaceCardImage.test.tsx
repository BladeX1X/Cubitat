import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signCatalogCardImage } = vi.hoisted(() => ({ signCatalogCardImage: vi.fn() }))
vi.mock('../lib/catalogStorageImage', () => ({ signCatalogCardImage }))

import { MarketplaceCardImage } from './MarketplaceCardImage'

describe('MarketplaceCardImage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prioritizes visible images and decodes them asynchronously', () => {
    render(<MarketplaceCardImage src="https://images.unsplash.com/photo-123" alt="Material" eager className="cover" fallback={<span>Foto no disponible</span>} />)
    const image = screen.getByRole('img', { name: 'Material' })

    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('decoding', 'async')
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(image.getAttribute('src')).toContain('w=420')
  })

  it('shows an accessible visual fallback when an image fails', () => {
    render(<MarketplaceCardImage src="https://example.com/missing.jpg" alt="" className="cover" fallback={<span role="status">Foto no disponible</span>} />)
    fireEvent.error(document.querySelector('img') as HTMLImageElement)

    expect(screen.getByRole('status')).toHaveTextContent('Foto no disponible')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('announces a temporary failure when a private thumbnail cannot be signed', async () => {
    signCatalogCardImage.mockResolvedValue(null)
    render(<MarketplaceCardImage src="owner/listing/photo.webp" storageBucket="material-listings" alt="" eager className="cover" fallback={<span>Sin foto</span>} failureFallback={<span role="status">Foto no disponible temporalmente</span>} />)

    expect(await screen.findByRole('status')).toHaveTextContent('Foto no disponible temporalmente')
  })

  it('signs private card images only when eager or near the viewport', async () => {
    let notifyIntersection: IntersectionObserverCallback | undefined
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) { notifyIntersection = callback }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return [] }
      root = null
      rootMargin = '400px 0px'
      thresholds = [0]
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    signCatalogCardImage.mockResolvedValue('https://signed.example/cover.webp')

    const { unmount } = render(<MarketplaceCardImage src="owner/listing/photo.webp" storageBucket="material-listings" alt="" className="cover" fallback={<span>Sin foto</span>} />)

    expect(signCatalogCardImage).not.toHaveBeenCalled()
    const target = document.querySelector('span[aria-hidden="true"]') as HTMLSpanElement
    const rect = target.getBoundingClientRect()
    const entry: IntersectionObserverEntry = {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: rect,
      intersectionRect: rect,
      rootBounds: null,
      time: 0,
    }
    act(() => notifyIntersection?.([entry], {} as IntersectionObserver))

    await waitFor(() => expect(signCatalogCardImage).toHaveBeenCalledWith('material-listings', 'owner/listing/photo.webp'))
    await waitFor(() => expect(document.querySelector('img')).toHaveAttribute('src', 'https://signed.example/cover.webp'))
    unmount()

    render(<MarketplaceCardImage src="owner/listing/cover.webp" storageBucket="material-listings" alt="" eager className="cover" fallback={<span>Sin foto</span>} />)
    await waitFor(() => expect(signCatalogCardImage).toHaveBeenCalledWith('material-listings', 'owner/listing/cover.webp'))
    vi.unstubAllGlobals()
  })
})
