import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../../../shared/lib/supabaseClient'
import { useAuthModal } from '../../auth/contexts/AuthModalContext'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

type SavedPropertiesContextValue = {
  savedPropertyIds: Set<string>
  sessionReady: boolean
  loading: boolean
  error: string | null
  retryLoad: () => void
  toggleSave: (propertyId: string) => Promise<boolean>
  isSaved: (propertyId: string) => boolean
}

const SavedPropertiesContext = createContext<SavedPropertiesContextValue | undefined>(undefined)
const EMPTY_SAVED_PROPERTY_IDS = new Set<string>()

function hasPendingToggleForUser(pendingKeys: Set<string>, userId: string): boolean {
  const prefix = `${userId}:`
  return [...pendingKeys].some(key => key.startsWith(prefix))
}

export function SavedPropertiesProvider({ children }: { children: ReactNode }) {
  const [savedState, setSavedState] = useState({ ownerId: null as string | null, ids: EMPTY_SAVED_PROPERTY_IDS })
  const [sessionUid, setSessionUid] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionRetryVersion, setSessionRetryVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const sessionUidRef = useRef<string | null>(null)
  const sessionRevision = useRef(0)
  const savedMutationRevision = useRef(0)
  const pendingToggleKeysRef = useRef(new Set<string>())
  const deferredReloadUsersRef = useRef(new Set<string>())
  const { openSavePrompt } = useAuthModal()
  // Derive visibility from the active identity so old favorites cannot flash
  // between the auth event and the next effect's cleanup.
  const savedPropertyIds = savedState.ownerId === sessionUid ? savedState.ids : EMPTY_SAVED_PROPERTY_IDS

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRevision.current += 1
      const nextUid = session?.user?.id ?? null
      sessionUidRef.current = nextUid
      setSessionUid(nextUid)
      setSessionReady(true)
      setError(null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const revisionAtRequest = sessionRevision.current

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted || revisionAtRequest !== sessionRevision.current) return
      const nextUid = session?.user?.id ?? null
      sessionUidRef.current = nextUid
      setSessionUid(nextUid)
      setSessionReady(true)
      setError(null)
    }).catch((err: unknown) => {
      if (!isMounted || revisionAtRequest !== sessionRevision.current) return
      setError('No se pudo comprobar tu sesión. Comprueba la conexión e inténtalo de nuevo.')
      setLoading(false)
      logSafeEvent({
        module: 'properties',
        action: 'load_saved_properties_session',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
    })

    return () => {
      isMounted = false
    }
  }, [sessionRetryVersion])

  useEffect(() => {
    let isMounted = true
    const mutationRevisionAtRequest = savedMutationRevision.current

    async function loadSavedProperties() {
      if (!sessionReady) return
      setLoading(true)
      // Never expose a previous account's favorites while the next session loads.
      setSavedState(current => current.ownerId === sessionUid
        ? current
        : { ownerId: sessionUid, ids: new Set() })
      setError(null)

      if (!sessionUid) {
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
          const hasPendingMutation = hasPendingToggleForUser(pendingToggleKeysRef.current, sessionUid)
          if (mutationRevisionAtRequest !== savedMutationRevision.current || hasPendingMutation) {
            // A toggle may have completed after this older snapshot was read.
            // A read can also finish before an in-flight write reaches the DB.
            // Let the final mutation request the next authoritative snapshot.
            if (hasPendingMutation) {
              deferredReloadUsersRef.current.add(sessionUid)
            } else {
              setReloadVersion(version => version + 1)
            }
            return
          }
          setSavedState({
            ownerId: sessionUid,
            ids: new Set(data.map((item) => item.property_id)),
          })
        }
      } catch (err) {
        if (isMounted) {
          const hasPendingMutation = hasPendingToggleForUser(pendingToggleKeysRef.current, sessionUid)
          if (mutationRevisionAtRequest !== savedMutationRevision.current || hasPendingMutation) {
            if (hasPendingMutation) {
              deferredReloadUsersRef.current.add(sessionUid)
            } else {
              setReloadVersion(version => version + 1)
            }
            return
          }
          setError('No se pudieron cargar tus favoritos. Comprueba la conexión e inténtalo de nuevo.')
        }
        logSafeEvent({
          module: 'properties',
          action: 'load_saved_properties',
          level: 'error',
          code: sanitizeErrorReason(err),
        })
      } finally {
        if (isMounted && mutationRevisionAtRequest === savedMutationRevision.current && !hasPendingToggleForUser(pendingToggleKeysRef.current, sessionUid)) {
          setLoading(false)
        }
      }
    }

    loadSavedProperties()

    return () => {
      isMounted = false
    }
  }, [reloadVersion, sessionReady, sessionUid])

  const retryLoad = useCallback(() => {
    setError(null)
    setLoading(true)
    setReloadVersion((version) => version + 1)
    setSessionRetryVersion((version) => version + 1)
  }, [])

  const toggleSave = useCallback(async (propertyId: string) => {
    if (!sessionUid) {
      openSavePrompt()
      return false
    }

    const pendingKey = `${sessionUid}:${propertyId}`
    // The first request already applied the optimistic UI state. Treat a
    // repeated click as handled so the shared button does not report an error.
    if (pendingToggleKeysRef.current.has(pendingKey)) return true
    pendingToggleKeysRef.current.add(pendingKey)
    savedMutationRevision.current += 1

    const wasSaved = savedPropertyIds.has(propertyId)

    setSavedState((current) => {
      const next = new Set(current.ownerId === sessionUid ? current.ids : [])
      if (wasSaved) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
      }
      return { ownerId: sessionUid, ids: next }
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
      // An old account's pending request must not restore stale optimistic
      // state over favorites loaded for a newly authenticated account.
      // The old request no longer represents an action in the active account.
      // Treat it as handled so its originating button does not show a false
      // failure alert after the user has switched accounts.
      if (sessionUidRef.current !== sessionUid) return true
      const errorCode = typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code?: unknown }).code
        : undefined
      if (!wasSaved && errorCode === '23505') {
        setSavedState((current) => {
          const next = new Set(current.ownerId === sessionUid ? current.ids : [])
          next.add(propertyId)
          return { ownerId: sessionUid, ids: next }
        })
        return true
      }

      logSafeEvent({
        module: 'properties',
        action: 'toggle_saved_property',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setSavedState((current) => {
        const next = new Set(current.ownerId === sessionUid ? current.ids : [])
        if (wasSaved) {
          next.add(propertyId)
        } else {
          next.delete(propertyId)
        }
        return { ownerId: sessionUid, ids: next }
      })
      return false
    } finally {
      pendingToggleKeysRef.current.delete(pendingKey)
      savedMutationRevision.current += 1
      if (sessionUidRef.current === sessionUid
        && !hasPendingToggleForUser(pendingToggleKeysRef.current, sessionUid)
        && deferredReloadUsersRef.current.delete(sessionUid)) {
        setLoading(true)
        setError(null)
        setReloadVersion(version => version + 1)
      }
    }
  }, [openSavePrompt, savedPropertyIds, sessionUid])

  const isSaved = useCallback((propertyId: string) => {
    return savedPropertyIds.has(propertyId)
  }, [savedPropertyIds])

  const value = useMemo(() => ({
    savedPropertyIds,
    sessionReady,
    loading,
    error,
    retryLoad,
    toggleSave,
    isSaved,
  }), [error, isSaved, loading, retryLoad, savedPropertyIds, sessionReady, toggleSave])

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
