import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeElementResize } from './observeElementResize'

describe('observeElementResize', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('notifies when the observed element changes size and disconnects on cleanup', () => {
    let resizeCallback: ResizeObserverCallback | undefined
    const disconnect = vi.fn()
    const observe = vi.fn()
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }

      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    const element = document.createElement('div')
    const onResize = vi.fn()

    const cleanup = observeElementResize(element, onResize)
    resizeCallback?.([], {} as ResizeObserver)

    expect(observe).toHaveBeenCalledWith(element)
    expect(onResize).toHaveBeenCalledOnce()
    cleanup()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
