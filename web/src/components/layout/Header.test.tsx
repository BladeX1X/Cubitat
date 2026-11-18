import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  navigateAgentApplication: vi.fn(),
  navigateServices: vi.fn(),
  navigateMaterials: vi.fn(),
  openLogin: vi.fn(),
  handleOperationNavigation: vi.fn(),
  onSignOut: vi.fn(),
}

describe('Header mobile menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the tuGao logo as the home link brand', () => {
    render(<Header user={null} {...callbacks} />)

    const logo = screen.getByRole('img', { name: 'tuGao · atrapa tu sueño' })
    expect(logo).toHaveAttribute('src', '/brand/tugao/logo-horizontal.webp')
    expect(logo.closest('a')).toHaveAttribute('aria-label', 'Inicio de tuGao')
  })

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

  it('uses Permutar as the third discovery action', () => {
    render(<Header user={null} {...callbacks} />)

    const permutarLink = screen.getByRole('link', { name: 'Permutar' })
    expect(permutarLink).toHaveAttribute('href', '/resultados')

    fireEvent.click(permutarLink)

    expect(callbacks.handleOperationNavigation).toHaveBeenCalledWith('permuta')
    expect(screen.queryByRole('link', { name: 'Publicar' })).not.toBeInTheDocument()
  })

  it('offers Permutar in the mobile discovery menu', () => {
    render(<Header user={null} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))

    fireEvent.click(screen.getByRole('button', { name: 'Permutar' }))

    expect(callbacks.handleOperationNavigation).toHaveBeenCalledWith('permuta')
  })

  it('keeps Ser agente out of public navigation and the mobile menu', () => {
    render(<Header user={null} {...callbacks} />)

    expect(screen.queryByRole('link', { name: 'Ser agente' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
    expect(screen.queryByRole('button', { name: 'Ser agente' })).not.toBeInTheDocument()
  })

  it('shows Services and Materials first in the mobile menu', () => {
    render(<Header user={null} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))

    const menu = screen.getByRole('complementary', { name: 'Menú móvil' })
    const catalogs = within(menu).getByRole('navigation', { name: 'Servicios y materiales' })
    const servicesButton = within(catalogs).getByRole('button', { name: /Servicios/ })
    const materialsButton = within(catalogs).getByRole('button', { name: /Materiales/ })
    const accountOptions = within(menu).getByRole('navigation', { name: 'Operaciones' })

    expect(servicesButton).toBeInTheDocument()
    expect(materialsButton).toBeInTheDocument()
    expect(catalogs.compareDocumentPosition(accountOptions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(servicesButton)
    expect(callbacks.navigateServices).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Servicios y materiales' })).getByRole('button', { name: /Materiales/ }))
    expect(callbacks.navigateMaterials).toHaveBeenCalledOnce()
  })

  it('shows direct Services and Materials shortcuts without opening the mobile menu', () => {
    render(<Header user={null} {...callbacks} />)

    const shortcuts = screen.getByRole('navigation', { name: 'Catálogos' })
    const services = within(shortcuts).getByRole('button', { name: 'Servicios' })
    const materials = within(shortcuts).getByRole('button', { name: 'Materiales' })
    expect(screen.queryByRole('complementary', { name: 'Menú móvil' })).not.toBeInTheDocument()

    fireEvent.click(services)
    fireEvent.click(materials)
    expect(callbacks.navigateServices).toHaveBeenCalledOnce()
    expect(callbacks.navigateMaterials).toHaveBeenCalledOnce()
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
