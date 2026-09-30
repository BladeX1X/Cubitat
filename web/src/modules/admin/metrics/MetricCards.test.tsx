import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AdminMetrics } from '../core/types'
import { AnalyticsMetricCard, CloudflareMetricCard } from './MetricCards'

const baseMetrics: AdminMetrics = {
  cloudflare: { requests: null, error: null },
  analytics: { activeUsers: null, error: null },
  supabase: { storage_bytes: null, egress_bytes: null, db_bytes: null, error: null },
}

describe('MetricCards', () => {
  it('does not present missing Cloudflare data as zero', () => {
    render(<CloudflareMetricCard metrics={baseMetrics} />)

    expect(screen.getByText('Métrica no disponible.')).toBeInTheDocument()
    expect(screen.queryByText('0', { exact: true })).not.toBeInTheDocument()
  })

  it('keeps a real zero Analytics value visible', () => {
    render(
      <AnalyticsMetricCard
        metrics={{ ...baseMetrics, analytics: { activeUsers: 0, error: null } }}
      />,
    )

    expect(screen.getByText('0', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Métrica no disponible.')).not.toBeInTheDocument()
  })
})
