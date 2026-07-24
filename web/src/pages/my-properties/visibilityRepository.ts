import { supabase } from '../../shared/lib/supabaseClient'

async function runOwnerVisibilityRpc(
  name: 'hide_own_property' | 'restore_own_property',
  propertyId: string,
  ownerId: string,
) {
  if (!ownerId) throw new Error('Se requiere una sesión válida.')
  const { error } = await supabase.rpc(name, { p_property_id: propertyId })
  if (error) throw error
}

export function hideOwnProperty(propertyId: string, ownerId: string) {
  return runOwnerVisibilityRpc('hide_own_property', propertyId, ownerId)
}

export function restoreOwnProperty(propertyId: string, ownerId: string) {
  return runOwnerVisibilityRpc('restore_own_property', propertyId, ownerId)
}
