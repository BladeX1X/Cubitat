import { useState, useEffect } from 'react'
import { supabase } from '../../../shared/lib/supabaseClient'
import { useAuthModal } from '../../auth/contexts/AuthModalContext'

export function useSavedProperties() {
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { openSavePrompt } = useAuthModal()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadSavedProperties() {
      if (!userId) {
        setSavedPropertyIds(new Set())
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('saved_properties')
          .select('property_id')
          .eq('user_id', userId)

        if (error) throw error

        if (data) {
          setSavedPropertyIds(new Set(data.map(d => d.property_id)))
        }
      } catch (err) {
        console.error('Error loading saved properties:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSavedProperties()
  }, [userId])

  const toggleSave = async (propertyId: string) => {
    if (!userId) {
      openSavePrompt()
      return false // Indicates that the action didn't complete because user wasn't logged in
    }

    const isSaved = savedPropertyIds.has(propertyId)

    // Optimistic UI update
    setSavedPropertyIds(prev => {
      const next = new Set(prev)
      if (isSaved) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
      }
      return next
    })

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_properties')
          .delete()
          .eq('user_id', userId)
          .eq('property_id', propertyId)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saved_properties')
          .insert({ user_id: userId, property_id: propertyId })
        
        if (error) throw error
      }
      return true
    } catch (err) {
      console.error('Error toggling saved property:', err)
      // Revert optimistic update on failure
      setSavedPropertyIds(prev => {
        const next = new Set(prev)
        if (isSaved) {
          next.add(propertyId)
        } else {
          next.delete(propertyId)
        }
        return next
      })
      return false
    }
  }

  const isSaved = (propertyId: string) => savedPropertyIds.has(propertyId)

  return {
    savedPropertyIds,
    loading,
    toggleSave,
    isSaved
  }
}
