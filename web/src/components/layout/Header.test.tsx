import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Header } from './Header'
import { PWA_INSTALL_REQUEST_EVENT } from './PWAInstallPrompt'

vi.mock('../UserMenu', () => ({
  NotificationsMenu: () => null,
  UserMenu: () => null,
}))

const callbacks = {
  navigateHome: vi.fn(),
  navigateAccount: vi.fn(),
  navigateFavorites: vi.fn(),
  navigateMyProperties: vi.fn(),
  navigateModerar: vi.fn(),
  navigatePublish: vi.fn(),
  navigateResults: vi.fn(),
  openLogin: vi.fn(),
  handleOperationNavigation: vi.fn(),
  onSignOut: vi.fn(),
}

describe('Header mobile menu', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.classList.remove('has-mobile-menu-open')
    document.body.style.overflow = ''
  })

  it('locks the background while the mobile menu is open and restores it on close', () => {
    render(<Header user={null} {...callbacks} />)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))

    expect(screen.getByRole('complementary', { name: 'Menú móvil' })).toBeInTheDocument()
    expect(document.body).toHaveClass('has-mobile-menu-open')
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }))

    expect(screen.queryByRole('complementary', { name: 'Menú móvil' })).not.toBeInTheDocument()
    expect(document.body).not.toHaveClass('has-mobile-menu-open')
    expect(document.body.style.overflow).toBe('')
  })

  it('permite solicitar la instalación desde el menú móvil', () => {
    const installRequest = vi.fn()
    window.addEventListener(PWA_INSTALL_REQUEST_EVENT, installRequest)

    render(<Header user={null} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Instalar Cubitat' }))

    expect(installRequest).toHaveBeenCalledOnce()
    expect(screen.queryByRole('complementary', { name: 'Menú móvil' })).not.toBeInTheDocument()
    window.removeEventListener(PWA_INSTALL_REQUEST_EVENT, installRequest)
  })

  it('no ofrece instalar cuando Cubitat ya se ejecuta como PWA', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<Header user={null} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))

    expect(screen.queryByRole('button', { name: /instalar Cubitat/i })).not.toBeInTheDocument()
  })
})
