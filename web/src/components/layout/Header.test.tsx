import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Header } from './Header'

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
})
