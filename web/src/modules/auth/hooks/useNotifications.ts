import { useState, useEffect } from 'react'
import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [sessionUid, setSessionUid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUid(session?.user?.id ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUid(session?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessionUid) {
      setNotifications([])
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)

    async function loadNotifications() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', sessionUid)
          .eq('is_read', false)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (data && isMounted) setNotifications(data)
      } catch (err) {
        logSafeEvent({
          module: 'auth',
          action: 'load_notifications',
          level: 'error',
          code: sanitizeErrorReason(err),
        })
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadNotifications()

    // Each mounted menu needs its own channel. Reusing a channel name can crash
    // Supabase Realtime when React mounts desktop and mobile menus together.
    const channel = supabase
      .channel(`notifications-changes-${sessionUid}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${sessionUid}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nextNotification = payload.new as Notification
            if (!nextNotification.is_read) {
              setNotifications(prev => [nextNotification, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const nextNotification = payload.new as Notification
            setNotifications(prev => {
              if (nextNotification.is_read) {
                return prev.filter(n => n.id !== nextNotification.id)
              }

              const exists = prev.some(n => n.id === nextNotification.id)
              return exists
                ? prev.map(n => n.id === nextNotification.id ? nextNotification : n)
                : [nextNotification, ...prev]
            })
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [sessionUid])

  const unreadCount = notifications.length

  const markAsRead = async (notificationId: string) => {
    if (!sessionUid) return

    const previousNotifications = notifications
    setNotifications(prev => prev.filter(n => n.id !== notificationId))

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', sessionUid)
      
      if (error) throw error
    } catch (err) {
      logSafeEvent({
        module: 'auth',
        action: 'mark_notification_read',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setNotifications(previousNotifications)
    }
  }

  const markAllAsRead = async () => {
    if (!sessionUid || unreadCount === 0) return

    const previousNotifications = notifications
    setNotifications([])

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', sessionUid)
        .eq('is_read', false)
      
      if (error) throw error
    } catch (err) {
      logSafeEvent({
        module: 'auth',
        action: 'mark_all_notifications_read',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setNotifications(previousNotifications)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  }
}
