import type { OperationType, PropertyType } from '../properties/types'
import type { SearchFilters } from './types'

export const SEO_PROVINCES = [
  'Pinar del Río',
  'Artemisa',
  'La Habana',
  'Mayabeque',
  'Matanzas',
  'Cienfuegos',
  'Villa Clara',
  'Sancti Spíritus',
  'Ciego de Ávila',
  'Camagüey',
  'Las Tunas',
  'Holguín',
  'Granma',
  'Santiago de Cuba',
  'Guantánamo',
  'Isla de la Juventud',
] as const

export type SeoResultsRoute = {
  filters: SearchFilters
  heading: string
  title: string
  description: string
  intro: string
  canonicalPath: string
}

const operationBySlug: Record<string, OperationType> = {
  venta: 'venta',
  renta: 'alquiler',
  permuta: 'permuta',
}

const operationLabel: Record<OperationType, string> = {
  venta: 'venta',
  alquiler: 'renta',
  permuta: 'permuta',
}

const pluralTypeBySlug: Record<string, PropertyType> = {
  casas: 'casa',
  apartamentos: 'apartamento',
  terrenos: 'terreno',
}

const typePluralLabel: Record<PropertyType, string> = {
  casa: 'casas',
  apartamento: 'apartamentos',
  terreno: 'terrenos',
}

export function slugifySeo(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const provinceBySlug = new Map(SEO_PROVINCES.map((province) => [slugifySeo(province), province]))

function buildSeoCopy(operation: OperationType, province: string, propertyType?: PropertyType) {
  const operationText = operationLabel[operation]
  const subject = propertyType ? typePluralLabel[propertyType] : 'propiedades'
  const heading = `${subject[0].toUpperCase()}${subject.slice(1)} en ${operationText} en ${province}`
  const title = `${heading} | Cubitat`
  const description = `Encuentra ${subject} en ${operationText} en ${province} con fotos, precios, ubicacion y contacto directo con anunciantes en Cubitat.`
  const intro = `Explora ${subject} en ${operationText} en ${province}, compara precios por zona y contacta directamente al anunciante desde Cubitat.`

  return { heading, title, description, intro }
}

export function parseSeoResultsRoute(pathname: string): SeoResultsRoute | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 2) return null

  const [firstSegment, provinceSlug] = segments
  const province = provinceBySlug.get(provinceSlug)
  if (!province) return null

  let operation: OperationType | undefined
  let propertyType: PropertyType | undefined

  if (operationBySlug[firstSegment]) {
    operation = operationBySlug[firstSegment]
  } else {
    const typedMatch = firstSegment.match(/^(casas|apartamentos|terrenos)-en-(venta|renta|permuta)$/)
    if (!typedMatch) return null
    propertyType = pluralTypeBySlug[typedMatch[1]]
    operation = operationBySlug[typedMatch[2]]
  }

  const filters: SearchFilters = {
    query: province,
    operations: [operation],
    propertyType: propertyType ?? 'all',
    zoneId: 'all',
  }
  const copy = buildSeoCopy(operation, province, propertyType)

  return {
    filters,
    ...copy,
    canonicalPath: pathname,
  }
}

export function filtersMatchSeoRoute(filters: SearchFilters, seoRoute: SeoResultsRoute): boolean {
  return (
    filters.query === seoRoute.filters.query &&
    filters.zoneId === seoRoute.filters.zoneId &&
    filters.propertyType === seoRoute.filters.propertyType &&
    filters.operations.length === seoRoute.filters.operations.length &&
    filters.operations.every((operation) => seoRoute.filters.operations.includes(operation))
  )
}
