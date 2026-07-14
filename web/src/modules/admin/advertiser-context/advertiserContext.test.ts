import { describe, expect, it } from 'vitest'
import { buildAdvertiserContext } from './advertiserContext'

const NOW = new Date('2026-07-14T12:00:00.000Z')

describe('buildAdvertiserContext', () => {
  it('returns a low-risk empty summary without inventing signals', () => {
    const context = buildAdvertiserContext({
      profileCreatedAt: '2025-01-01T00:00:00.000Z',
      propertyStatuses: [],
      reportStatuses: [],
      lastPropertyAt: null,
    }, NOW)

    expect(context.riskLevel).toBe('low')
    expect(context.signals).toEqual([])
    expect(context.propertyCounts.total).toBe(0)
    expect(context.reportCounts.total).toBe(0)
  })

  it('explains a recent account and an isolated rejection as medium risk', () => {
    const context = buildAdvertiserContext({
      profileCreatedAt: '2026-07-01T00:00:00.000Z',
      propertyStatuses: ['published', 'ai_rejected'],
      reportStatuses: [],
      lastPropertyAt: '2026-07-13T00:00:00.000Z',
    }, NOW)

    expect(context.riskLevel).toBe('medium')
    expect(context.accountAgeDays).toBe(13)
    expect(context.propertyCounts).toMatchObject({ total: 2, published: 1, aiRejected: 1 })
    expect(context.signals.map((signal) => signal.code)).toEqual(['new_account', 'rejected_properties'])
  })

  it('marks pending reports and repeated rejections as high risk', () => {
    const context = buildAdvertiserContext({
      profileCreatedAt: '2025-01-01T00:00:00.000Z',
      propertyStatuses: ['ai_rejected', 'ai_rejected', 'ai_rejected', 'paused'],
      reportStatuses: ['pending', 'dismissed', 'resolved'],
      lastPropertyAt: '2026-07-10T00:00:00.000Z',
    }, NOW)

    expect(context.riskLevel).toBe('high')
    expect(context.reportCounts).toEqual({ total: 3, pending: 1 })
    expect(context.signals.map((signal) => signal.code)).toEqual([
      'pending_reports',
      'repeated_reports',
      'rejected_properties',
    ])
  })
})
