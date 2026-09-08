type AmenitySelectionKey =
  | 'hasCistern'
  | 'hasStreetGas'
  | 'has220v'
  | 'hasAc'
  | 'isFurnished'
  | 'hasLandline'
  | 'hasTerrace'
  | 'hasPatio'
  | 'hasPool'
  | 'hasPortal'

export type AmenitySelections = Record<AmenitySelectionKey, boolean>

const AMENITY_LABELS: ReadonlyArray<readonly [AmenitySelectionKey, string]> = [
  ['hasCistern', 'Cisterna'],
  ['hasStreetGas', 'Gas de la calle'],
  ['has220v', 'Corriente 220V'],
  ['hasAc', 'Climatizada'],
  ['isFurnished', 'Amueblada'],
  ['hasLandline', 'Teléfono fijo'],
  ['hasTerrace', 'Terraza'],
  ['hasPatio', 'Patio'],
  ['hasPool', 'Piscina'],
  ['hasPortal', 'Portal'],
]

export function getAmenitySelections(
  features: Record<string, unknown>,
  amenities: string[],
): AmenitySelections {
  return Object.fromEntries(
    AMENITY_LABELS.map(([key, label]) => [
      key,
      typeof features[key] === 'boolean' ? features[key] : amenities.includes(label),
    ]),
  ) as AmenitySelections
}

export function buildAmenities(
  existingAmenities: string[],
  selections: AmenitySelections,
): string[] {
  const editableLabels = new Set(AMENITY_LABELS.map(([, label]) => label))
  const preservedAmenities = existingAmenities.filter((amenity) => !editableLabels.has(amenity))
  const selectedAmenities = AMENITY_LABELS
    .filter(([key]) => selections[key])
    .map(([, label]) => label)

  return [...preservedAmenities, ...selectedAmenities]
}
