export type ProvinceMapFeatureLike = {
  properties?: Record<string, unknown> | null
  geometry?: { type?: string; coordinates?: unknown }
}

export type ProvinceMapTarget =
  | { kind: 'cluster'; clusterId: number; center: [number, number] }
  | { kind: 'province'; province: string }

/** Resolves clicks on either the marker circle or its overlaid number label. */
export function resolveProvinceMapTarget(features: ProvinceMapFeatureLike[]): ProvinceMapTarget | null {
  for (const feature of features) {
    const clusterId = feature.properties?.cluster_id
    const coordinates = feature.geometry?.coordinates
    if (
      typeof clusterId === 'number' && Number.isFinite(clusterId) &&
      feature.geometry?.type === 'Point' && Array.isArray(coordinates) &&
      typeof coordinates[0] === 'number' && Number.isFinite(coordinates[0]) &&
      typeof coordinates[1] === 'number' && Number.isFinite(coordinates[1])
    ) {
      return { kind: 'cluster', clusterId, center: [coordinates[0], coordinates[1]] }
    }
  }

  for (const feature of features) {
    const province = feature.properties?.province
    if (typeof province === 'string' && province.trim()) return { kind: 'province', province }
  }

  return null
}
