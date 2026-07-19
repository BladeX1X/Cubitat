function normalizeSearchText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function slugify(value) {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function operationToSlug(operation) {
  if (operation === 'alquiler') return 'renta'
  if (operation === 'venta') return 'venta'
  if (operation === 'permuta') return 'permuta'
  return null
}

function propertyTypeToPluralSlug(type) {
  if (type === 'apartamento') return 'apartamentos'
  if (type === 'casa') return 'casas'
  if (type === 'terreno') return 'terrenos'
  return null
}

function findLocation(propertyLocation, locations) {
  const normalizedLocation = normalizeSearchText(propertyLocation)
  const province = Object.keys(locations)
    .sort((left, right) => right.length - left.length)
    .find((candidate) => normalizedLocation.includes(normalizeSearchText(candidate)))

  if (!province) return null

  const municipality = [...locations[province]]
    .sort((left, right) => right.length - left.length)
    .find((candidate) => normalizedLocation.includes(normalizeSearchText(candidate)))

  return { province, municipality }
}

function addRoute(routes, path, priority, changefreq) {
  if (!routes.has(path)) routes.set(path, { path, priority, changefreq })
}

/** Build only landing pages backed by at least one published property. */
export function buildInventorySeoRoutes(properties, locations) {
  const routes = new Map()

  for (const property of properties) {
    if (!property.location || property.status !== 'published') continue

    const operation = operationToSlug(property.operation)
    const propertyType = propertyTypeToPluralSlug(property.property_type)
    const matchedLocation = findLocation(property.location, locations)
    if (!operation || !propertyType || !matchedLocation) continue

    const provinceSlug = slugify(matchedLocation.province)
    const changefreq = operation === 'permuta' ? 'weekly' : 'daily'
    addRoute(routes, `/${operation}/${provinceSlug}`, operation === 'permuta' ? '0.82' : '0.86', changefreq)
    addRoute(routes, `/${propertyType}-en-${operation}/${provinceSlug}`, propertyType === 'terrenos' ? '0.78' : '0.84', changefreq)

    if (matchedLocation.municipality) {
      addRoute(routes, `/${operation}/${provinceSlug}/${slugify(matchedLocation.municipality)}`, '0.72', changefreq)
    }
  }

  return [...routes.values()]
}
