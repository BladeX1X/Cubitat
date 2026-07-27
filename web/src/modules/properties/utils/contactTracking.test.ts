import { beforeEach, describe, expect, it, vi } from 'vitest'
import { trackContactClick } from './contactTracking'
import { supabase } from '../../../shared/lib/supabaseClient'

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { rpc: vi.fn() },
}))

describe('contactTracking', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns the deduplicated database counters', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [{ phone_clicks_count: 1, whatsapp_clicks_count: 0 }],
      error: null,
    } as never)

    const metrics = await trackContactClick('test-prop-1', 'phone')
    expect(metrics).toEqual({ phoneClicks: 1, whatsappClicks: 0 })
    expect(supabase.rpc).toHaveBeenCalledWith('increment_contact_clicks', expect.objectContaining({
      p_property_id: 'test-prop-1',
      p_channel: 'phone',
      p_viewer_key: expect.any(String),
    }))
  })

  it('returns null when Supabase rejects the metric', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC unavailable' },
    } as never)

    await expect(trackContactClick('test-prop-1', 'whatsapp')).resolves.toBeNull()
  })
})
