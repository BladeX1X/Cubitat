import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PushNotificationSettings } from './PushNotificationSettings'

function createServices(overrides: Partial<{
  availability: 'available' | 'unsupported' | 'ios_install_required'
  permission: NotificationPermission
  subscription: object | null
  enableResult: 'enabled' | 'blocked'
}> = {}) {
  const prepare = vi.fn().mockResolvedValue({ registration: {}, applicationServerKey: new Uint8Array([1]) })
  const getSubscription = vi.fn().mockResolvedValue(overrides.subscription ?? null)
  const enable = vi.fn().mockResolvedValue(overrides.enableResult ?? 'enabled')
  const disable = vi.fn().mockResolvedValue(undefined)

  return {
    services: {
      getAvailability: vi.fn().mockReturnValue(overrides.availability ?? 'available'),
      getPermission: vi.fn().mockReturnValue(overrides.permission ?? 'default'),
      prepare,
      getSubscription,
      enable,
      disable,
    },
    prepare,
    getSubscription,
    enable,
    disable,
  }
}

describe('PushNotificationSettings', () => {
  it('shows the disabled state and enables notifications from the button', async () => {
    const { services, enable } = createServices()
    render(<PushNotificationSettings services={services} />)

    const button = await screen.findByRole('button', { name: 'Activar notificaciones' })
    fireEvent.click(button)

    await waitFor(() => expect(screen.getByText('Las notificaciones estan activas en este dispositivo.')).toBeInTheDocument())
    expect(enable).toHaveBeenCalledOnce()
  })

  it('shows the enabled state and disables the current device subscription', async () => {
    const { services, disable } = createServices({ subscription: { endpoint: 'push-1' } })
    render(<PushNotificationSettings services={services} />)

    const button = await screen.findByRole('button', { name: 'Desactivar en este dispositivo' })
    fireEvent.click(button)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Activar notificaciones' })).toBeInTheDocument())
    expect(disable).toHaveBeenCalledOnce()
  })

  it('explains that iOS must use an installed PWA', async () => {
    const { services } = createServices({ availability: 'ios_install_required' })
    render(<PushNotificationSettings services={services} />)

    expect(await screen.findByText('Instala Cubitat en la pantalla de inicio para activar las notificaciones.'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows a browser-specific recovery message when subscription fails', async () => {
    const { services, enable } = createServices()
    enable.mockRejectedValueOnce(new Error('push_browser_subscription_failed'))
    render(<PushNotificationSettings services={services} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Activar notificaciones' }))

    await waitFor(() => expect(screen.getByText(
      'El navegador no pudo activar las notificaciones. Revisa que Chrome tenga permiso para enviarlas e intenta de nuevo.',
    )).toBeInTheDocument())
  })

  it('continues activation when a configuration retry finishes preparation', async () => {
    const { services, enable } = createServices()
    services.prepare.mockRejectedValueOnce(new Error('push_configuration_unavailable'))

    render(<PushNotificationSettings services={services} />)
    const button = await screen.findByRole('button', { name: 'Reintentar configuración' })

    fireEvent.click(button)

    await waitFor(() => expect(screen.getByText('Las notificaciones estan activas en este dispositivo.')).toBeInTheDocument())
    expect(enable).toHaveBeenCalledOnce()
  })

  it('does not expose a button when the browser blocks notifications', async () => {
    const { services } = createServices({ permission: 'denied' })
    render(<PushNotificationSettings services={services} />)

    expect(await screen.findByText('El permiso esta bloqueado. Activalo en los ajustes del navegador o del sistema.'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
