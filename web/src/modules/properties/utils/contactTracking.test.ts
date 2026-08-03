import { beforeEach, describe, expect, it, vi } from 'vitest'
import { trackContactClick } from './contactTracking'

describe('contactTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the trusted Worker endpoint and returns the deduplicated counters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      phone_clicks_count: 1,
      whatsapp_clicks_count: 0,
    }), { status: 200 }))

    const metrics = await trackContactClick('test-prop-1', 'phone')
    expect(metrics).toEqual({ phoneClicks: 1, whatsappClicks: 0 })
    expect(fetchSpy).toHaveBeenCalledWith('/api/phase2/contact-click', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ propertyId: 'test-prop-1', channel: 'phone' }),
    }))
  })

  it('returns null when the Worker rejects the metric', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 503 }))

    await expect(trackContactClick('test-prop-1', 'whatsapp')).resolves.toBeNull()
  })
})
