import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPushNotificationId,
  getPushNotificationId,
  markNotificationAsRead,
  NOTIFICATION_READ_EVENT,
} from './notificationRead'

const mocks = vi.hoisted(() => ({
  eqUser: vi.fn(),
  eqId: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { from: mocks.from },
}))

describe('push notification read state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
    mocks.eqUser.mockResolvedValue({ error: null })
    mocks.eqId.mockReturnValue({ eq: mocks.eqUser })
    mocks.update.mockReturnValue({ eq: mocks.eqId })
    mocks.from.mockReturnValue({ update: mocks.update })
  })

  it('accepts only a UUID from the push query parameter', () => {
    expect(getPushNotificationId('?cubitat_notification=8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f')).toBe(
      '8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f',
    )
    expect(getPushNotificationId('?cubitat_notification=not-a-uuid')).toBeNull()
  })

  it('marks only the current user notification and announces the local change', async () => {
    const listener = vi.fn()
    window.addEventListener(NOTIFICATION_READ_EVENT, listener)

    await markNotificationAsRead('user-1', '8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f')

    expect(mocks.from).toHaveBeenCalledWith('notifications')
    expect(mocks.update).toHaveBeenCalledWith({ is_read: true })
    expect(mocks.eqId).toHaveBeenCalledWith('id', '8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f')
    expect(mocks.eqUser).toHaveBeenCalledWith('user_id', 'user-1')
    expect(listener).toHaveBeenCalledOnce()

    window.removeEventListener(NOTIFICATION_READ_EVENT, listener)
  })

  it('removes the internal marker while preserving the destination query and hash', () => {
    window.history.replaceState(null, '', '/propiedad/casa?tab=contacto&cubitat_notification=8f5e4f5a-2e9f-4ee2-a6a6-c0e208c3f43f#form')

    clearPushNotificationId()

    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
      '/propiedad/casa?tab=contacto#form',
    )
  })
})
