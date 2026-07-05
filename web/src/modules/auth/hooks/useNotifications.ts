import { useState, useEffect } from 'react'
import { supabase } from '../../../shared/lib/supabaseClient'

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
          .order('created_at', { ascending: false })

        if (error) throw error
        if (data && isMounted) setNotifications(data)
      } catch (err) {
        console.error('Error loading notifications:', err)
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
            setNotifications(prev => [payload.new as Notification, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n))
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

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAsRead = async (notificationId: string) => {
    if (!sessionUid) return

    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', sessionUid)
      
      if (error) throw error
    } catch (err) {
      console.error('Error marking notification as read:', err)
      // Revert optimistic update
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: false } : n))
    }
  }

  const markAllAsRead = async () => {
    if (!sessionUid || unreadCount === 0) return

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', sessionUid)
        .eq('is_read', false)
      
      if (error) throw error
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
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
