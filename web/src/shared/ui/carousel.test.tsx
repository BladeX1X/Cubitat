import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Carousel } from './carousel'

const { api } = vi.hoisted(() => ({
  api: {
    on: vi.fn(),
    off: vi.fn(),
    canScrollPrev: vi.fn(() => false),
    canScrollNext: vi.fn(() => false),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
  },
}))

vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), api],
}))

describe('Carousel', () => {
  it('removes every registered selection listener on unmount', () => {
    const { unmount } = render(<Carousel>Contenido</Carousel>)

    expect(api.on).toHaveBeenCalledWith('select', expect.any(Function))
    expect(api.on).toHaveBeenCalledWith('reInit', expect.any(Function))

    unmount()

    expect(api.off).toHaveBeenCalledWith('select', expect.any(Function))
    expect(api.off).toHaveBeenCalledWith('reInit', expect.any(Function))
  })
})
