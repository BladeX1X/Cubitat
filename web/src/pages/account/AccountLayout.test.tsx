import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountLayout } from './AccountLayout'

vi.mock('../../shared/config/features', () => ({
  PHASE_TWO_ENABLED: true,
}))

const navigationProps = {
  active: 'account' as const,
  onNavigateAccount: vi.fn(),
  onNavigateFavorites: vi.fn(),
  onNavigateMyProperties: vi.fn(),
  onNavigateAgentDashboard: vi.fn(),
}

describe('AccountLayout agent navigation', () => {
  it.each(['buyer', 'seller', 'admin', undefined])(
    'hides the agent dashboard from a non-agent role (%s)',
    (userRole) => {
      render(
        <AccountLayout {...navigationProps} userRole={userRole}>
          Cuenta
        </AccountLayout>,
      )

      expect(screen.queryByRole('button', { name: 'Panel de Agente' })).not.toBeInTheDocument()
    },
  )

  it('shows the agent dashboard to an agent', () => {
    render(
      <AccountLayout {...navigationProps} userRole="agent">
        Cuenta
      </AccountLayout>,
    )

    expect(screen.getByRole('button', { name: 'Panel de Agente' })).toBeInTheDocument()
  })
})
