import { afterEach, describe, expect, it, vi } from 'vitest'

describe('OpenFreeMap style request recovery', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('releases a stalled shared request and lets a retry fetch the style again', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>(() => {}))
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 8, sources: {}, layers: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    const { getOpenFreeMapStyle } = await import('./openFreeMapStyle')

    const firstRequest = getOpenFreeMapStyle()
    const firstFailure = expect(firstRequest).rejects.toThrow('map_style_timeout')
    await vi.advanceTimersByTimeAsync(12_000)
    await firstFailure

    await expect(getOpenFreeMapStyle()).resolves.toMatchObject({ version: 8, layers: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
