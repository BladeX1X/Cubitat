import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ setWorkerUrl: vi.fn() }))

vi.mock('maplibre-gl', () => ({ setWorkerUrl: mocks.setWorkerUrl }))

describe('MapLibre worker setup', () => {
  it('configures the Vite-emitted worker asset', async () => {
    vi.resetModules()
    await import('./configureMapLibreWorker')

    expect(mocks.setWorkerUrl).toHaveBeenCalledTimes(1)
    expect(mocks.setWorkerUrl).toHaveBeenCalledWith(expect.stringContaining('maplibre-gl-worker'))
  })
})
