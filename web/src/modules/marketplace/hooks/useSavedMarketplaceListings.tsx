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
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import { useAuthModal } from '../../auth/contexts/AuthModalContext'

export type SavedMarketplaceListingType = 'service' | 'material'

type SavedMarketplaceListingRow = {
  service_provider_id: string | null
  material_listing_id: string | null
}

type SavedMarketplaceIds = {
  ownerId: string | null
  serviceIds: Set<string>
  materialIds: Set<string>
}

type SavedMarketplaceListingsContextValue = {
  savedServiceIds: Set<string>
  savedMaterialIds: Set<string>
  loading: boolean
  error: string | null
  retryLoad: () => void
  isSaved: (listingType: SavedMarketplaceListingType, listingId: string) => boolean
  isPending: (listingType: SavedMarketplaceListingType, listingId: string) => boolean
  toggleSave: (listingType: SavedMarketplaceListingType, listingId: string) => Promise<boolean>
}

const SavedMarketplaceListingsContext = createContext<SavedMarketplaceListingsContextValue | undefined>(undefined)
const EMPTY_IDS: Set<string> = new Set()

function emptyState(ownerId: string | null): SavedMarketplaceIds {
  return { ownerId, serviceIds: new Set(), materialIds: new Set() }
}

function listingKey(userId: string, listingType: SavedMarketplaceListingType, listingId: string) {
  return `${userId}:${listingType}:${listingId}`
}

function hasPendingToggleForUser(pendingKeys: Set<string>, userId: string): boolean {
  const prefix = `${userId}:`
  return [...pendingKeys].some(key => key.startsWith(prefix))
}

export function SavedMarketplaceListingsProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [savedState, setSavedState] = useState<SavedMarketplaceIds>(() => emptyState(null))
  const [sessionUid, setSessionUid] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(!enabled)
  const [sessionRetryVersion, setSessionRetryVersion] = useState(0)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const sessionUidRef = useRef<string | null>(null)
  const sessionRevision = useRef(0)
  const savedMutationRevision = useRef(0)
  const pendingToggleKeysRef = useRef(new Set<string>())
  const deferredReloadUsersRef = useRef(new Set<string>())
  const { openSavePrompt } = useAuthModal()

  // Do not expose one account's favorites while Auth is switching identities.
  const savedServiceIds = savedState.ownerId === sessionUid ? savedState.serviceIds : EMPTY_IDS
  const savedMaterialIds = savedState.ownerId === sessionUid ? savedState.materialIds : EMPTY_IDS

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRevision.current += 1
      const nextUid = session?.user?.id ?? null
      sessionUidRef.current = nextUid
      setSessionUid(nextUid)
      setSessionReady(true)
      setError(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!enabled) return
    let active = true
    const revisionAtRequest = sessionRevision.current

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active || revisionAtRequest !== sessionRevision.current) return
      const nextUid = session?.user?.id ?? null
      sessionUidRef.current = nextUid
      setSessionUid(nextUid)
      setSessionReady(true)
      setError(null)
    }).catch((cause: unknown) => {
      if (!active || revisionAtRequest !== sessionRevision.current) return
      sessionUidRef.current = null
      setSessionUid(null)
      setSessionReady(false)
      setError('No se pudo comprobar tu sesión. Comprueba la conexión e inténtalo de nuevo.')
      setLoading(false)
      logSafeEvent({ module: 'account', action: 'load_saved_listings_session', level: 'error', code: sanitizeErrorReason(cause) })
    })

    return () => { active = false }
  }, [enabled, sessionRetryVersion])

  useEffect(() => {
    let active = true
    const mutationRevisionAtRequest = savedMutationRevision.current

    async function loadSavedListings() {
      if (!enabled) {
        setSavedState(emptyState(null))
        setError(null)
        setSessionReady(true)
        setLoading(false)
        return
      }
      if (!sessionReady) {
        setLoading(true)
        return
      }

      setLoading(true)
      setError(null)
      setSavedState(current => current.ownerId === sessionUid ? current : emptyState(sessionUid))
      if (!sessionUid) {
        setSavedState(emptyState(null))
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('saved_marketplace_listings')
          .select('service_provider_id, material_listing_id')
          .eq('user_id', sessionUid)
        if (error) throw error

        if (!active || !data) return
        const hasPendingMutation = hasPendingToggleForUser(pendingToggleKeysRef.current, sessionUid)
        if (mutationRevisionAtRequest !== savedMutationRevision.current || hasPendingMutation) {
          if (hasPendingMutation) deferredReloadUsersRef.current.add(sessionUid)
          else setReloadVersion(version => version + 1)
          return
        }

        const rows = (Array.isArray(data) ? data : []) as SavedMarketplaceListingRow[]
        setSavedState({
          ownerId: sessionUid,
          serviceIds: new Set(rows.flatMap(row => row.service_provider_id ? [row.service_provider_id] : [])),
          materialIds: new Set(rows.flatMap(row => row.material_listing_id ? [row.material_listing_id] : [])),
        })
      } catch (cause: unknown) {
        if (!active) return
        const hasPendingMutation = hasPendingToggleForUser(pendingToggleKeysRef.current, sessionUid)
        if (mutationRevisionAtRequest !== savedMutationRevision.current || hasPendingMutation) {
          if (hasPendingMutation) deferredReloadUsersRef.current.add(sessionUid)
          else setReloadVersion(version => version + 1)
          return
        }
        setError('No se pudieron cargar tus favoritos de Servicios y Materiales. Comprueba la conexión e inténtalo de nuevo.')
        logSafeEvent({ module: 'account', action: 'load_saved_listings', level: 'error', code: sanitizeErrorReason(cause) })
      } finally {
        if (active && mutationRevisionAtRequest === savedMutationRevision.current
          && !hasPendingToggleForUser(pendingToggleKeysRef.current, sessionUid)) {
          setLoading(false)
        }
      }
    }

    void loadSavedListings()
    return () => { active = false }
  }, [enabled, reloadVersion, sessionReady, sessionUid])

  const retryLoad = useCallback(() => {
    setError(null)
    setLoading(true)
    setReloadVersion(version => version + 1)
    setSessionRetryVersion(version => version + 1)
  }, [])

  const isSaved = useCallback((listingType: SavedMarketplaceListingType, listingId: string) => (
    (listingType === 'service' ? savedServiceIds : savedMaterialIds).has(listingId)
  ), [savedMaterialIds, savedServiceIds])

  const isPending = useCallback((listingType: SavedMarketplaceListingType, listingId: string) => (
    sessionUid ? pendingKeys.has(listingKey(sessionUid, listingType, listingId)) : false
  ), [pendingKeys, sessionUid])

  const toggleSave = useCallback(async (listingType: SavedMarketplaceListingType, listingId: string) => {
    if (!sessionUid) {
      openSavePrompt()
      return true
    }

    const userId = sessionUid
    const key = listingKey(userId, listingType, listingId)
    if (pendingToggleKeysRef.current.has(key)) return true
    pendingToggleKeysRef.current.add(key)
    savedMutationRevision.current += 1

    const wasSaved = (listingType === 'service' ? savedServiceIds : savedMaterialIds).has(listingId)
    setPendingKeys(current => new Set(current).add(key))
    setSavedState(current => {
      const nextServiceIds = new Set(current.ownerId === userId ? current.serviceIds : [])
      const nextMaterialIds = new Set(current.ownerId === userId ? current.materialIds : [])
      const targetIds = listingType === 'service' ? nextServiceIds : nextMaterialIds
      if (wasSaved) targetIds.delete(listingId)
      else targetIds.add(listingId)
      return { ownerId: userId, serviceIds: nextServiceIds, materialIds: nextMaterialIds }
    })

    try {
      const targetColumn = listingType === 'service' ? 'service_provider_id' : 'material_listing_id'
      if (wasSaved) {
        const { error } = await supabase
          .from('saved_marketplace_listings')
          .delete()
          .eq('user_id', userId)
          .eq(targetColumn, listingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('saved_marketplace_listings').insert({
          user_id: userId,
          service_provider_id: listingType === 'service' ? listingId : null,
          material_listing_id: listingType === 'material' ? listingId : null,
        })
        if (error) throw error
      }
      return true
    } catch (cause: unknown) {
      if (sessionUidRef.current !== userId) return true
      const code = typeof cause === 'object' && cause !== null && 'code' in cause
        ? (cause as { code?: unknown }).code
        : undefined
      if (!wasSaved && code === '23505') {
        setSavedState(current => {
          const serviceIds = new Set(current.ownerId === userId ? current.serviceIds : [])
          const materialIds = new Set(current.ownerId === userId ? current.materialIds : [])
          ;(listingType === 'service' ? serviceIds : materialIds).add(listingId)
          return { ownerId: userId, serviceIds, materialIds }
        })
        return true
      }

      logSafeEvent({ module: 'account', action: 'toggle_saved_listing', level: 'error', code: sanitizeErrorReason(cause) })
      setSavedState(current => {
        const serviceIds = new Set(current.ownerId === userId ? current.serviceIds : [])
        const materialIds = new Set(current.ownerId === userId ? current.materialIds : [])
        const targetIds = listingType === 'service' ? serviceIds : materialIds
        if (wasSaved) targetIds.add(listingId)
        else targetIds.delete(listingId)
        return { ownerId: userId, serviceIds, materialIds }
      })
      return false
    } finally {
      pendingToggleKeysRef.current.delete(key)
      savedMutationRevision.current += 1
      setPendingKeys(current => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
      if (sessionUidRef.current === userId
        && !hasPendingToggleForUser(pendingToggleKeysRef.current, userId)
        && deferredReloadUsersRef.current.delete(userId)) {
        setLoading(true)
        setError(null)
        setReloadVersion(version => version + 1)
      }
    }
  }, [openSavePrompt, savedMaterialIds, savedServiceIds, sessionUid])

  const value = useMemo(() => ({
    savedServiceIds,
    savedMaterialIds,
    loading,
    error,
    retryLoad,
    isSaved,
    isPending,
    toggleSave,
  }), [error, isPending, isSaved, loading, retryLoad, savedMaterialIds, savedServiceIds, toggleSave])

  return <SavedMarketplaceListingsContext.Provider value={value}>{children}</SavedMarketplaceListingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSavedMarketplaceListings() {
  const context = useContext(SavedMarketplaceListingsContext)
  if (!context) throw new Error('useSavedMarketplaceListings must be used within a SavedMarketplaceListingsProvider')
  return context
}
