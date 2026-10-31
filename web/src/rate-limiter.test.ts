import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RateLimiter } from './rate-limiter'

type RateLimitEntry = {
  count: number
  resetTime: number
  reservations?: string[]
  releasedReservations?: string[]
}

function createStorage() {
  const records = new Map<string, RateLimitEntry>()

  return {
    records,
    get: vi.fn(async (key: string) => records.get(key)),
    put: vi.fn(async (key: string, value: RateLimitEntry) => {
      records.set(key, value)
    }),
    delete: vi.fn(async (key: string) => {
      records.delete(key)
    }),
    list: vi.fn(async () => new Map(records)),
    setAlarm: vi.fn(async () => undefined),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-11T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('RateLimiter durable object', () => {
  it('rejects checks without a key', async () => {
    const storage = createStorage()
    const limiter = new RateLimiter({ storage })

    const response = await limiter.fetch(new Request('https://rate-limiter/check'))

    expect(response.status).toBe(400)
    await expect(response.text()).resolves.toBe('Missing key')
    expect(storage.put).not.toHaveBeenCalled()
  })

  it('allows requests up to the configured limit and then blocks', async () => {
    const storage = createStorage()
    const limiter = new RateLimiter({ storage })
    const request = new Request('https://rate-limiter/check?key=login%3Aip&limit=2&windowMs=60000')

    const first = await limiter.fetch(request.clone())
    const second = await limiter.fetch(request.clone())
    const third = await limiter.fetch(request.clone())

    await expect(first.json()).resolves.toMatchObject({ allowed: true, remaining: 1 })
    await expect(second.json()).resolves.toMatchObject({ allowed: true, remaining: 0 })
    await expect(third.json()).resolves.toMatchObject({ allowed: false, remaining: 0 })
    expect(storage.setAlarm).toHaveBeenCalledTimes(1)
  })

  it('starts a fresh window after the previous one expires', async () => {
    const storage = createStorage()
    const limiter = new RateLimiter({ storage })
    const request = new Request('https://rate-limiter/check?key=recovery&limit=1&windowMs=1000')

    await limiter.fetch(request.clone())
    vi.advanceTimersByTime(1001)
    const response = await limiter.fetch(request.clone())

    await expect(response.json()).resolves.toMatchObject({ allowed: true, remaining: 0 })
    expect(storage.records.get('recovery')?.count).toBe(1)
  })

  it('deletes expired entries when its alarm runs', async () => {
    const storage = createStorage()
    storage.records.set('expired', { count: 4, resetTime: Date.now() - 1 })
    storage.records.set('active', { count: 1, resetTime: Date.now() + 60_000 })
    const limiter = new RateLimiter({ storage })

    await limiter.alarm()

    expect(storage.records.has('expired')).toBe(false)
    expect(storage.records.has('active')).toBe(true)
    expect(storage.delete).toHaveBeenCalledWith('expired')
  })

  it('starts a fresh window when stored data is malformed', async () => {
    const storage = createStorage()
    storage.records.set('malformed', { count: Number.NaN, resetTime: Date.now() + 60_000 })
    const limiter = new RateLimiter({ storage })

    const response = await limiter.fetch(new Request('https://rate-limiter/check?key=malformed&limit=2'))

    await expect(response.json()).resolves.toMatchObject({ allowed: true, remaining: 1 })
    expect(storage.records.get('malformed')).toMatchObject({ count: 1 })
  })

  it('falls back to safe values for invalid rate parameters', async () => {
    const storage = createStorage()
    const limiter = new RateLimiter({ storage })

    const response = await limiter.fetch(new Request(
      'https://rate-limiter/check?key=invalid-params&limit=not-a-number&windowMs=-10',
    ))

    await expect(response.json()).resolves.toMatchObject({
      allowed: true,
      remaining: 99,
    })
    expect(storage.records.get('invalid-params')?.resetTime).toBe(Date.now() + 60000)
  })

  it('releases only the matching email quota reservation after CAPTCHA rejection', async () => {
    const storage = createStorage()
    const limiter = new RateLimiter({ storage })
    const reserve = (reservationId: string) => limiter.fetch(new Request(
      `https://rate-limiter/check?key=email%3Ahash&limit=1&windowMs=3600000&reservationId=${reservationId}`,
    ))

    const first = await reserve('attempt-1')
    await expect(first.json()).resolves.toMatchObject({ allowed: true })
    const blocked = await reserve('blocked-attempt')
    await expect(blocked.json()).resolves.toMatchObject({ allowed: false })
    expect(storage.records.get('email:hash')?.reservations).toEqual(['attempt-1'])
    const released = await limiter.fetch(new Request(
      'https://rate-limiter/check?key=email%3Ahash&operation=release&reservationId=attempt-1',
    ))
    await expect(released.json()).resolves.toEqual({ released: true })
    const next = await reserve('attempt-2')
    await expect(next.json()).resolves.toMatchObject({ allowed: true })

    const duplicateRelease = await limiter.fetch(new Request(
      'https://rate-limiter/check?key=email%3Ahash&operation=release&reservationId=attempt-1',
    ))
    await expect(duplicateRelease.json()).resolves.toEqual({ released: false })
    expect(storage.records.get('email:hash')?.count).toBe(1)
  })
})
