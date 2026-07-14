import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../core/errors'
import { fetchAdvertiserContext } from './advertiserContextRepository'
import type { AdvertiserContext } from './types'

export function useAdvertiserContext(userId: string) {
  const [context, setContext] = useState<AdvertiserContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setContext(await fetchAdvertiserContext(userId))
    } catch (reason) {
      console.error('Error loading advertiser context:', reason)
      setContext(null)
      setError(getErrorMessage(reason, 'No se pudo cargar el contexto del anunciante.'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  return { context, loading, error, load }
}
