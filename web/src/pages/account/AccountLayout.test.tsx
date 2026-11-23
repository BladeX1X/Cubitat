import { fireEvent, render, screen, within } from '@testing-library/react'
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
  onNavigateMyServices: vi.fn(),
  onNavigateMyMaterials: vi.fn(),
  onNavigateAgentDashboard: vi.fn(),
}

describe('AccountLayout agent navigation', () => {
  it.each(['buyer', 'seller', 'admin', undefined])(
    'hides the agent dashboard from a non-agent role (%s)',
    (userRole) => {
      render(
        <AccountLayout {...navigationProps} userRole={userRole} canAccessAgentDashboard={false}>
          Cuenta
        </AccountLayout>,
      )

      expect(screen.queryByRole('button', { name: 'Panel de Agente' })).not.toBeInTheDocument()
    },
  )

  it('shows the agent dashboard to an agent', () => {
    render(
      <AccountLayout {...navigationProps} userRole="agent" canAccessAgentDashboard>
        Cuenta
      </AccountLayout>,
    )

      expect(within(screen.getByRole('navigation', { name: 'Navegacion de cuenta' })).getByRole('button', { name: 'Panel de Agente' })).toBeInTheDocument()
  })

  it('shows the dashboard to a verified admin as an agent too', () => {
    render(<AccountLayout {...navigationProps} userRole="admin" canAccessAgentDashboard>Cuenta</AccountLayout>)
    expect(within(screen.getByRole('navigation', { name: 'Navegacion de cuenta' })).getByRole('button', { name: 'Panel de Agente' })).toBeInTheDocument()
  })

  it('keeps account destinations available from the compact mobile navigation', () => {
    render(<AccountLayout {...navigationProps} userRole="buyer">Cuenta</AccountLayout>)

    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegación de cuenta móvil' })
    expect(within(mobileNavigation).getByRole('button', { name: 'Mi cuenta' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(within(mobileNavigation).getByRole('button', { name: 'Favoritos' }))
    expect(navigationProps.onNavigateFavorites).toHaveBeenCalledOnce()
  })

  it('shows service and material management in desktop and mobile account navigation', () => {
    render(
      <AccountLayout {...navigationProps} userRole="buyer" active="contents">
        Cuenta
      </AccountLayout>,
    )

    const desktopNavigation = screen.getByRole('navigation', { name: 'Navegacion de cuenta' })
    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegación de cuenta móvil' })

    expect(within(desktopNavigation).getByRole('button', { name: 'Mis servicios' })).toBeInTheDocument()
    expect(within(desktopNavigation).getByRole('button', { name: 'Mis materiales' })).toBeInTheDocument()
    expect(within(mobileNavigation).getByRole('button', { name: 'Mis servicios' })).toBeInTheDocument()
    expect(within(mobileNavigation).getByRole('button', { name: 'Mis materiales' })).toBeInTheDocument()

    fireEvent.click(within(desktopNavigation).getByRole('button', { name: 'Mis servicios' }))
    fireEvent.click(within(mobileNavigation).getByRole('button', { name: 'Mis materiales' }))
    expect(navigationProps.onNavigateMyServices).toHaveBeenCalledOnce()
    expect(navigationProps.onNavigateMyMaterials).toHaveBeenCalledOnce()
  })
})
