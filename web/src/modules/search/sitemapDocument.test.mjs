import { describe, expect, it } from 'vitest'
import { buildSitemapDocument } from '../../../scripts/sitemap-document.mjs'

const routes = [
  { path: '/venta/la-habana', priority: '0.86', changefreq: 'daily', lastmod: '2026-08-03T18:20:00.000Z' },
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/propiedad/casa-2', priority: '0.8', changefreq: 'weekly', lastmod: '2026-08-01T01:00:00.000Z' },
]

describe('buildSitemapDocument', () => {
  it('is deterministic when the same routes arrive in a different order', () => {
    const forward = buildSitemapDocument(routes, 'https://cubitathome.com')
    const reversed = buildSitemapDocument([...routes].reverse(), 'https://cubitathome.com')

    expect(reversed).toBe(forward)
    expect(forward.indexOf('https://cubitathome.com/</loc>')).toBeLessThan(
      forward.indexOf('https://cubitathome.com/propiedad/casa-2</loc>'),
    )
  })

  it('uses real update dates and omits lastmod when none is known', () => {
    const document = buildSitemapDocument(routes, 'https://cubitathome.com')

    expect(document).toContain('<lastmod>2026-08-03</lastmod>')
    expect(document).toContain('<lastmod>2026-08-01</lastmod>')
    expect(document.match(/<lastmod>/g)).toHaveLength(2)
    expect(document).not.toContain(new Date().toISOString().slice(0, 10))
  })
})
