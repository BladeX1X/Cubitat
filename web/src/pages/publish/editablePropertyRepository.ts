import { supabase } from '../../shared/lib/supabaseClient'

export function getEditableProperty(propertyId: string, userId: string) {
  return supabase
    .from('properties')
    .select('*,property_private_addresses(location),property_private_coordinates(coordinates)')
    .eq('id', propertyId)
    .eq('user_id', userId)
    .maybeSingle()
    .then(result => {
      if (!result.data || result.error) return result
      const privateAddress = result.data.property_private_addresses
      const address = Array.isArray(privateAddress) ? privateAddress[0] : privateAddress
      const privateCoordinates = result.data.property_private_coordinates
      const coordinates = Array.isArray(privateCoordinates) ? privateCoordinates[0] : privateCoordinates
      return {
        ...result,
        data: {
          ...result.data,
          location: address?.location ?? result.data.location,
          coordinates: coordinates?.coordinates ?? result.data.coordinates,
        },
      }
    })
}
