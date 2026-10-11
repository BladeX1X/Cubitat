import { describe, expect, it, vi } from 'vitest'

import { retryImageHashOperation } from './image-phash-retry'

describe('retryImageHashOperation', () => {
  it('retries transient failures and returns the successful result', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce('saved')
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(retryImageHashOperation(operation, sleep)).resolves.toBe('saved')
    expect(operation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(250)
  })

  it('stops after three failed attempts and applies bounded backoff', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('unavailable'))
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(retryImageHashOperation(operation, sleep)).rejects.toThrow('unavailable')
    expect(operation).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map(([milliseconds]) => milliseconds)).toEqual([250, 500])
  })
})
