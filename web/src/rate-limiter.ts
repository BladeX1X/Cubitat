type RateLimitEntry = {
  count: number
  resetTime: number
  reservations?: string[]
  releasedReservations?: string[]
}

type RateLimiterStorage = {
  get: (key: string) => Promise<unknown>
  put: (key: string, value: RateLimitEntry) => Promise<void>
  delete: (key: string) => Promise<void>
  list: () => Promise<Map<string, unknown>>
  setAlarm: (scheduledTime: number) => Promise<void>
}

type RateLimiterContext = {
  storage: RateLimiterStorage
}

function isRateLimitEntry(value: unknown): value is RateLimitEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return typeof entry.count === 'number' && Number.isFinite(entry.count)
    && typeof entry.resetTime === 'number' && Number.isFinite(entry.resetTime)
}

function parseNonNegativeInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export class RateLimiter {
  private storage: RateLimiterStorage
  private alarmScheduled: boolean

  constructor(ctx: RateLimiterContext) {
    this.storage = ctx.storage
    this.alarmScheduled = false
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response('Missing key', { status: 400 });
    }
    if (url.searchParams.get('operation') === 'release') {
      const reservationId = url.searchParams.get('reservationId')
      if (!reservationId) return new Response('Missing reservation ID', { status: 400 })
      const record = await this.storage.get(key)
      if (!isRateLimitEntry(record) || Date.now() > record.resetTime) {
        return Response.json({ released: false })
      }
      const reservations = record.reservations ?? []
      const releasedReservations = record.releasedReservations ?? []
      if (!reservations.includes(reservationId) || releasedReservations.includes(reservationId)) {
        return Response.json({ released: false })
      }
      await this.storage.put(key, {
        ...record,
        count: Math.max(0, record.count - 1),
        releasedReservations: [...releasedReservations, reservationId],
      })
      return Response.json({ released: true })
    }
    const limit = parseNonNegativeInteger(url.searchParams.get('limit'), 100)
    const windowMs = parsePositiveInteger(url.searchParams.get('windowMs'), 60000)
    const reservationId = url.searchParams.get('reservationId')

    const now = Date.now();
    const record = await this.storage.get(key)
    const storedEntry = isRateLimitEntry(record) ? record : undefined
    let entry: RateLimitEntry

    if (!storedEntry || now > storedEntry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
        ...(reservationId ? { reservations: [reservationId] } : {}),
      }
    } else {
      entry = {
        ...storedEntry,
        count: storedEntry.count + 1,
        resetTime: storedEntry.resetTime,
        ...(reservationId ? { reservations: [...(storedEntry.reservations ?? []), reservationId] } : {}),
      }
    }

    const allowed = entry.count <= limit
    if (!allowed) {
      entry.count = Math.max(0, entry.count - 1)
      if (reservationId) {
        entry.reservations = (entry.reservations ?? []).filter((storedId) => storedId !== reservationId)
      }
    }
    await this.storage.put(key, entry)

    if (!this.alarmScheduled) {
      await this.storage.setAlarm(entry.resetTime)
      this.alarmScheduled = true
    }
    return new Response(JSON.stringify({
      allowed,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetTime,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  async alarm(): Promise<void> {
    this.alarmScheduled = false
    const now = Date.now()
    const entries = await this.storage.list()
    const expiredKeys = [...entries].flatMap(([key, entry]) =>
      isRateLimitEntry(entry) && now > entry.resetTime ? [key] : [],
    )

    await Promise.all(expiredKeys.map((key) => this.storage.delete(key)))
  }
}
