import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../../../shared/lib/supabaseClient'
import { useAuthModal } from '../../auth/contexts/AuthModalContext'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

type SavedPropertiesContextValue = {
  savedPropertyIds: Set<string>
  loading: boolean
  toggleSave: (propertyId: string) => Promise<boolean>
  isSaved: (propertyId: string) => boolean
}

const SavedPropertiesContext = createContext<SavedPropertiesContextValue | undefined>(undefined)

export function SavedPropertiesProvider({ children }: { children: ReactNode }) {
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set())
  const [sessionUid, setSessionUid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { openSavePrompt } = useAuthModal()

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSessionUid(session?.user?.id ?? null)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUid(session?.user?.id ?? null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSavedProperties() {
      setLoading(true)

      if (!sessionUid) {
        setSavedPropertyIds(new Set())
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('saved_properties')
          .select('property_id')
          .eq('user_id', sessionUid)

        if (error) throw error

        if (isMounted && data) {
          setSavedPropertyIds(new Set(data.map((item) => item.property_id)))
        }
      } catch (err) {
        logSafeEvent({
          module: 'properties',
          action: 'load_saved_properties',
          level: 'error',
          code: sanitizeErrorReason(err),
        })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadSavedProperties()

    return () => {
      isMounted = false
    }
  }, [sessionUid])

  const toggleSave = useCallback(async (propertyId: string) => {
    if (!sessionUid) {
      openSavePrompt()
      return false
    }

    const wasSaved = savedPropertyIds.has(propertyId)

    setSavedPropertyIds((current) => {
      const next = new Set(current)
      if (wasSaved) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
      }
      return next
    })

    try {
      if (wasSaved) {
        const { error } = await supabase
          .from('saved_properties')
          .delete()
          .eq('user_id', sessionUid)
          .eq('property_id', propertyId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saved_properties')
          .insert({ user_id: sessionUid, property_id: propertyId })

        if (error) throw error
      }

      return true
    } catch (err: unknown) {
      const errorCode = typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code?: unknown }).code
        : undefined
      if (!wasSaved && errorCode === '23505') {
        setSavedPropertyIds((current) => {
          const next = new Set(current)
          next.add(propertyId)
          return next
        })
        return true
      }

      logSafeEvent({
        module: 'properties',
        action: 'toggle_saved_property',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setSavedPropertyIds((current) => {
        const next = new Set(current)
        if (wasSaved) {
          next.add(propertyId)
        } else {
          next.delete(propertyId)
        }
        return next
      })
      return false
    }
  }, [openSavePrompt, savedPropertyIds, sessionUid])

  const isSaved = useCallback((propertyId: string) => {
    return savedPropertyIds.has(propertyId)
  }, [savedPropertyIds])

  const value = useMemo(() => ({
    savedPropertyIds,
    loading,
    toggleSave,
    isSaved,
  }), [isSaved, loading, savedPropertyIds, toggleSave])

  return (
    <SavedPropertiesContext.Provider value={value}>
      {children}
    </SavedPropertiesContext.Provider>
  )
}

// The colocated hook is the public consumer API for this provider module.
// eslint-disable-next-line react-refresh/only-export-components
export function useSavedProperties() {
  const context = useContext(SavedPropertiesContext)

  if (context === undefined) {
    throw new Error('useSavedProperties must be used within a SavedPropertiesProvider')
  }

  return context
}
