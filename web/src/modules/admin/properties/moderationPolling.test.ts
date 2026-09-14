import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitForModerationResult } from './moderationPolling'

const mocks = vi.hoisted(() => ({
  fetchModerationPropertyResult: vi.fn(),
}))

vi.mock('./propertiesRepository', () => ({
  fetchModerationPropertyResult: mocks.fetchModerationPropertyResult,
}))

describe('waitForModerationResult', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('polls only until the moderation result changes', async () => {
    vi.useFakeTimers()
    mocks.fetchModerationPropertyResult
      .mockResolvedValueOnce({
        status: 'pending_review',
        moderation_message: 'Reevaluando con IA...',
      })
      .mockResolvedValueOnce({
        status: 'ai_approved',
        moderation_message: 'La publicación cumple las reglas.',
      })

    const resultPromise = waitForModerationResult('property-1')
    await vi.advanceTimersByTimeAsync(1000)

    await expect(resultPromise).resolves.toEqual({
      status: 'ai_approved',
      moderation_message: 'La publicación cumple las reglas.',
    })
    expect(mocks.fetchModerationPropertyResult).toHaveBeenCalledTimes(2)
    expect(mocks.fetchModerationPropertyResult).toHaveBeenNthCalledWith(1, 'property-1')
  })
})
