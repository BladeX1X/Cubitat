import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  Heart,
  Home,
  LogOut,
  Shield,
  User as UserIcon,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useNotifications } from '../modules/auth/hooks/useNotifications'
import type { Notification } from '../modules/auth/hooks/useNotifications'
import { getNotificationDestination } from './notificationDestination'

interface UserMenuProps {
  user: User
  userRole?: string
  onNavigateAccount?: () => void
  onNavigateFavorites?: () => void
  onNavigateMyProperties?: () => void
  onNavigateModerar?: () => void
  onSignOut?: () => void
}

export function NotificationsMenu({ className = '' }: { className?: string }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      void markAsRead(notification.id)
    }

    setIsNotificationsOpen(false)
    const destination = getNotificationDestination(notification.action_path)
    if (!destination) return

    window.history.pushState(null, '', destination)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className={`notification-menu relative z-[60] ${className}`} ref={notifRef}>
      <button
        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
        className={`notification-trigger relative inline-grid min-h-11 min-w-11 place-items-center rounded-full p-2 transition-colors focus:outline-none ${isNotificationsOpen ? 'bg-neutral-100 text-[#035f53]' : 'text-neutral-500 hover:text-[#035f53] hover:bg-neutral-50'}`}
        aria-label="Ver notificaciones"
        aria-expanded={isNotificationsOpen}
        aria-haspopup="true"
        type="button"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-count absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 border-2 border-white text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isNotificationsOpen && (
        <div className="notification-panel absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-100 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right duration-200 z-50">
          <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-800">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#035f53] hover:underline font-medium"
                type="button"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-neutral-500">
                <Bell className="mx-auto mb-2 opacity-20" size={32} />
                <p className="text-sm">No tienes notificaciones pendientes</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {notifications.map((notif) => (
                  <li key={notif.id}>
                    <button
                      type="button"
                      className={`w-full p-4 text-left transition-colors hover:bg-neutral-50 ${notif.is_read ? 'opacity-70' : 'bg-[#035f53]/5'}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex gap-3">
                        <div className="shrink-0 mt-0.5">
                          <div
                            className={`w-2 h-2 rounded-full ${notif.is_read ? 'bg-neutral-300' : 'bg-[#035f53] animate-pulse'}`}
                          />
                        </div>
                        <div>
                          <p className={`text-sm ${notif.is_read ? 'text-neutral-600' : 'text-neutral-900 font-semibold'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-2">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function UserMenu({
  user,
  userRole,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateModerar,
  onSignOut,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const fullName = user.user_metadata?.full_name || ''
  const email = user.email || ''

  function getInitials() {
    if (fullName) {
      const parts = fullName.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return fullName.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleNavigate(callback?: () => void) {
    setIsOpen(false)
    callback?.()
  }

  async function handleSignOut() {
    setIsOpen(false)
    onSignOut?.()
  }

  return (
    <div className="flex items-center gap-4">
      <NotificationsMenu />

      <div className="relative z-50" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1.5 pr-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#035f53] focus:ring-offset-2"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Abrir menú de usuario"
          type="button"
        >
          <div className="flex items-center justify-center w-8 h-8 bg-[#035f53] text-white rounded-full text-sm font-bold uppercase shadow-sm">
            {getInitials()}
          </div>
          <ChevronDown
            size={16}
            className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-100 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right duration-200">
            <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <p className="text-sm font-semibold text-neutral-800 truncate">{fullName || 'Usuario'}</p>
              <p className="text-xs text-neutral-500 truncate mt-0.5">{email}</p>
            </div>

            <div className="py-1.5">
              <button
                className="w-full text-left px-5 py-3 text-sm text-neutral-800 hover:bg-[#035f53]/5 hover:text-[#035f53] flex items-center gap-3 transition-colors"
                onClick={() => handleNavigate(onNavigateAccount)}
                type="button"
              >
                <UserIcon size={18} className="text-neutral-400" />
                Mi cuenta
              </button>
              <button
                className="w-full text-left px-5 py-3 text-sm text-neutral-800 hover:bg-[#035f53]/5 hover:text-[#035f53] flex items-center gap-3 transition-colors"
                onClick={() => handleNavigate(onNavigateFavorites)}
                type="button"
              >
                <Heart size={18} className="text-neutral-400" />
                Favoritos
              </button>
              <button
                onClick={() => handleNavigate(onNavigateMyProperties)}
                className="w-full text-left px-5 py-3 text-sm text-neutral-800 hover:bg-[#035f53]/5 hover:text-[#035f53] flex items-center gap-3 transition-colors"
                type="button"
              >
                <Home size={18} className="text-neutral-400" />
                Mis publicaciones
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={() => handleNavigate(onNavigateModerar)}
                  className="w-full text-left px-5 py-3 text-sm text-neutral-800 hover:bg-[#035f53]/5 hover:text-[#035f53] flex items-center gap-3 transition-colors"
                  type="button"
                >
                  <Shield size={18} className="text-neutral-400" />
                  Panel de moderación
                </button>
              )}
            </div>

            <div className="border-t border-neutral-100 py-1">
              <button
                onClick={handleSignOut}
                className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                type="button"
              >
                <LogOut size={18} className="text-red-500" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
