import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { loadAgentDashboard, loadAgentGrowthDashboard } = vi.hoisted(() => ({
  loadAgentDashboard: vi.fn(),
  loadAgentGrowthDashboard: vi.fn(),
}))

vi.mock('../../modules/agents/agentDashboardRepository', () => ({
  loadAgentDashboard,
  setOwnerPropertyVisibility: vi.fn(),
}))
vi.mock('../../modules/agents/agentGrowthRepository', () => ({ loadAgentGrowthDashboard }))
vi.mock('../../modules/agents/components/AgentGrowthPanel', () => ({
  AgentGrowthPanel: () => {
    void loadAgentGrowthDashboard()
    return <div data-testid="private-growth-panel" />
  },
}))

describe('AgentDashboardPage private panel gate', () => {
  it('waits for eligibility before loading opportunity data', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_PHASE3_UI_ENABLED', 'true')
    let resolveProfile!: (value: { role: string; isVerifiedAgent: boolean; properties: never[] }) => void
    loadAgentDashboard.mockReturnValueOnce(new Promise((resolve) => { resolveProfile = resolve }))
    loadAgentGrowthDashboard.mockResolvedValue({ leads: [], events: [] })

    const { AgentDashboardPage } = await import('./AgentDashboardPage')
    const user = { id: 'buyer-1' } as never
    render(<AgentDashboardPage user={user} />)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(screen.queryByTestId('private-growth-panel')).not.toBeInTheDocument()
    expect(loadAgentGrowthDashboard).not.toHaveBeenCalled()

    await act(async () => resolveProfile({ role: 'buyer', isVerifiedAgent: false, properties: [] }))
    expect(await screen.findByRole('alert')).toHaveTextContent('KYC aprobada')
    expect(loadAgentGrowthDashboard).not.toHaveBeenCalled()

    vi.unstubAllEnvs()
  })
})
