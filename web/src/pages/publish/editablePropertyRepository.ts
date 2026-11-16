import { supabase } from '../../shared/lib/supabaseClient'

const EDITABLE_PROPERTY_SELECT = 'id,title,location,description,zone_id,operation,property_type,price_usd,bedrooms,bathrooms,parking,area_m2,age_years,amenities,badge,status,cover_tone,cover_image,images,coordinates,features,user_id,moderation_message,view_count,created_at,updated_at,property_private_addresses(location),property_private_coordinates(coordinates),property_contact_details(name,phone,email)'

function relationRecord(value: unknown): Record<string, unknown> | null {
  const record = Array.isArray(value) ? value[0] : value
  return record && typeof record === 'object' && !Array.isArray(record)
    ? record as Record<string, unknown>
    : null
}

export function getEditableProperty(propertyId: string, userId: string) {
  return supabase
    .from('properties')
    .select(EDITABLE_PROPERTY_SELECT)
    .eq('id', propertyId)
    .eq('user_id', userId)
    .maybeSingle()
    .then(result => {
      if (!result.data || result.error) return { ...result, data: null }
      const privateAddress = result.data.property_private_addresses
      const address = Array.isArray(privateAddress) ? privateAddress[0] : privateAddress
      const privateCoordinates = result.data.property_private_coordinates
      const coordinates = Array.isArray(privateCoordinates) ? privateCoordinates[0] : privateCoordinates
      const privateContact = relationRecord(result.data.property_contact_details)
      const readContactValue = (key: 'name' | 'phone' | 'email') => {
        const privateValue = privateContact?.[key]
        return typeof privateValue === 'string' ? privateValue : ''
      }
      return {
        ...result,
        data: {
          ...result.data,
          location: address?.location ?? result.data.location,
          coordinates: coordinates?.coordinates ?? result.data.coordinates,
          contact_info: {
            name: readContactValue('name'),
            phone: readContactValue('phone'),
            email: readContactValue('email'),
          },
        },
      }
    })
}
