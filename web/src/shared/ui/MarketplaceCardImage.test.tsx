import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarketplaceCardImage } from './MarketplaceCardImage'

describe('MarketplaceCardImage', () => {
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
})
