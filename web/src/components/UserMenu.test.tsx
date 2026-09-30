import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsMenu } from './UserMenu'
import { getNotificationDestination } from './notificationDestination'
import { useNotifications } from '../modules/auth/hooks/useNotifications'

vi.mock('../modules/auth/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}))

const mockedUseNotifications = vi.mocked(useNotifications)
const markAsRead = vi.fn()

describe('NotificationsMenu', () => {
  beforeEach(() => {
    markAsRead.mockReset()
    window.history.replaceState(null, '', '/')
    mockedUseNotifications.mockReturnValue({
      notifications: [{
        id: 'notification-1',
        user_id: 'user-1',
        title: 'Alerta coincidente',
        message: 'Se publico una propiedad que coincide con tu alerta.',
        action_path: '/propiedad/property-1',
        is_read: false,
        created_at: '2026-09-09T12:00:00.000Z',
      }],
      unreadCount: 1,
      loading: false,
      markAsRead,
      markAllAsRead: vi.fn(),
    })
  })

  it('marks a notification as read and navigates to its destination', () => {
    const popStateListener = vi.fn()
    window.addEventListener('popstate', popStateListener)

    render(<NotificationsMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver notificaciones' }))
    fireEvent.click(screen.getByRole('button', { name: /Alerta coincidente/i }))

    expect(markAsRead).toHaveBeenCalledWith('notification-1')
    expect(window.location.pathname).toBe('/propiedad/property-1')
    expect(popStateListener).toHaveBeenCalledOnce()
    expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument()

    window.removeEventListener('popstate', popStateListener)
  })

  it('marks a notification without a valid destination and closes the menu', () => {
    mockedUseNotifications.mockReturnValue({
      notifications: [{
        id: 'notification-2',
        user_id: 'user-1',
        title: 'Aviso informativo',
        message: 'Este aviso no tiene una propiedad asociada.',
        action_path: null,
        is_read: false,
        created_at: '2026-09-09T12:00:00.000Z',
      }],
      unreadCount: 1,
      loading: false,
      markAsRead,
      markAllAsRead: vi.fn(),
    })

    render(<NotificationsMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver notificaciones' }))
    fireEvent.click(screen.getByRole('button', { name: /Aviso informativo/i }))

    expect(markAsRead).toHaveBeenCalledWith('notification-2')
    expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })
})

describe('getNotificationDestination', () => {
  it('accepts internal paths and preserves query strings and fragments', () => {
    expect(getNotificationDestination('/propiedad/property-1?origen=alerta#contacto'))
      .toBe('/propiedad/property-1?origen=alerta#contacto')
  })

  it('rejects external, protocol-relative and malformed destinations', () => {
    expect(getNotificationDestination('https://example.com')).toBeNull()
    expect(getNotificationDestination('//example.com/path')).toBeNull()
    expect(getNotificationDestination('propiedad/property-1')).toBeNull()
  })
})
