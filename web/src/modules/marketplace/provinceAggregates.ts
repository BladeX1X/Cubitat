export type ProvinceCount = { province: string; count: number }

export type ProvinceRow = { province: string }

export function aggregateProvinceCounts(rows: ProvinceRow[]): ProvinceCount[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const province = row.province.trim()
    if (province) counts.set(province, (counts.get(province) ?? 0) + 1)
  }
  return [...counts].map(([province, count]) => ({ province, count }))
    .sort((left, right) => left.province.localeCompare(right.province, 'es'))
}

export const PROVINCE_MAP_CENTERS: Record<string, [number, number]> = {
  'Pinar del Río': [-83.7, 22.4], Artemisa: [-82.8, 22.8], 'La Habana': [-82.36, 23.1],
  Mayabeque: [-81.9, 22.9], Matanzas: [-81.6, 22.5], Cienfuegos: [-80.4, 22.1],
  'Villa Clara': [-79.9, 22.4], 'Sancti Spíritus': [-79.4, 21.9], 'Ciego de Ávila': [-78.8, 21.8],
  Camagüey: [-77.9, 21.4], 'Las Tunas': [-76.9, 21.1], Holguín: [-76.2, 20.9],
  Granma: [-76.8, 20.3], 'Santiago de Cuba': [-75.8, 20], Guantánamo: [-75.2, 20.1],
  'Isla de la Juventud': [-82.8, 21.7],
}
