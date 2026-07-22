import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrustScoreBadge } from './TrustScoreBadge'

describe('TrustScoreBadge', () => {
  it('renders correctly with explicit score and label', () => {
    render(<TrustScoreBadge score={4.9} label="Excelente" />)

    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('4.9 · Excelente')
    expect(badge).toHaveAttribute('aria-label', 'Score de confianza: 4.9 de 5.0 - Nivel Excelente')
  })

  it('renders correctly when profileData is provided', () => {
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
    expect(badge).toHaveTextContent('5.0 · Excelente')
  })

  it('applies compact styling when compact prop is true', () => {
    render(<TrustScoreBadge score={3.8} label="Verificado" compact />)

    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-[11px]')
  })
})
