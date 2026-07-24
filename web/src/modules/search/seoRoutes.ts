import type { OperationType, PropertyType } from '../properties/types'
import { cubanMunicipalities } from '../../shared/data/cubaLocations'
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
  province: string
  municipality?: string
  operation: OperationType
  propertyType?: PropertyType
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
const municipalityByProvinceSlug = new Map(
  Object.entries(cubanMunicipalities).flatMap(([province, municipalities]) =>
    municipalities.map((municipality) => [
      `${slugifySeo(province)}/${slugifySeo(municipality)}`,
      { province, municipality },
    ]),
  ),
)

function buildSeoCopy(
  operation: OperationType,
  province: string,
  propertyType?: PropertyType,
  municipality?: string,
) {
  const operationText = operationLabel[operation]
  const subject = propertyType ? typePluralLabel[propertyType] : 'propiedades'
  const location = municipality ? `${municipality}, ${province}` : province
  const heading = `${subject[0].toUpperCase()}${subject.slice(1)} en ${operationText} en ${location}`
  const title = `${heading} | Cubitat`
  const description = `Encuentra ${subject} en ${operationText} en ${location} con fotos, precios, ubicacion y contacto directo con anunciantes en Cubitat.`
  const intro = `Explora ${subject} en ${operationText} en ${location}, compara precios por zona y contacta directamente al anunciante desde Cubitat.`

  return { heading, title, description, intro }
}

export function parseSeoResultsRoute(pathname: string): SeoResultsRoute | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 2 && segments.length !== 3) return null

  const [firstSegment, provinceSlug, municipalitySlug] = segments
  const province = provinceBySlug.get(provinceSlug)
  if (!province) return null
  const municipality = municipalitySlug
    ? municipalityByProvinceSlug.get(`${provinceSlug}/${municipalitySlug}`)?.municipality
    : undefined

  if (municipalitySlug && !municipality) return null

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
    query: municipality ? `${municipality}, ${province}` : province,
    operations: [operation],
    propertyType: propertyType ?? 'all',
    zoneId: 'all',
  }
  const copy = buildSeoCopy(operation, province, propertyType, municipality)

  return {
    filters,
    ...copy,
    canonicalPath: pathname,
    province,
    municipality,
    operation,
    propertyType,
  }
}

function operationToSlug(operation: OperationType) {
  return operation === 'alquiler' ? 'renta' : operation
}

function getSeoLocationFromQuery(query: string) {
  const cleanQuery = query.trim()
  const province = SEO_PROVINCES.find((item) => item === cleanQuery)
  if (province) {
    return { province, municipality: undefined }
  }

  const parts = cleanQuery.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length !== 2) return null

  const [municipality, provinceName] = parts
  const matchedProvince = SEO_PROVINCES.find((item) => item === provinceName)
  if (!matchedProvince) return null

  const matchedMunicipality = cubanMunicipalities[matchedProvince]?.find((item) => item === municipality)
  if (!matchedMunicipality) return null

  return { province: matchedProvince, municipality: matchedMunicipality }
}

export function buildSeoResultsPath(filters: SearchFilters): string | null {
  const location = getSeoLocationFromQuery(filters.query)
  if (!location || filters.operations.length > 1) return null

  const operation = filters.operations[0] ?? 'venta'
  const operationSlug = operationToSlug(operation)
  const provinceSlug = slugifySeo(location.province)
  const municipalityPath = location.municipality ? `/${slugifySeo(location.municipality)}` : ''

  if (filters.propertyType !== 'all') {
    return `/${typePluralLabel[filters.propertyType]}-en-${operationSlug}/${provinceSlug}${municipalityPath}`
  }

  return `/${operationSlug}/${provinceSlug}${municipalityPath}`
}

export function buildRelatedSeoRoutes(seoRoute: SeoResultsRoute) {
  const provinceSlug = slugifySeo(seoRoute.province)
  const currentPath = seoRoute.canonicalPath
  const related = [
    {
      label: `Ver todas las ventas en ${seoRoute.province}`,
      path: `/venta/${provinceSlug}`,
    },
    {
      label: `Ver rentas en ${seoRoute.province}`,
      path: `/renta/${provinceSlug}`,
    },
    {
      label: `Ver permutas en ${seoRoute.province}`,
      path: `/permuta/${provinceSlug}`,
    },
    {
      label: `Casas en venta en ${seoRoute.province}`,
      path: `/casas-en-venta/${provinceSlug}`,
    },
    {
      label: `Apartamentos en renta en ${seoRoute.province}`,
      path: `/apartamentos-en-renta/${provinceSlug}`,
    },
    {
      label: `Terrenos en venta en ${seoRoute.province}`,
      path: `/terrenos-en-venta/${provinceSlug}`,
    },
  ]

  return related.filter((route) => route.path !== currentPath).slice(0, 4)
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
