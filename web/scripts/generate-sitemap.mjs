import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createSitemapClient } from './sitemap-client.mjs'
import { buildSitemapDocument } from './sitemap-document.mjs'
import { buildInventorySeoRoutes } from './sitemap-routes.mjs'
import { resolveSitemapMode, shouldWriteSourceSitemap } from './sitemap-mode.mjs'

const isPhase2Dev = process.argv.includes('--phase2-dev')
const requestedSitemapMode = process.argv.includes('--require-dynamic')
  ? 'dynamic'
  : process.env.SITEMAP_MODE === 'static' || process.argv.includes('--static')
    ? 'static'
    : undefined
const SITE_URL = isPhase2Dev
  ? 'https://cubitat1-phase2-dev.pochiprats18.workers.dev'
  : 'https://cubitathome.com'

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/resultados', priority: '0.9', changefreq: 'daily' },
]

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

function readMunicipalityDirectory() {
  try {
    const source = readFileSync(resolve('src/shared/data/cubaLocations.ts'), 'utf8')
    const blocks = [...source.matchAll(/^  (?:'([^']+)'|([^:]+)):\s*\[([\s\S]*?)^  \],/gm)]

    return Object.fromEntries(blocks.map((match) => {
      const province = (match[1] || match[2] || '').trim()
      const municipalities = [...match[3].matchAll(/'([^']+)'/g)].map((item) => item[1])
      return [province, municipalities]
    }))
  } catch {
    return {}
  }
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

async function readPublishedProperties(mode) {
  if (mode === 'static') {
    return []
  }

  const env = readEnv()
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY

  const supabase = createSitemapClient(supabaseUrl, supabaseAnonKey, SITE_URL)
  const { data, error } = await supabase
    .from('properties')
    .select('id, location, operation, property_type, status, updated_at')
    .eq('status', 'published')

  if (error) throw error
  return data ?? []
}

function buildPropertyRoutes(properties) {
  return properties.flatMap((property) => {
    if (!property.id || !property.location || !property.operation || !property.property_type) return []

    const typeSlug = propertyTypeToSlug(property.property_type)
    const operationSlug = operationToSlug(property.operation)
    const locationSlug = slugify(property.location) || 'cuba'

    return [{
      path: `/propiedad/${typeSlug}-en-${operationSlug}-en-${locationSlug}-${property.id}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: property.updated_at,
    }]
  })
}

const env = readEnv()
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
const sitemapMode = resolveSitemapMode({
  requestedMode: requestedSitemapMode,
  supabaseUrl,
  supabaseAnonKey,
})
const publishedProperties = await readPublishedProperties(sitemapMode)
const routes = [
  ...staticRoutes,
  ...buildInventorySeoRoutes(publishedProperties, readMunicipalityDirectory()),
  ...buildPropertyRoutes(publishedProperties),
]

const sitemap = buildSitemapDocument(routes, SITE_URL)

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

if (shouldWriteSourceSitemap({ mode: sitemapMode, phase2Dev: isPhase2Dev })) {
  writeFileSync(resolve('public/sitemap.xml'), sitemap)
  writeFileSync(resolve('public/robots.txt'), robots)
}

if (existsSync(resolve('dist'))) {
  writeFileSync(resolve('dist/sitemap.xml'), sitemap)
  writeFileSync(resolve('dist/robots.txt'), robots)
}

if (sitemapMode === 'static' && !requestedSitemapMode) {
  console.warn('[sitemap] Supabase public configuration absent; generated a static-only sitemap fallback.')
}
console.log(`Generated ${routes.length} sitemap URLs for ${SITE_URL} (${sitemapMode})`)
