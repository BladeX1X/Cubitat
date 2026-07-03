import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

function readFeaturedProperties() {
  const sourcePath = resolve('src/modules/properties/data/featuredProperties.ts')
  const source = readFileSync(sourcePath, 'utf8')
  const blocks = source.match(/\{\s*id:[\s\S]*?\n\s*\}/g) ?? []

  return blocks.flatMap((block) => {
    const id = block.match(/id:\s*'([^']+)'/)?.[1]
    const title = block.match(/title:\s*'([^']+)'/)?.[1]
    const location = block.match(/location:\s*'([^']+)'/)?.[1]
    const operation = block.match(/operation:\s*'([^']+)'/)?.[1]
    const propertyType = block.match(/propertyType:\s*'([^']+)'/)?.[1]
    const status = block.match(/status:\s*'([^']+)'/)?.[1]

    if (!id || !title || !location || !operation || !propertyType || status !== 'published') {
      return []
    }

    const typeSlug = propertyTypeToSlug(propertyType)
    const operationSlug = operationToSlug(operation)
    const locationSlug = slugify(location.split(',')[0] || location)

    return [{
      path: `/propiedad/${typeSlug}-en-${operationSlug}-en-${locationSlug}-${id}`,
      priority: '0.8',
      changefreq: 'weekly',
    }]
  })
}

const routes = [...staticRoutes, ...readFeaturedProperties()]

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

writeFileSync(resolve('public/sitemap.xml'), sitemap)
writeFileSync(
  resolve('public/robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`,
)

console.log(`Generated ${routes.length} sitemap URLs for ${SITE_URL}`)
