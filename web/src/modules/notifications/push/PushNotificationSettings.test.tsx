import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PushNotificationSettings } from './PushNotificationSettings'

function services(overrides: Partial<Parameters<typeof PushNotificationSettings>[0]['services']> = {}) {
  return {
    getAvailability: vi.fn().mockReturnValue('available' as const),
    getPermission: vi.fn().mockReturnValue('default' as NotificationPermission),
    getSubscription: vi.fn().mockResolvedValue(null),
    enable: vi.fn().mockResolvedValue('enabled' as const),
    disable: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('PushNotificationSettings', () => {
  it('explains that iOS requires installing the app first', async () => {
    const api = services({ getAvailability: vi.fn().mockReturnValue('ios_install_required') })
    render(<PushNotificationSettings services={api} />)

    expect(await screen.findByText(/pantalla de inicio/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /activar/i })).not.toBeInTheDocument()
  })

  it('activates notifications only from the user button', async () => {
    const api = services()
    render(<PushNotificationSettings services={api} />)

    expect(api.enable).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: /activar/i }))

    await waitFor(() => expect(api.enable).toHaveBeenCalledOnce())
    expect(await screen.findByText(/activas en este dispositivo/i)).toBeInTheDocument()
  })

  it('offers settings guidance when permission is blocked', async () => {
    const api = services({ getPermission: vi.fn().mockReturnValue('denied') })
    render(<PushNotificationSettings services={api} />)

    expect(await screen.findByText(/permiso esta bloqueado/i)).toBeInTheDocument()
  })
})
