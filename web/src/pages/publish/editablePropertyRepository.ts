import { supabase } from '../../shared/lib/supabaseClient'

export function getEditableProperty(propertyId: string, userId: string) {
  return supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .eq('user_id', userId)
    .maybeSingle()
}
