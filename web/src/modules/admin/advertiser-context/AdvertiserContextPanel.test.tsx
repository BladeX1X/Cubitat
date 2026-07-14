import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvertiserContextPanel } from './AdvertiserContextPanel'

const { useAdvertiserContextMock, loadMock } = vi.hoisted(() => ({
  useAdvertiserContextMock: vi.fn(),
  loadMock: vi.fn(),
}))

vi.mock('./useAdvertiserContext', () => ({ useAdvertiserContext: useAdvertiserContextMock }))

describe('AdvertiserContextPanel', () => {
  beforeEach(() => {
    loadMock.mockReset()
  })

  it('shows the read-only summary and explainable signals', () => {
    useAdvertiserContextMock.mockReturnValue({
      loading: false,
      error: null,
      load: loadMock,
      context: {
        profileCreatedAt: '2026-07-01T00:00:00.000Z',
        accountAgeDays: 13,
        lastPropertyAt: '2026-07-13T00:00:00.000Z',
        propertyCounts: { total: 2, published: 1, pendingReview: 0, aiApproved: 0, aiRejected: 1, paused: 0 },
        reportCounts: { total: 0, pending: 0 },
        riskLevel: 'medium',
        signals: [{
          code: 'new_account',
          label: 'Cuenta reciente',
          detail: 'Antigüedad de 13 días.',
          severity: 'warning',
        }],
      },
    })

    render(<AdvertiserContextPanel userId="user-1" />)

    expect(screen.getByRole('heading', { name: 'Contexto del anunciante' })).toBeInTheDocument()
    expect(screen.getByText('Atención')).toBeInTheDocument()
    expect(screen.getByText(/Cuenta reciente/)).toBeInTheDocument()
    expect(screen.getByText(/requieren revisión humana/)).toBeInTheDocument()
  })

  it('offers retry after an isolated loading error', () => {
    useAdvertiserContextMock.mockReturnValue({
      loading: false,
      error: 'No se pudo cargar el contexto.',
      load: loadMock,
      context: null,
    })

    render(<AdvertiserContextPanel userId="user-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el contexto.')
    expect(loadMock).toHaveBeenCalledOnce()
  })
})
