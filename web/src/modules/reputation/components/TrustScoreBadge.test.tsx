import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrustScoreBadge } from './TrustScoreBadge'

describe('TrustScoreBadge', () => {
  it('renders correctly with explicit label', () => {
    render(<TrustScoreBadge label="Verificado" />)

    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Agente Verificado')
    expect(badge).toHaveAttribute('aria-label', 'Agente Verificado')
  })

  it('renders correctly when profileData is verified', () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    render(
      <TrustScoreBadge
        profileData={{
          verificationStatus: 'verified',
          createdAt: oneYearAgo,
          activePropertiesCount: 5,
          reportsCount: 0,
        }}
      />
    )

    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Agente Verificado')
  })

  it('applies compact styling when compact prop is true', () => {
    render(<TrustScoreBadge label="Verificado" compact />)

    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-[11px]')
  })
})
