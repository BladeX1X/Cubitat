import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VerificationBadge } from './VerificationBadge'

describe('VerificationBadge', () => {
  it('renders verified badge for verified status', () => {
    render(<VerificationBadge status="verified" />)
    expect(screen.getByText('Verificado')).toBeInTheDocument()
  })

  it('renders agent verified badge when isAgent is true and status is verified', () => {
    render(<VerificationBadge status="verified" isAgent />)
    expect(screen.getByText('Agente verificado')).toBeInTheDocument()
  })

  it('renders a distinct verified seller badge', () => {
    render(<VerificationBadge status="verified" isSeller />)
    expect(screen.getByText('Vendedor verificado')).toBeInTheDocument()
  })

  it('renders pending status badge', () => {
    render(<VerificationBadge status="pending" />)
    expect(screen.getByText('Verificación en revisión')).toBeInTheDocument()
  })

  it('returns null for unverified status without agent flag', () => {
    const { container } = render(<VerificationBadge status="unverified" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders agent badge for unverified agent', () => {
    render(<VerificationBadge status="unverified" isAgent />)
    expect(screen.getByText('Agente Inmobiliario')).toBeInTheDocument()
  })
})
