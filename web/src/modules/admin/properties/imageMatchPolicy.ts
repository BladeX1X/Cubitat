export type ImageMatchStrength = 'exact-hash' | 'high-similarity' | 'partial-match' | 'out-of-range'

export function getImageMatchStrength(distance: number): ImageMatchStrength {
  if (!Number.isInteger(distance) || distance < 0 || distance > 8) return 'out-of-range'
  if (distance === 0) return 'exact-hash'
  if (distance <= 4) return 'high-similarity'
  return 'partial-match'
}

export function getImageMatchLabel(distance: number): string {
  switch (getImageMatchStrength(distance)) {
    case 'exact-hash': return 'hash idéntico'
    case 'high-similarity': return 'similitud alta'
    case 'partial-match': return 'coincidencia parcial'
    case 'out-of-range': return 'distancia no válida'
  }
}
