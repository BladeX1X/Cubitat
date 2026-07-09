import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://cubitathome.com'
const TODAY = new Date().toISOString().slice(0, 10)

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/resultados', priority: '0.9', changefreq: 'daily' },
  { path: '/resultados?operacion=venta', priority: '0.8', changefreq: 'daily' },
  { path: '/resultados?operacion=alquiler', priority: '0.8', changefreq: 'daily' },
  { path: '/resultados?operacion=permuta', priority: '0.7', changefreq: 'weekly' },
  { path: '/resultados?tipo=casa', priority: '0.8', changefreq: 'daily' },
  { path: '/resultados?tipo=apartamento', priority: '0.8', changefreq: 'daily' },
  { path: '/resultados?tipo=terreno', priority: '0.7', changefreq: 'weekly' },
]

const seoProvinces = [
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
]

const seoOperations = [
  { slug: 'venta', priority: '0.86', changefreq: 'daily' },
  { slug: 'renta', priority: '0.86', changefreq: 'daily' },
  { slug: 'permuta', priority: '0.82', changefreq: 'weekly' },
]

const seoPropertyTypes = [
  { slug: 'casas', priority: '0.84', changefreq: 'daily' },
  { slug: 'apartamentos', priority: '0.84', changefreq: 'daily' },
  { slug: 'terrenos', priority: '0.78', changefreq: 'weekly' },
]

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function propertyTypeToSlug(type) {
  if (type === 'apartamento') return 'apartamento'
  if (type === 'casa') return 'casa'
  return 'terreno'
}

function operationToSlug(operation) {
  if (operation === 'alquiler') return 'renta'
  if (operation === 'venta') return 'venta'
  return 'permuta'
}

function buildSeoLandingRoutes() {
  return seoProvinces.flatMap((province) => {
    const provinceSlug = slugify(province)
    const operationRoutes = seoOperations.map((operation) => ({
      path: `/${operation.slug}/${provinceSlug}`,
      priority: operation.priority,
      changefreq: operation.changefreq,
    }))

    const typedRoutes = seoOperations.flatMap((operation) =>
      seoPropertyTypes.map((propertyType) => ({
        path: `/${propertyType.slug}-en-${operation.slug}/${provinceSlug}`,
        priority: propertyType.priority,
        changefreq: propertyType.changefreq,
      })),
    )

    return [...operationRoutes, ...typedRoutes]
  })
}

function readEnv() {
  try {
    const env = readFileSync(resolve('.env'), 'utf8')
    return Object.fromEntries(
      env
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const [key, ...valueParts] = line.split('=')
          return [key, valueParts.join('=')]
        }),
    )
  } catch {
    return {}
  }
}

async function readPublishedProperties() {
  const env = readEnv()
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY for sitemap generation.')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase
    .from('properties')
    .select('id, location, operation, property_type, status')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).flatMap((property) => {
    if (!property.id || !property.location || !property.operation || !property.property_type) {
      return []
    }

    const typeSlug = propertyTypeToSlug(property.property_type)
    const operationSlug = operationToSlug(property.operation)
    const locationSlug = slugify(property.location || 'cuba') || 'cuba'

    return [{
      path: `/propiedad/${typeSlug}-en-${operationSlug}-en-${locationSlug}-${property.id}`,
      priority: '0.8',
      changefreq: 'weekly',
    }]
  })
}

const routes = [...staticRoutes, ...buildSeoLandingRoutes(), ...await readPublishedProperties()]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(({ path, priority, changefreq }) => `  <url>
    <loc>${escapeXml(new URL(path, SITE_URL).toString())}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>
`

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

writeFileSync(resolve('public/sitemap.xml'), sitemap)
writeFileSync(resolve('public/robots.txt'), robots)

if (existsSync(resolve('dist'))) {
  writeFileSync(resolve('dist/sitemap.xml'), sitemap)
  writeFileSync(resolve('dist/robots.txt'), robots)
}

console.log(`Generated ${routes.length} sitemap URLs for ${SITE_URL}`)
