import { describe, it, expect, beforeEach } from 'vitest'
import { getContactClickMetrics, trackContactClick } from './contactTracking'

describe('contactTracking', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('devuelve metricas iniciales en cero', () => {
    const metrics = getContactClickMetrics('test-prop-1')
    expect(metrics).toEqual({ phoneClicks: 0, whatsappClicks: 0 })
  })

  it('incrementa el contador de llamadas telefonicas', async () => {
    const metrics = await trackContactClick('test-prop-1', 'phone')
    expect(metrics.phoneClicks).toBe(1)
    expect(metrics.whatsappClicks).toBe(0)

    const stored = getContactClickMetrics('test-prop-1')
    expect(stored.phoneClicks).toBe(1)
  })

  it('incrementa el contador de whatsapp', async () => {
    const metrics = await trackContactClick('test-prop-1', 'whatsapp')
    expect(metrics.whatsappClicks).toBe(1)
    expect(metrics.phoneClicks).toBe(0)
  })
})
