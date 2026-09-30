import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotifications } from './useNotifications'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  markNotificationAsRead: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}))

vi.mock('../../notifications/notificationRead', () => ({
  NOTIFICATION_READ_EVENT: 'cubitat:notification-read',
  markNotificationAsRead: mocks.markNotificationAsRead,
}))

vi.mock('../../../shared/lib/logger', () => ({
  logSafeEvent: vi.fn(),
  sanitizeErrorReason: vi.fn(() => 'test-error'),
}))

const notification = {
  id: 'notification-1',
  user_id: 'user-1',
  title: 'Nueva coincidencia',
  message: 'Hay una propiedad que coincide con tus filtros.',
  action_path: '/propiedad/property-1',
  is_read: false,
  created_at: '2026-09-27T12:00:00.000Z',
}

function createQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  query.select.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  return query
}

function createChannel() {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  channel.on.mockReturnValue(channel)
  channel.subscribe.mockReturnValue(channel)
  return channel
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    mocks.channel.mockReturnValue(createChannel())
    mocks.from.mockReturnValue(createQuery({ data: [notification], error: null }))
    mocks.markNotificationAsRead.mockResolvedValue(undefined)
  })

  it('loads unread notifications for the active session', async () => {
    const { result } = renderHook(() => useNotifications())

    await waitFor(() => expect(result.current.notifications).toHaveLength(1))

    expect(result.current.notifications).toEqual([notification])
    expect(result.current.unreadCount).toBe(1)
  })

  it('removes a notification immediately and persists it as read', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.notifications).toHaveLength(1))

    await act(async () => {
      await result.current.markAsRead(notification.id)
    })

    expect(result.current.notifications).toEqual([])
    expect(mocks.markNotificationAsRead).toHaveBeenCalledWith('user-1', notification.id)
  })

  it('restores a notification when marking it as read fails', async () => {
    mocks.markNotificationAsRead.mockRejectedValueOnce(new Error('network failure'))
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.notifications).toHaveLength(1))

    await act(async () => {
      await result.current.markAsRead(notification.id)
    })

    expect(result.current.notifications).toEqual([notification])
  })
})
