export function orderPropertiesByIds<T extends { id: string }>(
  properties: readonly T[],
  propertyIds: readonly string[],
): T[] {
  const propertiesById = new Map(properties.map((property) => [property.id, property]))
  const orderedProperties: T[] = []

  for (const propertyId of propertyIds) {
    const property = propertiesById.get(propertyId)
    if (!property) continue

    orderedProperties.push(property)
    propertiesById.delete(propertyId)
  }

  return orderedProperties
}
