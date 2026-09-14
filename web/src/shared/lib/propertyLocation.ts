import { cubanMunicipalities, cubanProvinces } from '../data/cubaLocations'

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Only catalogued administrative areas are safe; arbitrary prefixes may contain a home address. */
export function editablePropertyAddress(location: string | null | undefined) {
  const parts = (location || '').split(',').map(part => part.trim())
  const province = cubanProvinces.find(value => normalized(value) === normalized(parts.at(-1) || '')) || ''
  const municipality = province
    ? (cubanMunicipalities[province] || []).find(value => normalized(value) === normalized(parts.at(-2) || '')) || ''
    : ''
  const suffixCount = Number(Boolean(province)) + Number(Boolean(municipality))
  return {
    streetAddress: suffixCount ? parts.slice(0, -suffixCount).join(', ') : (location || ''),
    neighborhood: '',
    municipality,
    province,
  }
}

export function publicPropertyLocation(location: string | null | undefined): string {
  const { municipality, province } = editablePropertyAddress(location)
  return [municipality, province].filter(Boolean).join(', ') || 'Cuba'
}
