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
        console.error('Error loading saved properties:', err)
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
    } catch (err) {
      if (!wasSaved && (err as any)?.code === '23505') {
        setSavedPropertyIds((current) => {
          const next = new Set(current)
          next.add(propertyId)
          return next
        })
        return true
      }

      console.error('Error toggling saved property:', err)
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

export function useSavedProperties() {
  const context = useContext(SavedPropertiesContext)

  if (context === undefined) {
    throw new Error('useSavedProperties must be used within a SavedPropertiesProvider')
  }

  return context
}
